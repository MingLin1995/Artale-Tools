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

        let maxTeamSizeFound = 0;
        const matchesByTimeSlot = new Map<string, User[][]>();

        // 找出所有可能組合中的最大隊伍人數
        for (const [, availablePlayers] of availableUsersBySlot.entries()) {
            for (let teamSize = 6; teamSize > maxTeamSizeFound; teamSize--) {
                if (availablePlayers.length >= teamSize) {
                    const combinations = getCombinations(availablePlayers, teamSize);
                    const validator = teamSize === 6 ? validateTeamComposition : validatePartialTeam;
                    if (combinations.some(team => validator(team))) {
                        maxTeamSizeFound = teamSize;
                        break;
                    }
                }
            }
            
            if (maxTeamSizeFound === 6) {
                break;
            }
        }

        // 如果有找到任何隊伍，則只收集符合最大隊伍人數的組合
        if (maxTeamSizeFound > 0) {
            for (const [slotKey, availablePlayers] of availableUsersBySlot.entries()) {
                if (availablePlayers.length >= maxTeamSizeFound) {
                    const teamsForThisSlot: User[][] = [];
                    const combinations = getCombinations(availablePlayers, maxTeamSizeFound);
                    const validator = maxTeamSizeFound === 6 ? validateTeamComposition : validatePartialTeam;
                    
                    for (const team of combinations) {
                        if (validator(team)) {
                            teamsForThisSlot.push(team);
                        }
                    }

                    if (teamsForThisSlot.length > 0) {
                        matchesByTimeSlot.set(slotKey, teamsForThisSlot);
                    }
                }
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
