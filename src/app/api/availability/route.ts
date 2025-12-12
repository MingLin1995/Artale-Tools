import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getWeekBounds } from '@/lib/time-utils';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const weekParam = searchParams.get('week') || 'current';

        let offsetWeeks = 0;
        if (weekParam === 'next') {
            offsetWeeks = 1;
        } else if (weekParam !== 'current') {
            return NextResponse.json({ error: 'Invalid week parameter. Use "current" or "next".' }, { status: 400 });
        }

        const { start, end } = getWeekBounds(offsetWeeks);
        const startISO = start.toISOString();
        const endISO = end.toISOString();

        let availabilityQuery;
        if (userId) {
            availabilityQuery = await pool.sql`
                SELECT id, user_id, start_time, end_time
                FROM Availability
                WHERE user_id = ${parseInt(userId)}
                  AND start_time >= ${startISO}::timestamptz
                  AND end_time <= ${endISO}::timestamptz
                ORDER BY start_time;
            `;
        } else {
            availabilityQuery = await pool.sql`
                SELECT a.id, a.user_id, u.name, u.job_class, a.start_time, a.end_time
                FROM Availability a
                JOIN Users u ON a.user_id = u.id
                WHERE a.start_time >= ${startISO}::timestamptz
                  AND a.end_time <= ${endISO}::timestamptz
                ORDER BY a.start_time, u.name;
            `;
        }

        return NextResponse.json({ availability: availabilityQuery.rows });

    } catch (error) {
        console.error('Error in GET /api/availability:', error);
        return NextResponse.json({ error: 'Failed to retrieve availability.' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { userId, weekOffset, slots } = await request.json();

        if (!userId || typeof weekOffset === 'undefined' || !Array.isArray(slots)) {
            return NextResponse.json({ error: 'User ID, week offset, and slots array are required.' }, { status: 400 });
        }

        const userExists = await pool.sql`SELECT id FROM Users WHERE id = ${userId};`;
        if (userExists.rows.length === 0) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        const { start: weekStart, end: weekEnd } = getWeekBounds(weekOffset);
        const weekStartISO = weekStart.toISOString();
        const weekEndISO = weekEnd.toISOString();

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const deleteQuery = `
                DELETE FROM Availability
                WHERE user_id = $1
                  AND start_time >= $2::timestamptz
                  AND end_time <= $3::timestamptz;
            `;
            await client.query(deleteQuery, [userId, weekStartISO, weekEndISO]);

            if (slots.length > 0) {
                const insertQuery = `
                    INSERT INTO Availability (user_id, start_time, end_time)
                    VALUES ($1, $2::timestamptz, $3::timestamptz);
                `;
                for (const slot of slots as { startTime: string, endTime: string }[]) {
                    if (!slot.startTime || !slot.endTime || new Date(slot.startTime) >= new Date(slot.endTime)) {
                        throw new Error(`Invalid slot time range provided: ${slot.startTime} - ${slot.endTime}`);
                    }
                    await client.query(insertQuery, [userId, slot.startTime, slot.endTime]);
                }
            }

            await client.query('COMMIT');
            return NextResponse.json({ message: 'Availability saved successfully.' }, { status: 200 });

        } catch (transactionError) {
            await client.query('ROLLBACK');
            console.error('Transaction failed for PUT /api/availability:', transactionError);
            return NextResponse.json({ error: 'Failed to save availability due to transaction error.' }, { status: 500 });
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error in PUT /api/availability:', error);
        return NextResponse.json({ error: 'Failed to save availability.' }, { status: 500 });
    }
}
