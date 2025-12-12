import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { JobClass, jobClasses } from '@/lib/definitions';

export async function POST(request: Request) {
  try {
    const { name, job_class } = await request.json();

    if (!name || !job_class) {
      return NextResponse.json({ error: 'Name and job class are required.' }, { status: 400 });
    }

    if (!jobClasses.includes(job_class as JobClass)) {
        return NextResponse.json({ error: `Invalid job class: ${job_class}.` }, { status: 400 });
    }

    const existingUser = await pool.sql`SELECT id, name, job_class FROM Users WHERE name = ${name};`;

    if (existingUser.rows.length > 0) {
      return NextResponse.json({ 
        message: 'User already registered. Logging in with existing user.', 
        user: existingUser.rows[0] 
      }, { status: 200 });
    }

    const result = await pool.sql`
      INSERT INTO Users (name, job_class)
      VALUES (${name}, ${job_class})
      RETURNING id, name, job_class;
    `;

    return NextResponse.json({ user: result.rows[0] }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/users:', error);
    return NextResponse.json({ error: 'Failed to process user request.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (name) {
      const user = await pool.sql`SELECT id, name, job_class FROM Users WHERE name = ${name};`;
      if (user.rows.length === 0) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
      }
      return NextResponse.json({ user: user.rows[0] });
    }

    const users = await pool.sql`SELECT id, name, job_class FROM Users ORDER BY name;`;
    return NextResponse.json({ users: users.rows });

  } catch (error) {
    console.error('Error in GET /api/users:', error);
    return NextResponse.json({ error: 'Failed to retrieve users.' }, { status: 500 });
  }
}
