import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { promisify } from 'node:util';
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, initializeDatabase, closeDatabase } from './database.js';
import { seedDatabase } from './seed.js';
import {
  normalizeMandiDistrict,
  refreshMandiRates,
  startRateScheduler,
  stopRateScheduler,
} from './scheduler.js';

const app = express();
const api = express.Router();
const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uploadDirectory = path.resolve(process.env.UPLOAD_DIR || path.join(backendDirectory, 'uploads'));
const port = Number(process.env.PORT || 8000);
const apiPrefix = '/api/v1';
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!process.env.SECRET_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('SECRET_KEY must be configured in production.');
}
if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
  throw new Error('DATABASE_URL must be configured in production.');
}
if (
  process.env.NODE_ENV === 'production'
  && process.env.AUTHORITY_ACCESS_CODE
  && process.env.AUTHORITY_ACCESS_CODE.length < 24
) {
  throw new Error('AUTHORITY_ACCESS_CODE must contain at least 24 characters in production.');
}
const jwtSecret = process.env.SECRET_KEY || randomUUID();
if (process.env.NODE_ENV === 'production' && jwtSecret.length < 32) {
  throw new Error('SECRET_KEY must contain at least 32 characters in production.');
}
if (!process.env.SECRET_KEY) {
  console.warn('SECRET_KEY is unset. Local JWTs will not survive a server restart.');
}

fs.mkdirSync(uploadDirectory, { recursive: true });
app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(Object.assign(new Error('Origin is not allowed by CORS.'), { status: 403 }));
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use((request, _response, next) => {
  if (!request.body) request.body = {};
  next();
});

const upload = multer({
  dest: uploadDirectory,
  limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 10, fieldSize: 16 * 1024 },
  fileFilter(_request, file, callback) {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
      return callback(Object.assign(
        new Error('Only JPEG, PNG, WebP, and GIF images are supported.'),
        { status: 400 },
      ));
    }
    return callback(null, true);
  },
});

const complaintStatuses = new Set(['pending', 'forwarded', 'in_progress', 'resolved']);
const scryptAsync = promisify(scrypt);
const PASSWORD_SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const DUMMY_PASSWORD_HASH = `scrypt$16384$8$1$${'0'.repeat(32)}$${'0'.repeat(128)}`;
const authAttemptWindows = new Map();
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 10;
const imageSignatures = {
  'image/jpeg': (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  'image/png': (buffer) => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  'image/gif': (buffer) => ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii')),
  'image/webp': (buffer) => buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP',
};
const imageExtensions = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};
const trimOrNull = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const asBoolean = (value) => value === true || value === 1 || value === '1';

function fail(status, detail) {
  const error = new Error(detail);
  error.status = status;
  throw error;
}

function validateText(value, field, maximum, { required = true } = {}) {
  if (typeof value !== 'string' || (required && !value.trim()) || value.trim().length > maximum) {
    fail(422, `${field} is required and must be at most ${maximum} characters.`);
  }
  return value.trim();
}

function validateOptionalText(value, field, maximum) {
  if (value === undefined || value === null) return null;
  return validateText(value, field, maximum, { required: false }) || null;
}

function validateOptionalNumber(value, field) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) fail(422, `${field} must be a valid number.`);
  if ((field === 'latitude' && (number < -90 || number > 90))
    || (field === 'longitude' && (number < -180 || number > 180))) {
    fail(422, `${field} is outside the valid coordinate range.`);
  }
  return number;
}

function cleanUser(user) {
  if (!user) return null;
  const safeUser = { ...user };
  delete safeUser.password_hash;
  return { ...safeUser, is_authority: asBoolean(user.is_authority) };
}

function signIn(user) {
  const token = jwt.sign(
    { sub: user.id },
    jwtSecret,
    { algorithm: 'HS256', expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRE_SECONDS || 604800) },
  );
  return { is_registered: true, token, user: cleanUser(user) };
}

function hasAuthorityAccess(code) {
  const configuredCode = process.env.AUTHORITY_ACCESS_CODE;
  if (!configuredCode || typeof code !== 'string') return false;
  const expected = Buffer.from(configuredCode);
  const provided = Buffer.from(code);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

function normalizeUsername(value) {
  if (typeof value !== 'string') return null;
  const username = value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(username) ? username : null;
}

function validatePassword(value) {
  if (typeof value !== 'string' || value.length < 10 || value.length > 128) {
    fail(422, 'Password must be between 10 and 128 characters.');
  }
  return value;
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64, PASSWORD_SCRYPT_OPTIONS);
  return `scrypt$16384$8$1$${salt.toString('hex')}$${Buffer.from(hash).toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  const [algorithm, cost, blockSize, parallelization, saltHex, hashHex] = (storedHash || '').split('$');
  const validFormat = algorithm === 'scrypt'
    && cost === '16384'
    && blockSize === '8'
    && parallelization === '1'
    && /^[a-f0-9]{32}$/i.test(saltHex || '')
    && /^[a-f0-9]{128}$/i.test(hashHex || '');
  const candidateHash = validFormat ? storedHash : DUMMY_PASSWORD_HASH;
  const [, , , , candidateSaltHex, candidateHashHex] = candidateHash.split('$');
  const derived = Buffer.from(await scryptAsync(
    password,
    Buffer.from(candidateSaltHex, 'hex'),
    64,
    PASSWORD_SCRYPT_OPTIONS,
  ));
  const expected = Buffer.from(candidateHashHex, 'hex');
  const matches = timingSafeEqual(derived, expected);
  return validFormat && matches;
}

function authRateLimit(request, response, next) {
  const now = Date.now();
  const ip = request.ip || request.socket.remoteAddress || 'unknown';
  const action = request.path.endsWith('/login') ? 'login' : 'register';
  const key = `${ip}:${action}`;
  let attempt = authAttemptWindows.get(key);
  if (!attempt || now - attempt.startedAt >= AUTH_WINDOW_MS) {
    attempt = { startedAt: now, count: 0 };
    authAttemptWindows.set(key, attempt);
  }
  if (attempt.count >= AUTH_MAX_ATTEMPTS) {
    response.set('Retry-After', String(Math.ceil((AUTH_WINDOW_MS - (now - attempt.startedAt)) / 1000)));
    return response.status(429).json({ detail: 'Too many authentication attempts. Try again later.' });
  }
  attempt.count += 1;
  return next();
}

function clearAuthAttempts(request) {
  const ip = request.ip || request.socket.remoteAddress || 'unknown';
  authAttemptWindows.delete(`${ip}:login`);
}

function isUniqueConstraintError(error) {
  return error.code === '23505'
    || error.code === 'SQLITE_CONSTRAINT'
    || /unique constraint/i.test(error.message || '');
}

async function createAccount(request, isAuthority) {
  const username = normalizeUsername(request.body.username);
  if (!username) {
    fail(422, 'Username must be 3–32 characters using letters, numbers, dots, underscores, or hyphens.');
  }
  const password = validatePassword(request.body.password);
  const fullName = validateText(request.body.full_name, 'full_name', 100);
  const city = validateText(request.body.city, 'city', 100);
  const district = validateText(request.body.district, 'district', 100);
  const latitude = validateOptionalNumber(request.body.latitude, 'latitude');
  const longitude = validateOptionalNumber(request.body.longitude, 'longitude');
  const address = validateOptionalText(request.body.address, 'address', 255);
  const user = {
    id: randomUUID(),
    username,
    password_hash: await hashPassword(password),
    full_name: fullName,
    mobile_number: `guest_${randomUUID().replaceAll('-', '').slice(0, 8)}`,
    address,
    city,
    district,
    latitude,
    longitude,
    is_authority: isAuthority,
  };
  await db('users').insert(user);
  return db('users').where({ id: user.id }).first();
}

async function authenticate(request, isAuthority) {
  const username = typeof request.body.username === 'string'
    ? request.body.username.trim().toLowerCase()
    : '';
  const password = typeof request.body.password === 'string' && request.body.password.length <= 128
    ? request.body.password
    : '';
  const user = normalizeUsername(username)
    ? await db('users').where({ username }).first()
    : null;
  const passwordMatches = await verifyPassword(password, user?.password_hash);
  if (!user || !passwordMatches || asBoolean(user.is_authority) !== isAuthority) {
    fail(401, 'Invalid username or password.');
  }
  return user;
}

async function requireUser(request, _response, next) {
  const authorization = request.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return next(Object.assign(new Error('Could not validate credentials'), { status: 401 }));

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
  } catch (error) {
    return next(Object.assign(new Error('Could not validate credentials'), { status: 401 }));
  }
  try {
    const user = await db('users').where({ id: payload.sub }).first();
    if (!user) return next(Object.assign(new Error('Could not validate credentials'), { status: 401 }));
    request.user = cleanUser(user);
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireAuthority(request, _response, next) {
  if (!request.user.is_authority) {
    return next(Object.assign(new Error('The user does not have administrative/authority permissions'), { status: 403 }));
  }
  return next();
}

async function serializePost(post, viewerId) {
  const user = await db('users').where({ id: post.user_id }).first();
  const [like, upvote] = await Promise.all([
    db('likes').where({ post_id: post.id, user_id: viewerId }).first('id'),
    db('upvotes').where({ post_id: post.id, user_id: viewerId }).first('id'),
  ]);
  return {
    ...post,
    user: cleanUser(user),
    is_liked: Boolean(like),
    is_upvoted: Boolean(upvote),
  };
}

async function serializeComment(comment) {
  return {
    ...comment,
    user: cleanUser(await db('users').where({ id: comment.user_id }).first()),
  };
}

function applyLikeSearch(query, column, searchTerm) {
  if (searchTerm) {
    query.whereRaw(`LOWER(${column}) LIKE ?`, [`%${searchTerm.toLowerCase()}%`]);
  }
}

function whereTimestamp(query, column, operator, value) {
  if (db.client.config.client === 'sqlite3') {
    query.whereRaw(
      `strftime('%Y-%m-%d %H:%M:%f', ??) ${operator} strftime('%Y-%m-%d %H:%M:%f', ?)`,
      [column, value],
    );
  } else {
    query.where(column, operator, value);
  }
}

function orderByTimestamp(query, direction) {
  if (db.client.config.client === 'sqlite3') {
    query.orderByRaw(`strftime('%Y-%m-%d %H:%M:%f', created_at) ${direction.toUpperCase()}`);
  } else {
    query.orderBy('created_at', direction);
  }
}

function parseTimestamp(value) {
  const legacyTimestamp = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?$/.exec(value);
  if (legacyTimestamp) {
    const fraction = (legacyTimestamp[3] || '').slice(0, 3).padEnd(3, '0');
    return new Date(`${legacyTimestamp[1]}T${legacyTimestamp[2]}.${fraction}Z`);
  }
  return new Date(value);
}

app.get('/', (_request, response) => {
  response.json({ app: 'MeraShehar API', version: '1.0.0', docs_url: '/health' });
});
app.get('/health', async (_request, response, next) => {
  try {
    await db.raw('SELECT 1');
    response.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});

api.post('/auth/register', authRateLimit, async (request, response, next) => {
  try {
    const user = await createAccount(request, false);
    response.status(201).json(signIn(user));
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return response.status(409).json({ detail: 'That username is already taken.' });
    }
    next(error);
  }
});

api.post('/auth/login', authRateLimit, async (request, response, next) => {
  try {
    const user = await authenticate(request, false);
    clearAuthAttempts(request);
    response.json(signIn(user));
  } catch (error) {
    next(error);
  }
});

api.post('/auth/authority/register', authRateLimit, async (request, response, next) => {
  try {
    const authorityCode = validateText(request.body.authority_code, 'authority_code', 256);
    if (!hasAuthorityAccess(authorityCode)) fail(403, 'Authority access code is invalid.');
    const user = await createAccount(request, true);
    response.status(201).json(signIn(user));
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return response.status(409).json({ detail: 'That username is already taken.' });
    }
    next(error);
  }
});

api.post('/auth/authority/login', authRateLimit, async (request, response, next) => {
  try {
    const authorityCode = validateText(request.body.authority_code, 'authority_code', 256);
    if (!hasAuthorityAccess(authorityCode)) fail(401, 'Invalid username or password.');
    const user = await authenticate(request, true);
    clearAuthAttempts(request);
    response.json(signIn(user));
  } catch (error) {
    next(error);
  }
});

api.post('/auth/send-otp', (_request, response) => {
  response.status(410).json({ detail: 'Phone verification is not configured. Use username and password.' });
});
api.post('/auth/verify-otp', (_request, response) => {
  response.status(410).json({ detail: 'Phone verification is not configured. Use username and password.' });
});
api.get('/auth/me', requireUser, (request, response) => response.json(request.user));
api.patch('/auth/me', requireUser, async (request, response, next) => {
  try {
    const fields = {};
    for (const key of ['full_name', 'address', 'city', 'district']) {
      if (Object.hasOwn(request.body, key)) {
        fields[key] = key === 'address'
          ? validateOptionalText(request.body[key], key, 255)
          : validateText(request.body[key], key, 100);
      }
    }
    for (const key of ['latitude', 'longitude']) {
      if (Object.hasOwn(request.body, key)) fields[key] = validateOptionalNumber(request.body[key], key);
    }
    if (!Object.keys(fields).length) fail(422, 'At least one profile field must be provided.');
    await db('users').where({ id: request.user.id }).update(fields);
    response.json(cleanUser(await db('users').where({ id: request.user.id }).first()));
  } catch (error) {
    next(error);
  }
});

api.get('/feed', requireUser, async (request, response, next) => {
  try {
    const type = request.query.type;
    if (!['news', 'complaint'].includes(type)) fail(422, "type must be 'news' or 'complaint'.");
    const limit = Math.min(Math.max(Number.parseInt(request.query.limit || '10', 10) || 10, 1), 50);
    const sort = request.query.sort === 'trending' ? 'trending' : 'recent';
    const query = db('posts').where({ type, city: request.user.city });
    if (request.query.category) query.where({ category: request.query.category });
    if (request.query.status_filter) query.where({ status: request.query.status_filter });

    if (sort === 'trending') {
      whereTimestamp(query, 'created_at', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      if (request.query.cursor) {
        const match = /^(\d+):(.+)$/.exec(request.query.cursor);
        if (!match) fail(422, 'Invalid trending cursor.');
        query.where((builder) => builder
          .where('upvotes_count', '<', Number(match[1]))
          .orWhere((tie) => tie.where('upvotes_count', Number(match[1])).andWhere('id', '<', match[2])));
      }
      query.orderBy('upvotes_count', 'desc');
      query.orderBy('id', 'desc');
    } else {
      if (request.query.cursor) {
        const [cursorValue, cursorId] = request.query.cursor.split('|');
        const cursorTime = parseTimestamp(cursorValue);
        if (Number.isNaN(cursorTime.getTime())) fail(422, 'Invalid recent cursor.');
        if (cursorId) {
          query.where((builder) => {
            whereTimestamp(builder, 'created_at', '<', cursorTime.toISOString());
            builder.orWhere((tie) => {
              whereTimestamp(tie, 'created_at', '=', cursorTime.toISOString());
              tie.andWhere('id', '<', cursorId);
            });
          });
        } else {
          whereTimestamp(query, 'created_at', '<', cursorTime.toISOString());
        }
      }
      orderByTimestamp(query, 'desc');
      query.orderBy('id', 'desc');
    }

    const page = await query.limit(limit + 1);
    const hasMore = page.length > limit;
    const posts = page.slice(0, limit);
    const lastPost = posts.at(-1);
    const nextCursor = hasMore && lastPost
      ? (sort === 'trending' ? `${lastPost.upvotes_count}:${lastPost.id}` : `${lastPost.created_at}|${lastPost.id}`)
      : null;
    response.json({
      posts: await Promise.all(posts.map((post) => serializePost(post, request.user.id))),
      next_cursor: nextCursor,
    });
  } catch (error) {
    next(error);
  }
});

api.get('/feed/complaints/impact', requireUser, async (request, response, next) => {
  try {
    const complaints = await db('posts')
      .select('id', 'status', 'created_at')
      .where('type', 'complaint')
      .whereRaw('LOWER(TRIM(city)) = ?', [request.user.city.trim().toLowerCase()]);
    const complaintIds = complaints.map((complaint) => complaint.id);
    const upvoteCount = complaintIds.length
      ? await db('upvotes').whereIn('post_id', complaintIds).count({ total: '*' }).first()
      : { total: 0 };

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const history = complaintIds.length
      ? await db('complaint_status_history')
        .select('post_id', 'created_at')
        .whereIn('post_id', complaintIds)
        .where({ status: 'resolved' })
        .orderBy('created_at', 'asc')
      : [];

    const firstResolutionByComplaint = new Map();
    const resolvedThisMonth = new Set();
    for (const entry of history) {
      const changedAt = parseTimestamp(entry.created_at);
      if (Number.isNaN(changedAt.getTime())) continue;
      if (changedAt >= monthStart) resolvedThisMonth.add(entry.post_id);
      if (!firstResolutionByComplaint.has(entry.post_id)) {
        firstResolutionByComplaint.set(entry.post_id, changedAt);
      }
    }

    const resolvedCount = complaints.filter((complaint) => complaint.status === 'resolved').length;
    const resolutionDurations = complaints.flatMap((complaint) => {
      if (complaint.status !== 'resolved') return [];
      const resolvedAt = firstResolutionByComplaint.get(complaint.id);
      if (!resolvedAt) return [];
      const createdAt = parseTimestamp(complaint.created_at);
      const durationHours = (resolvedAt.getTime() - createdAt.getTime()) / (60 * 60 * 1000);
      return Number.isFinite(durationHours) && durationHours >= 0 ? [durationHours] : [];
    });
    response.json({
      city: request.user.city,
      total_complaints: complaints.length,
      resolved_complaints: resolvedCount,
      resolution_rate: complaints.length ? Math.round((resolvedCount / complaints.length) * 1000) / 10 : null,
      resolved_this_month: resolvedThisMonth.size,
      avg_resolution_hours: resolutionDurations.length
        ? Math.round((resolutionDurations.reduce((total, hours) => total + hours, 0) / resolutionDurations.length) * 10) / 10
        : null,
      resolution_sample_size: resolutionDurations.length,
      citizen_upvotes: Number(upvoteCount.total),
    });
  } catch (error) {
    next(error);
  }
});

api.post('/feed', requireUser, upload.single('file'), async (request, response, next) => {
  let savedPath;
  try {
    const type = request.body.type;
    const text = validateText(request.body.text, 'text', 1000);
    const category = validateOptionalText(request.body.category, 'category', 50);
    const latitude = validateOptionalNumber(request.body.latitude, 'latitude');
    const longitude = validateOptionalNumber(request.body.longitude, 'longitude');
    if (!['news', 'complaint'].includes(type)) fail(422, "type must be 'news' or 'complaint'.");
    if (type === 'complaint' && !category) fail(422, 'category is required for complaints.');
    if (type === 'complaint' && !request.file) fail(422, 'Photo attachment is mandatory for complaints.');

    let mediaUrl = null;
    if (request.file) {
      const signature = imageSignatures[request.file.mimetype];
      const fileHandle = await fs.promises.open(request.file.path, 'r');
      const header = Buffer.alloc(12);
      const { bytesRead } = await fileHandle.read(header, 0, header.length, 0);
      await fileHandle.close();
      if (!signature || !signature(header.subarray(0, bytesRead))) {
        fail(400, 'The uploaded file content does not match a supported image type.');
      }
      const filename = `${randomUUID()}${imageExtensions[request.file.mimetype]}`;
      savedPath = path.join(uploadDirectory, filename);
      await fs.promises.rename(request.file.path, savedPath);
      mediaUrl = `${apiPrefix}/feed/media/${filename}`;
    }

    const post = {
      id: randomUUID(),
      user_id: request.user.id,
      type,
      category,
      text,
      media_url: mediaUrl,
      latitude: latitude ?? request.user.latitude,
      longitude: longitude ?? request.user.longitude,
      city: request.user.city,
      district: request.user.district,
      status: type === 'complaint' ? 'pending' : 'resolved',
      upvotes_count: 0,
      likes_count: 0,
      comments_count: 0,
      created_at: new Date().toISOString(),
    };
    await db.transaction(async (trx) => {
      await trx('posts').insert(post);
      if (type === 'complaint') {
        await trx('complaint_status_history').insert({
          id: randomUUID(),
          post_id: post.id,
          user_id: request.user.id,
          status: post.status,
          created_at: post.created_at,
        });
      }
    });
    response.status(201).json({
      ...post,
      user: request.user,
      is_liked: false,
      is_upvoted: false,
    });
  } catch (error) {
    if (request.file?.path) await fs.promises.rm(request.file.path, { force: true });
    if (savedPath) await fs.promises.rm(savedPath, { force: true });
    next(error);
  }
});

api.get('/feed/media/:filename', async (request, response, next) => {
  const filename = path.basename(request.params.filename);
  const mediaPath = path.join(uploadDirectory, filename);
  try {
    await fs.promises.access(mediaPath, fs.constants.R_OK);
    response.sendFile(mediaPath);
  } catch (error) {
    next(Object.assign(new Error('Media not found'), { status: 404 }));
  }
});

for (const [interaction, counter, resultKey] of [
  ['likes', 'likes_count', 'liked'],
  ['upvotes', 'upvotes_count', 'upvoted'],
]) {
  api.post(`/feed/posts/:postId/${interaction === 'likes' ? 'like' : 'upvote'}`, requireUser, async (request, response, next) => {
    try {
      const result = await db.transaction(async (trx) => {
        const post = await trx('posts').where({ id: request.params.postId }).first();
        if (!post) fail(404, 'Post not found.');
        const existing = await trx(interaction)
          .where({ post_id: post.id, user_id: request.user.id })
          .first();
        if (existing) {
          await trx(interaction).where({ id: existing.id }).del();
        } else {
          await trx(interaction).insert({
            id: randomUUID(),
            post_id: post.id,
            user_id: request.user.id,
            created_at: new Date().toISOString(),
          });
        }
        const count = await trx(interaction).where({ post_id: post.id }).count({ total: '*' }).first();
        const total = Number(count.total);
        await trx('posts').where({ id: post.id }).update({ [counter]: total });
        return { [resultKey]: !existing, [counter]: total };
      });
      response.json(result);
    } catch (error) {
      next(error);
    }
  });
}

api.get('/feed/posts/:postId/comments', async (request, response, next) => {
  try {
    const comments = await db('comments').where({ post_id: request.params.postId }).orderBy('created_at', 'asc');
    response.json(await Promise.all(comments.map(serializeComment)));
  } catch (error) {
    next(error);
  }
});

api.post('/feed/posts/:postId/comments', requireUser, async (request, response, next) => {
  try {
    const post = await db('posts').where({ id: request.params.postId }).first();
    if (!post) fail(404, 'Post not found.');
    const comment = {
      id: randomUUID(),
      post_id: post.id,
      user_id: request.user.id,
      text: validateText(request.body.text, 'text', 500),
      created_at: new Date().toISOString(),
    };
    await db.transaction(async (trx) => {
      await trx('comments').insert(comment);
      await trx('posts').where({ id: post.id }).increment('comments_count', 1);
    });
    response.status(201).json({ ...comment, user: request.user });
  } catch (error) {
    next(error);
  }
});

api.patch('/feed/complaints/:postId/status', requireUser, requireAuthority, async (request, response, next) => {
  try {
    const status = request.body.status;
    if (!complaintStatuses.has(status)) fail(422, 'Invalid complaint status.');
    const post = await db('posts')
      .where({ id: request.params.postId, type: 'complaint', city: request.user.city })
      .first();
    if (!post) fail(404, 'Complaint not found.');
    if (post.status !== status) {
      await db.transaction(async (trx) => {
        await trx('posts').where({ id: post.id }).update({ status });
        await trx('complaint_status_history').insert({
          id: randomUUID(),
          post_id: post.id,
          user_id: request.user.id,
          status,
          created_at: new Date().toISOString(),
        });
      });
    }
    response.json(await serializePost({ ...post, status }, request.user.id));
  } catch (error) {
    next(error);
  }
});

api.get('/feed/complaints/routing', requireUser, async (request, response, next) => {
  try {
    response.json(await db('authority_routing_map').where({ city: request.user.city }).orderBy('category'));
  } catch (error) {
    next(error);
  }
});

api.get('/jobs', requireUser, async (request, response, next) => {
  try {
    const query = db('jobs')
      .where({ city: request.user.city, is_active: true })
      .where((builder) => {
        builder.whereNull('expires_at');
        if (db.client.config.client === 'sqlite3') {
          builder.orWhereRaw('datetime(expires_at) > datetime(?)', [new Date().toISOString()]);
        } else {
          builder.orWhere('expires_at', '>', new Date().toISOString());
        }
      });
    if (request.query.category) query.where({ category: request.query.category });
    applyLikeSearch(query, 'location_area', trimOrNull(request.query.location));
    const search = trimOrNull(request.query.search);
    if (search) {
      query.where((builder) => {
        applyLikeSearch(builder, 'title', search);
        builder.orWhereRaw('LOWER(description) LIKE ?', [`%${search.toLowerCase()}%`]);
      });
    }
    const jobs = await query.orderBy('created_at', 'desc');
    response.json(jobs.map((job) => ({ ...job, is_active: asBoolean(job.is_active) })));
  } catch (error) {
    next(error);
  }
});

api.post('/jobs', requireUser, async (request, response, next) => {
  try {
    const job = {
      id: randomUUID(),
      posted_by_user_id: request.user.id,
      title: validateText(request.body.title, 'title', 100),
      description: validateText(request.body.description, 'description', 1000),
      category: validateText(request.body.category, 'category', 50),
      contact_name: validateText(request.body.contact_name, 'contact_name', 100),
      contact_number: validateText(request.body.contact_number, 'contact_number', 15),
      location_area: validateText(request.body.location_area, 'location_area', 100),
      city: request.user.city,
      district: request.user.district,
      salary_range: validateOptionalText(request.body.salary_range, 'salary_range', 50),
      is_active: true,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    await db('jobs').insert(job);
    response.status(201).json(job);
  } catch (error) {
    next(error);
  }
});

api.patch('/jobs/:jobId/deactivate', requireUser, async (request, response, next) => {
  try {
    const job = await db('jobs').where({ id: request.params.jobId }).first();
    if (!job) fail(404, 'Job not found.');
    if (job.posted_by_user_id !== request.user.id && !request.user.is_authority) {
      fail(403, 'You do not have permission to deactivate this job listing.');
    }
    await db('jobs').where({ id: job.id }).update({ is_active: false });
    response.json({ ...job, is_active: false });
  } catch (error) {
    next(error);
  }
});

api.get('/rates', requireUser, async (request, response, next) => {
  try {
    const requestedDistrict = trimOrNull(request.query.district) || request.user.district;
    const district = requestedDistrict.toLowerCase() === 'all'
      ? 'all'
      : normalizeMandiDistrict(requestedDistrict);
    const state = trimOrNull(request.query.state);
    const forceRefresh = request.query.refresh === '1';
    if (process.env.DATA_GOV_API_KEY) {
      await refreshMandiRates({
        district: district === 'all' ? '' : district,
        state,
        force: forceRefresh,
      });
    } else if (forceRefresh) {
      fail(503, 'Government mandi rates are unavailable because DATA_GOV_API_KEY is not configured.');
    }

    const query = db('mandi_prices');
    query.where({ source: 'data.gov.in' });
    if (district.toLowerCase() !== 'all') {
      query.whereRaw('LOWER(TRIM(district)) = ?', [district.toLowerCase()]);
    }
    if (state) query.whereRaw('LOWER(TRIM(state)) = ?', [state.toLowerCase()]);
    applyLikeSearch(query, 'commodity_name', trimOrNull(request.query.commodity));
    applyLikeSearch(query, 'market_name', trimOrNull(request.query.mandi));
    const rates = await query.orderBy([
      { column: 'price_date', order: 'desc' },
      { column: 'commodity_name', order: 'asc' },
    ]);
    if (rates.length === 0 && !process.env.DATA_GOV_API_KEY) {
      fail(503, 'No cached government mandi rates are available. Configure DATA_GOV_API_KEY on the backend.');
    }
    response.json(rates);
  } catch (error) {
    next(error);
  }
});

app.use(apiPrefix, api);
app.use((_request, response) => response.status(404).json({ detail: 'Not found.' }));
app.use((error, _request, response, _next) => {
  if (response.headersSent) return _next(error);
  const status = error.status || (error instanceof multer.MulterError
    ? (error.code === 'LIMIT_FILE_SIZE' ? 413 : 400)
    : 500);
  if (status >= 500) console.error(error);
  response.status(status).json({ detail: status >= 500 ? 'Internal server error.' : error.message });
});

export { app };

let server;
async function start() {
  await initializeDatabase();
  await seedDatabase(uploadDirectory);
  startRateScheduler();
  server = app.listen(port, '0.0.0.0', () => {
    console.info(`MeraShehar API listening on port ${port}`);
  });
}

async function shutdown() {
  stopRateScheduler();
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await closeDatabase();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  start().catch((error) => {
    console.error('Backend startup failed:', error);
    process.exitCode = 1;
  });
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
