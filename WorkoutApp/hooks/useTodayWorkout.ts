import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../lib/profileStore';

export function useTodayWorkout() {
  const profile = useProfileStore((s) => s.profile);
  const [workoutLoading, setWorkoutLoading] = useState(false);
  const [todayWorkout, setTodayWorkout] = useState<any | null>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [activeSplitRun, setActiveSplitRun] = useState<any | null>(null);
  const [splitTemplate, setSplitTemplate] = useState<any | null>(null);
  const [splitDayExercises, setSplitDayExercises] = useState<any[]>([]);
  const [splitDayName, setSplitDayName] = useState<string | null>(null);
  const [dayNameFromWorkout, setDayNameFromWorkout] = useState<string | null>(null);

  useEffect(() => {
    if (profile && profile.id) {
      fetchTodayWorkout();
      fetchActiveSplitRun();
    }
  }, [profile?.id]);

  const ensureSetsForExercise = useCallback((exercise: any, setLogsFn?: (fn: any) => void) => {
    // Hook keeps this lightweight; specific logs state lives in the component for now.
    return null;
  }, []);

  const fetchActiveSplitRun = async () => {
    if (!profile || !profile.id) return;
    try {
      const { data } = await supabase
        .from('split_runs')
        .select('*')
        .eq('user_id', profile.id)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1);
      if (!data || data.length === 0) {
        setActiveSplitRun(null);
        setSplitTemplate(null);
        setSplitDayExercises([]);
        setSplitDayName(null);
        return;
      }
      const run = data[0];
      setActiveSplitRun(run);

      const { data: splitData } = await supabase.from('splits').select('*').eq('id', run.split_id).limit(1);
      const split = splitData && splitData.length > 0 ? splitData[0] : null;
      setSplitTemplate(split);

      const { data: sdData } = await supabase
        .from('split_days')
        .select('*')
        .eq('split_id', run.split_id)
        .order('order_index', { ascending: true });
      const splitDays = sdData || [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let mappedDayId: string | null = null;
      if (split && typeof split.mode === 'string' && split.mode.toLowerCase().includes('week')) {
        const wd = today.getDay();
        const match = splitDays.find((sd: any) => sd.weekday != null && Number(sd.weekday) === wd);
        if (match) mappedDayId = match.day_id;
        else mappedDayId = null;
      }

      if (mappedDayId) {
        const { data: dayData } = await supabase.from('days').select('*').eq('id', mappedDayId).limit(1);
        const day = dayData && dayData.length > 0 ? dayData[0] : null;
        setSplitDayName(day ? day.name : null);

        const { data: exData } = await supabase.from('exercises').select('*').eq('day_id', mappedDayId).order('created_at', { ascending: true });
        setSplitDayExercises(exData || []);
      } else {
        setSplitDayExercises([]);
        setSplitDayName(null);
      }
    } catch (e) {
      setActiveSplitRun(null);
      setSplitTemplate(null);
      setSplitDayExercises([]);
    }
  };

  const fetchTodayWorkout = async () => {
    setWorkoutLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    if (!profile || !profile.id) {
      setWorkoutLoading(false);
      return;
    }
    try {
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', profile.id)
        .eq('date', today)
        .single();
      if (workout && !workoutError) {
        setTodayWorkout(workout);
        if (workout.day_id) {
          const { data: dayData } = await supabase.from('days').select('*').eq('id', workout.day_id).limit(1);
          if (dayData && dayData.length > 0) setDayNameFromWorkout(dayData[0].name);
          else setDayNameFromWorkout(null);
        } else setDayNameFromWorkout(null);

        if (workout.day_id) {
          const { data: exercisesData } = await supabase.from('exercises').select('*').eq('day_id', workout.day_id);
          if (exercisesData) setExercises(exercisesData);
        }
      } else {
        setTodayWorkout(null);
        setExercises([]);
        setDayNameFromWorkout(null);
      }
    } catch (e) {
      setTodayWorkout(null);
      setExercises([]);
      setDayNameFromWorkout(null);
    }
    setWorkoutLoading(false);
  };

  return {
    profile,
    workoutLoading,
    todayWorkout,
    exercises,
    activeSplitRun,
    splitTemplate,
    splitDayExercises,
    splitDayName,
    dayNameFromWorkout,
    fetchTodayWorkout,
    fetchActiveSplitRun,
    ensureSetsForExercise,
    setTodayWorkout,
    setExercises,
    setSplitDayExercises,
  };
}
