/**
 * RentRoll - PostgreSQL Migration Runner
 * Executes schema.sql against PostgreSQL if DATABASE_URL is configured.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('[Migration] No DATABASE_URL found. Embedded JSON store is already active.');
    return;
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');
    console.log('[Migration] Applying schema.sql to PostgreSQL database...');
    await pool.query(sql);
    console.log('[Migration] Schema migration completed successfully!');
  } catch (err) {
    console.error('[Migration] Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

runMigration();
