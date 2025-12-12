import { JobClass } from './definitions';

export interface User {
    id: number;
    name: string;
    job_class: JobClass;
}

export interface MatchedTeam {
    timeSlot: string;
    teams: User[][];
}
