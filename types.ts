
export type DayOfWeek = 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta';

export const DAYS: DayOfWeek[] = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

export type Difficulty = 'easy' | 'alert' | 'hard';
export type Workload = 'small' | 'medium' | 'large';
export type UnitDivision = 'normal' | 'even_odd' | 'digits' | 'digits_pair';

export interface Server {
  id: string;
  name: string;
  status: 'active' | 'off'; // active = ON, off = Vacation/OFF
  offReason?: string;
}

export interface Unit {
  id: string;
  name: string;
  difficulty?: Difficulty;
  workload?: Workload;
  division: UnitDivision;
  processes?: number;
}

export interface Assignment {
  unitId: string; // This can be "u-id" or "u-id:subpart"
  day: DayOfWeek;
  titularId: string | null;
  substituteId: string | null;
}

export interface Holiday {
  day: DayOfWeek;
  isGlobal: boolean;
  serverIds: string[]; // Empty if isGlobal is true
}

export interface AppState {
  servers: Server[];
  units: Unit[];
  assignments: Assignment[];
  holidays: Holiday[];
}
