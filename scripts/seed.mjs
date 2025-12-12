import 'dotenv/config';
import { createPool } from '@vercel/postgres';

const pool = createPool({ connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL });

async function createTables() {
  const createUsersTable = await pool.sql`
    CREATE TABLE IF NOT EXISTS Users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      job_class VARCHAR(50) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createAvailabilityTable = await pool.sql`
    CREATE TABLE IF NOT EXISTS Availability (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES Users(id) ON DELETE CASCADE,
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  const createIndex = await pool.sql`
    CREATE INDEX IF NOT EXISTS availability_user_id_idx ON Availability (user_id);
  `;

  return { createUsersTable, createAvailabilityTable };
}

async function main() {
  try {
    await createTables();
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();