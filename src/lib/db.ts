import { createPool, sql } from '@vercel/postgres';

const pool = createPool({ connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL });

export { pool, sql };
