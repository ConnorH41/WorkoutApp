import { supabase } from './supabase';

export async function insertBodyweight(payload: { user_id: string; weight: number }) {
  return await supabase.from('bodyweight').insert(payload instanceof Array ? payload : [payload]);
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
