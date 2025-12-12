import { roleDefinitions } from './definitions';
import { User } from '@/lib/types';

export function getCombinations<T>(arr: T[], k: number): T[][] {
    const result: T[][] = [];
    const f = (prefix: T[], arr: T[], k: number) => {
        if (k === 0) {
            result.push(prefix);
            return;
        }
        if (arr.length === 0) {
            return;
        }
        const head = arr[0];
        const tail = arr.slice(1);
        f(prefix.concat(head), tail, k - 1);
        f(prefix, tail, k);
    };
    f([], arr, k);
    return result;
}

interface PreciseRoleCounts {
    dk: number;
    priest: number;
    firePoison: number;
    iceLightning: number;
    ballClear: number;
    otherDps: number;
}

function countPreciseRoles(team: User[]): PreciseRoleCounts {
    const counts: PreciseRoleCounts = {
        dk: 0,
        priest: 0,
        firePoison: 0,
        iceLightning: 0,
        ballClear: 0,
        otherDps: 0,
    };

    for (const user of team) {
        const job = user.job_class;
        if (roleDefinitions.dragonKnight.includes(job)) {
            counts.dk++;
        } else if (roleDefinitions.priest.includes(job)) {
            counts.priest++;
        } else if (job === '火毒') {
            counts.firePoison++;
        } else if (job === '冰雷') {
            counts.iceLightning++;
        } else if (roleDefinitions.ballClearSupport.includes(job)) {
            counts.ballClear++;
        } else {
            counts.otherDps++;
        }
    }
    return counts;
}

export function validateTeamComposition(team: User[]): boolean {
    if (team.length !== 6) return false;

    const counts = countPreciseRoles(team);

    const numMages = counts.firePoison + counts.iceLightning;
    const hasDualMage = counts.firePoison >= 1 && counts.iceLightning >= 1;

    // Rule 1: 龍騎(1) + 雙法(2) + 3輸出
    if (counts.dk === 1 && hasDualMage && numMages === 2 && counts.priest === 0) {
        if (counts.dk + numMages + counts.ballClear + counts.otherDps === 6) return true;
    }

    // Rule 2: 龍騎(1) + 單法(1) + 4輸出 (最好能有輔助清球的職業)
    if (counts.dk === 1 && numMages === 1 && counts.priest === 0) {
        if (counts.dk + numMages + counts.ballClear + counts.otherDps === 6) return true;
    }

    // Rule 3: 雙法(2) + 4輸出
    if (hasDualMage && numMages === 2 && counts.dk === 0 && counts.priest === 0) {
        if (numMages + counts.ballClear + counts.otherDps === 6) return true;
    }

    // Rule 4: 單法(1) + 5輸出 (最好能有輔助清球的職業)
    if (numMages === 1 && counts.dk === 0 && counts.priest === 0) {
        if (numMages + counts.ballClear + counts.otherDps === 6) return true;
    }

    // Rule 5: 祭司(1) + 單法(1) + 4輸出 (最好能有輔助清球的職業)
    if (counts.priest === 1 && numMages === 1 && counts.dk === 0) {
        if (counts.priest + numMages + counts.ballClear + counts.otherDps === 6) return true;
    }

    // Rule 6: 其他可能的六人組合，至少要有一位單法或是祭司
    if ((numMages >= 1 || counts.priest >= 1)) {
        if (counts.dk + counts.priest + numMages + counts.ballClear + counts.otherDps === 6) return true;
    }

    return false;
}

export function validatePartialTeam(team: User[]): boolean {
    if (team.length < 3 || team.length > 5) return false;
    return true; 
}
