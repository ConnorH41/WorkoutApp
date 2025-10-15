import { supabase } from './supabase';

export async function insertBodyweight(payload: { user_id: string; weight: number; unit?: 'kg' | 'lb'; logged_at?: string }) {
  return await supabase.from('bodyweight').insert(payload instanceof Array ? payload : [payload]).select();
}

export async function getBodyweightByUserDate(userId: string, isoDate: string) {
  // Query by logged_at (the date the bodyweight is FOR, not when it was created)
  return await supabase.from('bodyweight').select('*').eq('user_id', userId).eq('logged_at', isoDate).order('created_at', { ascending: false }).limit(1);
}

export async function updateBodyweight(id: string, payload: { weight?: number; unit?: 'kg' | 'lb' }) {
  return await supabase.from('bodyweight').update(payload).eq('id', id).select().limit(1);
}

export async function deleteBodyweight(id: string) {
  return await supabase.from('bodyweight').delete().eq('id', id);
}

export async function getDayByName(name: string) {
  return await supabase.from('days').select('*').eq('name', name).limit(1);
}

export async function getDayById(id: string) {
  return await supabase.from('days').select('*').eq('id', id).limit(1);
}

export async function getExercisesByDayId(dayId: string) {
  return await supabase.from('exercises').select('*').eq('day_id', dayId);
}

export async function insertWorkout(payload: any) {
  return await supabase.from('workouts').insert([payload]).select().limit(1);
}

export async function getWorkoutByUserDate(userId: string, date: string) {
  return await supabase.from('workouts').select('*').eq('user_id', userId).eq('date', date).single();
}

export async function updateWorkout(id: string, payload: any) {
  return await supabase.from('workouts').update(payload).eq('id', id).select().limit(1);
}

export async function insertExercise(payload: any) {
  return await supabase.from('exercises').insert([payload]).select().limit(1);
}

export async function deleteExercise(id: string) {
  return await supabase.from('exercises').delete().eq('id', id);
}

export async function insertLogs(payload: any[]) {
  return await supabase.from('logs').insert(payload);
}

export async function insertSingleLog(payload: any) {
  return await supabase.from('logs').insert([payload]).select().limit(1);
}

export async function updateLog(id: string, payload: any) {
  return await supabase.from('logs').update(payload).eq('id', id);
}

export async function getLogsByWorkoutId(workoutId: string) {
  return await supabase
    .from('logs')
    .select('*')
    .eq('workout_id', workoutId)
    .order('exercise_id', { ascending: true })
    .order('set_number', { ascending: true });
}

export async function getActiveSplitRun(userId: string) {
  return await supabase
    .from('split_runs')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1);
}

export async function getSplitById(id: string) {
  return await supabase.from('splits').select('*').eq('id', id).limit(1);
}

export async function getSplitDaysBySplitId(splitId: string) {
  return await supabase.from('split_days').select('*').eq('split_id', splitId).order('order_index', { ascending: true });
}

// --- Workout exercise instances (per-workout snapshots) ---
export async function insertWorkoutExercise(payload: any) {
  return await supabase.from('workout_exercises').insert([payload]).select().limit(1);
}

export async function getWorkoutExercisesByWorkoutId(workoutId: string) {
  return await supabase.from('workout_exercises').select('*').eq('workout_id', workoutId).order('created_at', { ascending: true });
}

export async function getWorkoutExercisesByUserDate(userId: string, isoDate: string) {
  // Use a UTC range for the given ISO date to avoid timezone issues
  const start = `${isoDate}T00:00:00Z`;
  const end = `${isoDate}T23:59:59Z`;
  return await supabase.from('workout_exercises').select('*').eq('user_id', userId).gte('created_at', start).lte('created_at', end).order('created_at', { ascending: true });
}

export async function deleteWorkoutExercise(id: string) {
  return await supabase.from('workout_exercises').delete().eq('id', id);
}

export async function updateWorkoutExercise(id: string, payload: any) {
  return await supabase.from('workout_exercises').update(payload).eq('id', id).select().limit(1);
}
