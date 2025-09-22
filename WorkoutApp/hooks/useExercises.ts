import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Exercise, ExerciseForm } from '../lib/types';

export default function useExercises() {
  const [exercises, setExercises] = useState<ExerciseForm[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchExercises = useCallback(async (dayId?: string) => {
    if (!dayId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('day_id', dayId)
        .order('created_at', { ascending: true });
      if (!error && data) {
        const mapped = (data as Exercise[]).map(e => ({
          id: e.id,
          day_id: e.day_id,
          name: e.name,
          sets: String(e.sets),
          reps: String(e.reps),
          notes: e.notes || ''
        }));
        setExercises(mapped);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const createExercise = useCallback(async (dayId: string, form: ExerciseForm) => {
    const { error } = await supabase.from('exercises').insert({
      day_id: dayId,
      name: form.name,
      sets: parseInt(String(form.sets), 10),
      reps: parseInt(String(form.reps), 10),
      notes: form.notes,
    });
    if (error) throw error;
    await fetchExercises(dayId);
    return true;
  }, [fetchExercises]);

  const updateExercise = useCallback(async (id: string, form: ExerciseForm, dayId?: string) => {
    const { error } = await supabase.from('exercises').update({
      name: form.name,
      sets: parseInt(String(form.sets), 10),
      reps: parseInt(String(form.reps), 10),
      notes: form.notes,
    }).eq('id', id);
    if (error) throw error;
    if (dayId) await fetchExercises(dayId);
    return true;
  }, [fetchExercises]);

  const deleteExercise = useCallback(async (id: string, dayId?: string) => {
    const { error } = await supabase.from('exercises').delete().eq('id', id);
    if (error) throw error;
    if (dayId) await fetchExercises(dayId);
    return true;
  }, [fetchExercises]);

  return {
    exercises,
    loading,
    fetchExercises,
    setExercises,
    createExercise,
    updateExercise,
    deleteExercise,
  } as const;
}
