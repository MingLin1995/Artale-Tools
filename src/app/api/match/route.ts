import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getWeekBounds } from '@/lib/time-utils';
import { getCombinations, validateTeamComposition, validatePartialTeam } from '@/lib/matchmaking-utils';
import { User, MatchedTeam } from '@/lib/types';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const weekParam = searchParams.get('week') || 'current';

        let offsetWeeks = 0;
        if (weekParam === 'next') {
            offsetWeeks = 1;
        } else if (weekParam !== 'current') {
            return NextResponse.json({ error: 'Invalid week parameter. Use "current" or "next".' }, { status: 400 });
        }

        const { start: weekStart, end: weekEnd } = getWeekBounds(offsetWeeks);
        const weekStartISO = weekStart.toISOString();
        const weekEndISO = weekEnd.toISOString();

        const usersResult = await pool.sql`SELECT id, name, job_class FROM Users;`;
        const allUsers: User[] = usersResult.rows.map(row => ({
            id: row.id,
            name: row.name,
            job_class: row.job_class,
        }));
        const usersMap = new Map<number, User>();
        allUsers.forEach(u => usersMap.set(u.id, u));

        const availabilityResult = await pool.sql`
            SELECT user_id, start_time, end_time
            FROM Availability
            WHERE start_time >= ${weekStartISO}::timestamptz
              AND end_time <= ${weekEndISO}::timestamptz;
        `;

        const availableUsersBySlot = new Map<string, User[]>();
        availabilityResult.rows.forEach(avail => {
            const start = new Date(avail.start_time);
            const end = new Date(avail.end_time);
            for (let d = start; d < end; d.setUTCHours(d.getUTCHours() + 1)) {
                const slotKey = d.toISOString();
                const user = usersMap.get(avail.user_id);
                if (user) {
                    if (!availableUsersBySlot.has(slotKey)) availableUsersBySlot.set(slotKey, []);
                    availableUsersBySlot.get(slotKey)?.push(user);
                }
            }
        });

        const matchesByTimeSlot = new Map<string, User[][]>();

        for (const [slotKey, availablePlayers] of availableUsersBySlot.entries()) {
            let teamsForThisSlot: User[][] = [];

            // 第一層: 嘗試尋找6人隊伍
            if (availablePlayers.length >= 6) {
                const combinationsOf6 = getCombinations(availablePlayers, 6);
                for (const team of combinationsOf6) {
                    if (validateTeamComposition(team)) {
                        teamsForThisSlot.push(team);
                    }
                }
            }

            // 第二層: 如果沒有6人隊伍，則嘗試尋找5人隊伍
            if (teamsForThisSlot.length === 0 && availablePlayers.length >= 5) {
                const combinationsOf5 = getCombinations(availablePlayers, 5);
                for (const team of combinationsOf5) {
                    if (validatePartialTeam(team)) {
                        teamsForThisSlot.push(team);
                    }
                }
            }

            // 第三層: 如果仍沒有隊伍，則嘗試尋找4人隊伍
            if (teamsForThisSlot.length === 0 && availablePlayers.length >= 4) {
                const combinationsOf4 = getCombinations(availablePlayers, 4);
                for (const team of combinationsOf4) {
                    if (validatePartialTeam(team)) {
                        teamsForThisSlot.push(team);
                    }
                }
            }

            // 第四層: 如果仍沒有隊伍，則嘗試尋找3人隊伍
            if (teamsForThisSlot.length === 0 && availablePlayers.length >= 3) {
                const combinationsOf3 = getCombinations(availablePlayers, 3);
                for (const team of combinationsOf3) {
                    if (validatePartialTeam(team)) {
                        teamsForThisSlot.push(team);
                    }
                }
            }

            if (teamsForThisSlot.length > 0) {
                matchesByTimeSlot.set(slotKey, teamsForThisSlot);
            }
        }
        
        const finalMatches: MatchedTeam[] = Array.from(matchesByTimeSlot.entries()).map(([timeSlot, teams]) => ({
            timeSlot,
            teams
        }));
        
        finalMatches.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

        return NextResponse.json({ matches: finalMatches });

    } catch (error) {
        console.error('GET /api/match 發生錯誤:', error);
        return NextResponse.json({ error: 'Failed to find matches.' }, { status: 500 });
    }
}
