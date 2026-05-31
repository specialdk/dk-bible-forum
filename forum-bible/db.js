// db.js
// One shared connection to the Postgres database, plus a function that
// makes sure our two tables exist. Safe to run on every startup.

import pg from 'pg';
const { Pool } = pg;

// Use Railway's internal DATABASE_URL if it's there (private network, no SSL,
// free and fast). Otherwise fall back to the public URL.
const connectionString =
  process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

// The internal address ends in ".railway.internal" and does NOT use SSL.
// The public address goes over the internet and DOES need SSL.
const needsSsl =
  !!connectionString && !connectionString.includes('.railway.internal');

export const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : false
});

export async function ensureTables() {
  // Who can log in.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // The saved studies. Each one belongs to exactly one user.
  // "details" holds the full structured result the app displayed (JSON),
  // so we can re-show it exactly, whether it came from Explain or Respond.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS studies (
      id           SERIAL PRIMARY KEY,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mode         TEXT NOT NULL,
      title        TEXT,
      source_input TEXT,
      details      JSONB NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  console.log('Database tables are ready.');
}
