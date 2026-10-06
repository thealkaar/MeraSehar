import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { before, after } from 'node:test';

const testDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'merasehar-api-'));
process.env.DATABASE_URL = `sqlite:${path.join(testDirectory, 'test.db')}`;
process.env.SECRET_KEY = 'test-secret-key-that-is-not-used-outside-this-test';
process.env.AUTHORITY_ACCESS_CODE = 'test-authority-access-code';
process.env.DATA_GOV_API_KEY = 'test-data-gov-api-key';
process.env.UPLOAD_DIR = path.join(testDirectory, 'uploads');

const { db, initializeDatabase, closeDatabase } = await import('../src/database.js');
const { seedDatabase } = await import('../src/seed.js');
const { app } = await import('../src/server.js');

let server;
let apiUrl;
let token;

before(async () => {
  await initializeDatabase();
  await seedDatabase(process.env.UPLOAD_DIR);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  apiUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
  const entry = await fetch(`${apiUrl}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: 'test-citizen',
      password: 'test-citizen-password',
      full_name: 'Test Citizen',
      city: 'Lucknow',
      district: 'Lucknow',
    }),
  });
  assert.equal(entry.status, 201);
  token = (await entry.json()).token;
});

after(async () => {
  if (server) {
    server.close();
    await once(server, 'close');
  }
  await closeDatabase();
  await fs.rm(testDirectory, { recursive: true, force: true });
});

async function authorized(pathname, options = {}) {
  const headers = new Headers(options.headers);
  headers.set('authorization', `Bearer ${token}`);
  return fetch(`${apiUrl}${pathname}`, { ...options, headers });
}

async function withMockedMandiApi(records, callback) {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (input, options) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.startsWith('https://api.data.gov.in/')) {
      requests.push(new URL(url));
      return new Response(JSON.stringify({ total: records.length, records }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return originalFetch(input, options);
  };
  try {
    return await callback(requests);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test('auth returns a user and rejects missing bearer credentials', async () => {
  const profile = await authorized('/auth/me');
  assert.equal(profile.status, 200);
  const profileData = await profile.json();
  assert.equal(profileData.full_name, 'Test Citizen');
  assert.equal(profileData.username, 'test-citizen');
  assert.equal(Object.hasOwn(profileData, 'password_hash'), false);
  const denied = await fetch(`${apiUrl}/auth/me`);
  assert.equal(denied.status, 401);

  const login = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'TEST-CITIZEN', password: 'test-citizen-password' }),
  });
  assert.equal(login.status, 200);
  assert.equal((await login.json()).user.is_authority, false);

  const wrongPassword = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'test-citizen', password: 'wrong-password' }),
  });
  assert.equal(wrongPassword.status, 401);

  const legacyNameOnlyEntry = await fetch(`${apiUrl}/auth/entry`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ full_name: 'Admin Officer', city: 'Lucknow', district: 'Lucknow' }),
  });
  assert.equal(legacyNameOnlyEntry.status, 404);
});

test('registration validates passwords and rejects duplicate usernames', async () => {
  const invalidPassword = await fetch(`${apiUrl}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: 'short-password',
      password: 'short',
      full_name: 'Short Password',
      city: 'Lucknow',
      district: 'Lucknow',
    }),
  });
  assert.equal(invalidPassword.status, 422);

  const duplicate = await fetch(`${apiUrl}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: 'TEST-CITIZEN',
      password: 'another-test-password',
      full_name: 'Duplicate Citizen',
      city: 'Lucknow',
      district: 'Lucknow',
    }),
  });
  assert.equal(duplicate.status, 409);

  const savedUser = await db('users').where({ username: 'test-citizen' }).first();
  assert.match(savedUser.password_hash, /^scrypt\$16384\$8\$1\$/);
  assert.notEqual(savedUser.password_hash, 'test-citizen-password');
});

test('feed supports stable pagination and toggled likes', async () => {
  const feed = await authorized('/feed?type=news&limit=1');
  assert.equal(feed.status, 200);
  const page = await feed.json();
  assert.equal(page.posts.length, 1);
  assert.ok(page.next_cursor);

  const next = await authorized(`/feed?type=news&limit=1&cursor=${encodeURIComponent(page.next_cursor)}`);
  const nextPage = await next.json();
  assert.equal(nextPage.posts.length, 1);
  assert.equal(nextPage.posts[0].id, 'p-news-2');

  const firstToggle = await authorized('/feed/posts/p-news-1/like', { method: 'POST' });
  assert.deepEqual(await firstToggle.json(), { liked: true, likes_count: 2 });
  const secondToggle = await authorized('/feed/posts/p-news-1/like', { method: 'POST' });
  assert.deepEqual(await secondToggle.json(), { liked: false, likes_count: 1 });
});

test('comment, job, and mandi endpoints preserve their response contracts', async () => {
  const comment = await authorized('/feed/posts/p-news-1/comments', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'Thanks for the update.' }),
  });
  assert.equal(comment.status, 201);
  assert.equal((await comment.json()).user.full_name, 'Test Citizen');

  const jobs = await authorized('/jobs');
  assert.equal(jobs.status, 200);
  assert.ok((await jobs.json()).length > 0);

  const rates = await withMockedMandiApi([{
    commodity: 'Potato',
    market: 'Lucknow Mandi',
    district: 'Lucknow',
    state: 'Uttar Pradesh',
    min_price: '1000',
    max_price: '2000',
    modal_price: '1500',
    arrival_date: '07/10/2026',
  }], async (requests) => {
    const response = await authorized('/rates');
    assert.equal(requests[0].searchParams.get('filters[district]'), 'Lucknow');
    assert.equal(requests[0].searchParams.get('filters[state]'), 'Uttar Pradesh');
    return response;
  });
  assert.equal(rates.status, 200);
  assert.equal((await rates.json())[0].source, 'data.gov.in');
});

test('mandi rates are strictly scoped to the selected district', async () => {
  const providerRecords = [
    {
      Commodity: 'Potato',
      Market: 'Bhopal Mandi',
      District: 'Bhopal',
      State: 'Madhya Pradesh',
      Min_Price: '1000',
      Max_Price: '1500',
      Modal_Price: '1250',
      Arrival_Date: '07/10/2026',
    },
    {
      commodity: 'Potato',
      market: 'Indore Mandi',
      district: 'Indore',
      state: 'Madhya Pradesh',
      min_price: '900',
      max_price: '1400',
      modal_price: '1150',
      arrival_date: '2026-10-07',
    },
  ];
  await withMockedMandiApi(providerRecords, async (requests) => {
    const bhopalResponse = await authorized(
      '/rates?district=Bhopal%20District&state=Madhya%20Pradesh&refresh=1',
    );
    assert.equal(bhopalResponse.status, 200);
    const bhopalRates = await bhopalResponse.json();
    assert.equal(bhopalRates.length, 1);
    assert.equal(bhopalRates[0].district, 'Bhopal');
    assert.equal(bhopalRates[0].source, 'data.gov.in');
    assert.equal(bhopalRates[0].price_date, '2026-10-07');
    assert.equal(bhopalRates[0].modal_price, 1250);

    const request = requests[0];
    assert.equal(request.pathname, '/resource/9ef84268-d588-465a-a308-a864a43d0070');
    assert.equal(request.searchParams.get('filters[state]'), 'Madhya Pradesh');
    assert.equal(request.searchParams.get('filters[district]'), 'Bhopal');
    assert.equal(request.searchParams.get('api-key'), 'test-data-gov-api-key');

    const unknownDistrictResponse = await authorized(
      '/rates?district=No%20Matching%20District&refresh=1',
    );
    assert.deepEqual(await unknownDistrictResponse.json(), []);

    const allIndiaResponse = await authorized('/rates?district=all');
    const allIndiaRates = await allIndiaResponse.json();
    assert.equal(allIndiaRates.length, 3);
    assert.deepEqual(
      new Set(allIndiaRates.map((rate) => rate.district)),
      new Set(['Lucknow', 'Bhopal', 'Indore']),
    );
  });
});

test('job creation is scoped to the current user and can be deactivated', async () => {
  const created = await authorized('/jobs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'Test role',
      description: 'A job created by the integration test.',
      category: 'Office Staff',
      contact_name: 'Test Employer',
      contact_number: '9876500000',
      location_area: 'Hazratganj',
    }),
  });
  assert.equal(created.status, 201);
  const job = await created.json();
  assert.equal(job.city, 'Lucknow');
  assert.equal(job.is_active, true);

  const deactivated = await authorized(`/jobs/${job.id}/deactivate`, { method: 'PATCH' });
  assert.equal((await deactivated.json()).is_active, false);
});

test('complaints require an image, authority routes reject citizens, and unknown routes return JSON', async () => {
  const form = new FormData();
  form.set('type', 'complaint');
  form.set('text', 'Missing photo should be rejected.');
  form.set('category', 'Streetlight Fault');
  const complaint = await authorized('/feed', { method: 'POST', body: form });
  assert.equal(complaint.status, 422);

  const status = await authorized('/feed/complaints/p-comp-1/status', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'resolved' }),
  });
  assert.equal(status.status, 403);

  const missing = await fetch(`${apiUrl}/does-not-exist`);
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).detail, 'Not found.');
});

test('complaint image uploads are content-checked and served from the media route', async () => {
  const seededFeed = await authorized('/feed?type=complaint&limit=10');
  const seededPost = (await seededFeed.json()).posts.find((post) => post.id === 'p-comp-1');
  const seededImage = await fetch(`http://127.0.0.1:${server.address().port}${seededPost.media_url}`);
  assert.equal(seededImage.status, 200);

  const invalidForm = new FormData();
  invalidForm.set('type', 'complaint');
  invalidForm.set('text', 'This file only claims to be a PNG.');
  invalidForm.set('category', 'Streetlight Fault');
  invalidForm.set('file', new Blob(['not a PNG'], { type: 'image/png' }), 'fake.png');
  const rejected = await authorized('/feed', { method: 'POST', body: invalidForm });
  assert.equal(rejected.status, 400);

  const form = new FormData();
  form.set('type', 'complaint');
  form.set('text', 'A test complaint with a valid PNG signature.');
  form.set('category', 'Streetlight Fault');
  form.set('file', new Blob([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]),
  ], { type: 'image/png' }), 'test.png');
  const created = await authorized('/feed', { method: 'POST', body: form });
  assert.equal(created.status, 201);
  const post = await created.json();
  const media = await fetch(`http://127.0.0.1:${server.address().port}${post.media_url}`);
  assert.equal(media.status, 200);
  assert.match(media.headers.get('content-type'), /image\/png/);
});

test('civic impact metrics use real city complaints, votes, and recorded resolution history', async () => {
  const citizenEntry = await fetch(`${apiUrl}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: 'pune-citizen',
      password: 'pune-citizen-password',
      full_name: 'Pune Citizen',
      city: 'Pune',
      district: 'Pune',
    }),
  });
  const citizen = await citizenEntry.json();
  const citizenHeaders = { authorization: `Bearer ${citizen.token}` };

  const form = new FormData();
  form.set('type', 'complaint');
  form.set('text', 'A real Pune complaint for civic metrics.');
  form.set('category', 'Road Damage');
  form.set('file', new Blob([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]),
  ], { type: 'image/png' }), 'pune.png');
  const complaintResponse = await fetch(`${apiUrl}/feed`, {
    method: 'POST',
    headers: citizenHeaders,
    body: form,
  });
  assert.equal(complaintResponse.status, 201);
  const complaint = await complaintResponse.json();

  const initialResponse = await fetch(`${apiUrl}/feed/complaints/impact`, { headers: citizenHeaders });
  const initial = await initialResponse.json();
  assert.equal(initial.city, 'Pune');
  assert.equal(initial.total_complaints, 1);
  assert.equal(initial.resolved_complaints, 0);
  assert.equal(initial.resolution_rate, 0);
  assert.equal(initial.resolved_this_month, 0);
  assert.equal(initial.avg_resolution_hours, null);
  assert.equal(initial.citizen_upvotes, 0);

  const upvoteResponse = await fetch(`${apiUrl}/feed/posts/${complaint.id}/upvote`, {
    method: 'POST',
    headers: citizenHeaders,
  });
  assert.equal(upvoteResponse.status, 200);

  const authorityEntry = await fetch(`${apiUrl}/auth/authority/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: 'pune-authority',
      password: 'pune-authority-password',
      full_name: 'Pune Authority',
      city: 'Pune',
      district: 'Pune',
      authority_code: process.env.AUTHORITY_ACCESS_CODE,
    }),
  });
  const authority = await authorityEntry.json();
  const resolvedResponse = await fetch(`${apiUrl}/feed/complaints/${complaint.id}/status`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${authority.token}`,
    },
    body: JSON.stringify({ status: 'resolved' }),
  });
  assert.equal(resolvedResponse.status, 200);

  const updatedResponse = await fetch(`${apiUrl}/feed/complaints/impact`, { headers: citizenHeaders });
  const updated = await updatedResponse.json();
  assert.equal(updated.total_complaints, 1);
  assert.equal(updated.resolved_complaints, 1);
  assert.equal(updated.resolution_rate, 100);
  assert.equal(updated.resolved_this_month, 1);
  assert.equal(updated.resolution_sample_size, 1);
  assert.ok(updated.avg_resolution_hours >= 0);
  assert.equal(updated.citizen_upvotes, 1);

  const lucknowResponse = await authorized('/feed/complaints/impact');
  const lucknow = await lucknowResponse.json();
  assert.equal(lucknow.city, 'Lucknow');
  assert.equal(lucknow.total_complaints, 4);
});

test('authority accounts require the configured code and separate authority login', async () => {
  const rejected = await fetch(`${apiUrl}/auth/entry`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Wrong Code Authority',
      city: 'Lucknow',
      district: 'Lucknow',
      authority_code: 'incorrect-code',
    }),
  });
  assert.equal(rejected.status, 404);

  const rejectedRegistration = await fetch(`${apiUrl}/auth/authority/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: 'wrong-code-authority',
      password: 'authority-password',
      full_name: 'Test Authority',
      city: 'Lucknow',
      district: 'Lucknow',
      authority_code: 'incorrect-code',
    }),
  });
  assert.equal(rejectedRegistration.status, 403);

  const entry = await fetch(`${apiUrl}/auth/authority/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: 'test-authority',
      password: 'authority-password',
      full_name: 'Test Authority',
      city: 'Lucknow',
      district: 'Lucknow',
      authority_code: process.env.AUTHORITY_ACCESS_CODE,
    }),
  });
  assert.equal(entry.status, 201);
  const result = await entry.json();
  assert.equal(result.user.is_authority, true);
  assert.equal(Object.hasOwn(result.user, 'password_hash'), false);

  const citizenOnAdminEndpoint = await fetch(`${apiUrl}/auth/authority/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: 'test-citizen',
      password: 'test-citizen-password',
      authority_code: process.env.AUTHORITY_ACCESS_CODE,
    }),
  });
  assert.equal(citizenOnAdminEndpoint.status, 401);

  const adminLogin = await fetch(`${apiUrl}/auth/authority/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: 'test-authority',
      password: 'authority-password',
      authority_code: process.env.AUTHORITY_ACCESS_CODE,
    }),
  });
  assert.equal(adminLogin.status, 200);
  assert.equal((await adminLogin.json()).user.is_authority, true);

  const status = await fetch(`${apiUrl}/feed/complaints/p-comp-1/status`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${result.token}`,
    },
    body: JSON.stringify({ status: 'in_progress' }),
  });
  assert.equal(status.status, 200);
  assert.equal((await status.json()).status, 'in_progress');
});

test('authentication endpoints limit repeated failed attempts', async () => {
  const validLogin = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'test-citizen', password: 'test-citizen-password' }),
  });
  assert.equal(validLogin.status, 200);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const rejected = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'unknown-user', password: 'incorrect-password' }),
    });
    assert.equal(rejected.status, 401);
  }

  const limited = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'unknown-user', password: 'incorrect-password' }),
  });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
});
