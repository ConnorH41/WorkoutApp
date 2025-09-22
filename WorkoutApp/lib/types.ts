export interface Day {
  id: string;
  name: string;
  user_id?: string | null;
  created_at?: string;
}

export interface Exercise {
  id: string;
  day_id: string;
  name: string;
  sets: number;
  reps: number;
  notes?: string | null;
  created_at?: string;
}

// Used for forms / preview exercises where fields may be strings before parsing
export interface ExerciseForm {
  id?: string;
  day_id?: string;
  name: string;
  sets: string;
  reps: string;
  notes?: string;
}

export type DeleteTargetType = 'day' | 'exercise' | 'preview';
