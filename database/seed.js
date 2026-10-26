/**
 * RentRoll - PostgreSQL Seed Runner
 * Executes seeds.sql against PostgreSQL if DATABASE_URL is configured.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runSeed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('[Seed] No DATABASE_URL found. Embedded JSON store is already seeded in data/rentroll_db.json.');
    return;
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const seedPath = path.join(__dirname, 'seeds.sql');
    const sql = fs.readFileSync(seedPath, 'utf-8');
    console.log('[Seed] Executing seeds.sql against PostgreSQL database...');
    await pool.query(sql);
    console.log('[Seed] Seed data inserted successfully!');
  } catch (err) {
    console.error('[Seed] Seeding failed:', err.message);
  } finally {
    await pool.end();
  }
}

runSeed();
