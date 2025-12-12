import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getWeekBounds } from '@/lib/time-utils';

export async function GET(request: Request) {
    try {
        const { start: currentWeekStart } = getWeekBounds(0);
        const cutoffTimeISO = currentWeekStart.toISOString();

        const result = await pool.sql`
            DELETE FROM Availability
            WHERE end_time < ${cutoffTimeISO}::timestamptz
            RETURNING id;
        `;

        console.log(`Cleaned up ${result.rows.length} old availability records ending before ${cutoffTimeISO}`);
        return NextResponse.json({
            message: `Cleaned up ${result.rows.length} old availability records.`,
            cutoffTime: cutoffTimeISO,
            deletedIds: result.rows.map(row => row.id)
        });

    } catch (error) {
        console.error('Error in /api/cleanup:', error);
        return NextResponse.json({ error: 'Failed to clean up old data.' }, { status: 500 });
    }
}
