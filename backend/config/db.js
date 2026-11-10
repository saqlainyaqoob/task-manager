// Why this file exists: ONE place that creates the PostgreSQL connection pool.
// A pool keeps a few connections open and reuses them, which is faster than
// opening a new connection for every request.

require('dotenv').config();
require('net').setDefaultAutoSelectFamilyAttemptTimeout(5000); // wait up to 5s per address (Node default is 250ms)
const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 })
  : new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

module.exports = pool;