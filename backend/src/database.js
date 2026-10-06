import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import knexFactory from 'knex';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseUrl = process.env.DATABASE_URL;

function createKnex() {
  if (databaseUrl?.startsWith('postgres://') || databaseUrl?.startsWith('postgresql://')) {
    return knexFactory({
      client: 'pg',
      connection: databaseUrl,
      pool: { min: 0, max: Number(process.env.DB_POOL_MAX || 10) },
    });
  }

  const filename = databaseUrl
    ? databaseUrl.replace(/^sqlite:(\/\/\/)?/, '')
    : path.join(backendDirectory, 'mera_shehar.db');
  return knexFactory({
    client: 'sqlite3',
    connection: { filename: path.isAbsolute(filename) ? filename : path.resolve(process.cwd(), filename) },
    useNullAsDefault: true,
  });
}

export const db = createKnex();

const tables = {
  users: (table) => {
    table.string('id', 36).primary();
    table.string('full_name', 100).notNullable();
    table.string('username', 32).unique();
    table.string('password_hash', 255);
    table.string('mobile_number', 15).unique();
    table.string('address', 255);
    table.string('city', 100).notNullable();
    table.string('district', 100).notNullable();
    table.float('latitude');
    table.float('longitude');
    table.boolean('is_authority').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
    table.index(['city']);
  },
  posts: (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 36).notNullable().references('users.id').onDelete('CASCADE');
    table.string('type', 20).notNullable();
    table.string('category', 50);
    table.string('text', 1000).notNullable();
    table.string('media_url', 255);
    table.float('latitude');
    table.float('longitude');
    table.string('city', 100).notNullable();
    table.string('district', 100).notNullable();
    table.string('status', 20).notNullable().defaultTo('pending');
    table.integer('upvotes_count').notNullable().defaultTo(0);
    table.integer('likes_count').notNullable().defaultTo(0);
    table.integer('comments_count').notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
    table.index(['city', 'type', 'created_at']);
  },
  complaint_status_history: (table) => {
    table.string('id', 36).primary();
    table.string('post_id', 36).notNullable().references('posts.id').onDelete('CASCADE');
    table.string('user_id', 36).notNullable().references('users.id').onDelete('CASCADE');
    table.string('status', 20).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
    table.index(['post_id', 'status', 'created_at']);
  },
  likes: (table) => {
    table.string('id', 36).primary();
    table.string('post_id', 36).notNullable().references('posts.id').onDelete('CASCADE');
    table.string('user_id', 36).notNullable().references('users.id').onDelete('CASCADE');
    table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
    table.unique(['post_id', 'user_id']);
  },
  upvotes: (table) => {
    table.string('id', 36).primary();
    table.string('post_id', 36).notNullable().references('posts.id').onDelete('CASCADE');
    table.string('user_id', 36).notNullable().references('users.id').onDelete('CASCADE');
    table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
    table.unique(['post_id', 'user_id']);
  },
  comments: (table) => {
    table.string('id', 36).primary();
    table.string('post_id', 36).notNullable().references('posts.id').onDelete('CASCADE');
    table.string('user_id', 36).notNullable().references('users.id').onDelete('CASCADE');
    table.string('text', 500).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
    table.index(['post_id', 'created_at']);
  },
  jobs: (table) => {
    table.string('id', 36).primary();
    table.string('posted_by_user_id', 36).notNullable().references('users.id').onDelete('CASCADE');
    table.string('title', 100).notNullable();
    table.string('description', 1000).notNullable();
    table.string('category', 50).notNullable();
    table.string('contact_name', 100).notNullable();
    table.string('contact_number', 15).notNullable();
    table.string('location_area', 100).notNullable();
    table.string('city', 100).notNullable();
    table.string('district', 100).notNullable();
    table.string('salary_range', 50);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
    table.timestamp('expires_at');
    table.index(['city', 'is_active', 'created_at']);
  },
  mandi_prices: (table) => {
    table.string('id', 36).primary();
    table.string('source', 32).notNullable().defaultTo('legacy');
    table.string('commodity_name', 100).notNullable();
    table.string('market_name', 100).notNullable();
    table.string('district', 100).notNullable();
    table.string('state', 100).notNullable();
    table.float('min_price').notNullable();
    table.float('max_price').notNullable();
    table.float('modal_price').notNullable();
    table.date('price_date').notNullable();
    table.timestamp('fetched_at').notNullable().defaultTo(db.fn.now());
    table.index(['district', 'price_date']);
  },
  authority_routing_map: (table) => {
    table.string('id', 36).primary();
    table.string('category', 50).notNullable();
    table.string('city', 100).notNullable();
    table.string('authority_name', 100).notNullable();
    table.string('authority_contact', 100);
    table.index(['city', 'category']);
  },
};

export async function initializeDatabase() {
  for (const [name, defineTable] of Object.entries(tables)) {
    if (!(await db.schema.hasTable(name))) {
      await db.schema.createTable(name, defineTable);
    }
  }

  if (!(await db.schema.hasColumn('users', 'username'))) {
    await db.schema.alterTable('users', (table) => {
      table.string('username', 32);
    });
    await db.schema.alterTable('users', (table) => {
      table.unique(['username'], 'users_username_unique');
    });
  }
  if (!(await db.schema.hasColumn('users', 'password_hash'))) {
    await db.schema.alterTable('users', (table) => {
      table.string('password_hash', 255);
    });
  }
  if (!(await db.schema.hasColumn('mandi_prices', 'source'))) {
    await db.schema.alterTable('mandi_prices', (table) => {
      table.string('source', 32).notNullable().defaultTo('legacy');
    });
  }
}

export async function closeDatabase() {
  await db.destroy();
}
