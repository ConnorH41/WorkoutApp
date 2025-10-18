import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import * as api from '../lib/api';

export function useTodayWorkout() {
  const [userId, setUserId] = useState<string | null>(null);
  const [workoutLoading, setWorkoutLoading] = useState(false);
  const [todayWorkout, setTodayWorkout] = useState<any | null>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [activeSplitRun, setActiveSplitRun] = useState<any | null>(null);
  const [splitTemplate, setSplitTemplate] = useState<any | null>(null);
  const [splitDays, setSplitDays] = useState<any[]>([]);
  const [splitDayExercises, setSplitDayExercises] = useState<any[]>([]);
  const [splitDayName, setSplitDayName] = useState<string | null>(null);
  const [splitDayId, setSplitDayId] = useState<string | null>(null);
  const [splitDayMapped, setSplitDayMapped] = useState<boolean>(false);
  const [dayNameFromWorkout, setDayNameFromWorkout] = useState<string | null>(null);
  const [creatingWorkout, setCreatingWorkout] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUserId();
  }, []);

  // Helper date functions
  const parseDateOnly = (s: string | null) => {
    if (!s) return null;
    const parts = String(s).split('-').map((p) => parseInt(p, 10));
    if (parts.length < 3 || parts.some((p) => Number.isNaN(p))) return null;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const formatDateOnly = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const dd = new Date(d);
    dd.setHours(0, 0, 0, 0);
    return `${dd.getFullYear()}-${pad(dd.getMonth() + 1)}-${pad(dd.getDate())}`;
  };

  const computeMappedDayIdForDate = (targetDate: Date, opts?: { activeRun?: any; splitTemplate?: any; splitDays?: any[] }) => {
    const run = opts?.activeRun ?? activeSplitRun;
    const split = opts?.splitTemplate ?? splitTemplate;
    const sd = opts?.splitDays ?? splitDays ?? [];
    if (!run || !split) return null;

    if (split && typeof split.mode === 'string' && split.mode.toLowerCase().includes('week')) {
      const wd = targetDate.getDay();
      const match = sd.find((sdd: any) => sdd.weekday != null && Number(sdd.weekday) === wd);
      return match ? match.day_id : null;
    }

    if (split && typeof split.mode === 'string' && split.mode.toLowerCase().includes('rotation')) {
      const rotSlots = (sd || []).filter((sdd: any) => sdd.order_index != null).sort((a: any, b: any) => (Number(a.order_index) || 0) - (Number(b.order_index) || 0));
      if (rotSlots.length === 0) return null;
      const runStart = parseDateOnly(run?.start_date ?? null);
      const runEnd = parseDateOnly(run?.end_date ?? null);
      if (runStart) {
        if (targetDate.getTime() < runStart.getTime()) return null;
        if (runEnd && targetDate.getTime() > runEnd.getTime()) return null;
        const diffMs = targetDate.getTime() - runStart.getTime();
        const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        const idx = ((diffDays % rotSlots.length) + rotSlots.length) % rotSlots.length;
        return rotSlots[idx].day_id || null;
      }
      return rotSlots[0].day_id || null;
    }

    return null;
  };

  const ensureSetsForExercise = useCallback((exercise: any) => null, []);

  const fetchActiveSplitRun = async () => {
    if (!userId) return;
    try {
      const { data } = await api.getActiveSplitRun(userId);
      if (!data || data.length === 0) {
        setActiveSplitRun(null);
        setSplitTemplate(null);
        setSplitDayExercises([]);
        setSplitDayName(null);
        return { run: null, split: null, splitDays: [] };
      }
      const run = data[0];
      setActiveSplitRun(run);
      const { data: splitData } = await api.getSplitById(run.split_id);
      const split = splitData && splitData.length > 0 ? splitData[0] : null;
      setSplitTemplate(split);
      const { data: sdData } = await api.getSplitDaysBySplitId(run.split_id);
      const splitDaysData = sdData || [];
      setSplitDays(splitDaysData);
      return { run, split, splitDays: splitDaysData };
    } catch (e) {
      setActiveSplitRun(null);
      setSplitTemplate(null);
      setSplitDayExercises([]);
      return { run: null, split: null, splitDays: [] };
    }
  };

  // Realtime listener: watch split_runs and refresh mapping via fetchTodayWorkout
  useEffect(() => {
    if (!userId || !supabase?.channel) return;
    let channel: any = null;
    try {
      channel = supabase
        .channel(`public:split_runs:user:${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'split_runs', filter: `user_id=eq.${userId}` }, async () => {
          const info = await fetchActiveSplitRun();
          if (info && info.run && info.split) await fetchTodayWorkout();
          else await fetchTodayWorkout();
        })
        .subscribe();
    } catch (e) {
      try {
        const clientAny: any = supabase as any;
        const sub = clientAny.from('split_runs').on('*', async (payload: any) => {
          if (!payload || !payload.record) return;
          if (String(payload.record.user_id) !== String(userId)) return;
          const info = await fetchActiveSplitRun();
          if (info && info.run && info.split) await fetchTodayWorkout();
          else await fetchTodayWorkout();
        }).subscribe();
        channel = sub;
      } catch (e2) {
        channel = null;
      }
    }

    return () => {
      try {
        if (channel && channel.unsubscribe) channel.unsubscribe();
        if (channel && channel.remove) channel.remove();
      } catch {}
    };
  }, [userId]);

  // Persist a one-off override row (or remove) for the selected date
  const setScheduledDayForToday = async (dayId: string | null) => {
    if (!userId) return false;
    try {
      const today = formatDateOnly(new Date());
      if (dayId) {
        const original = splitDayId ?? null;
        const splitRunId = activeSplitRun?.id ?? null;
        await api.setDayOverride({ user_id: userId, calendar_date: today, overridden_day_id: dayId, original_day_id: original, split_run_id: splitRunId, note: 'User override' });
      } else {
        await api.deleteDayOverride(userId, today);
      }

      setSplitDayId(dayId);
      setSplitDayMapped(true);
      if (dayId) {
        try {
          const { data: dayData } = await api.getDayById(dayId);
          const day = dayData && dayData.length > 0 ? dayData[0] : null;
          setSplitDayName(day ? day.name : null);
          setDayNameFromWorkout(day ? day.name : null);
          const { data: exData } = await api.getExercisesByDayId(dayId);
          setSplitDayExercises(exData || []);
        } catch (e) {
          setSplitDayName(null);
          setSplitDayExercises([]);
        }
      } else {
        setSplitDayName(null);
        setSplitDayExercises([]);
        setDayNameFromWorkout(null);
      }

      return true;
    } catch (e) {
      return false;
    }
  };

  const fetchTodayWorkout = async (dateStr?: string, opts?: { activeRun?: any; splitTemplate?: any; splitDays?: any[] }) => {
    setWorkoutLoading(true);
    const today = (dateStr && String(dateStr).slice(0, 10)) || formatDateOnly(new Date());
    if (!userId) {
      setWorkoutLoading(false);
      return;
    }
    try {
      const { data: workout, error: workoutError } = await api.getWorkoutByUserDate(userId, today);
      if (workout && !workoutError) {
        setTodayWorkout(workout);
        if (workout.day_id) {
          const { data: dayData } = await api.getDayById(workout.day_id);
          if (dayData && dayData.length > 0) setDayNameFromWorkout(dayData[0].name);
          else setDayNameFromWorkout(null);
        } else setDayNameFromWorkout(null);

        try {
          const { data: instances, error: instErr } = await api.getWorkoutExercisesByWorkoutId(workout.id);
          if (!instErr && instances) setExercises(instances);
          else {
            if (workout.day_id) {
              const { data: exercisesData } = await api.getExercisesByDayId(workout.day_id);
              if (exercisesData) setExercises(exercisesData);
            } else setExercises([]);
          }
        } catch (e) {
          if (workout.day_id) {
            const { data: exercisesData } = await api.getExercisesByDayId(workout.day_id);
            if (exercisesData) setExercises(exercisesData);
          } else setExercises([]);
        }
      } else {
        setTodayWorkout(null);
        setExercises([]);
        setDayNameFromWorkout(null);
      }

      // Check for override first
      try {
        const target = parseDateOnly(today);
        if (target) {
          try {
            const { data: overrideData, error: overrideErr } = await api.getDayOverrideForUserDate(userId, String(today));
            if (!overrideErr && overrideData && overrideData.overridden_day_id) {
              setSplitDayMapped(true);
              setSplitDayId(overrideData.overridden_day_id || null);
              try {
                const { data: dayData } = await api.getDayById(overrideData.overridden_day_id);
                const day = dayData && dayData.length > 0 ? dayData[0] : null;
                setSplitDayName(day ? day.name : null);
                const { data: exData } = await api.getExercisesByDayId(overrideData.overridden_day_id);
                setSplitDayExercises(exData || []);
              } catch (e) {
                setSplitDayName(null);
                setSplitDayExercises([]);
              }
              setWorkoutLoading(false);
              return;
            }
          } catch (e) {
            // ignore override lookup errors
          }

          const providedRun = opts?.activeRun;
          const providedSplit = opts?.splitTemplate;
          const providedSplitDays = opts?.splitDays;
          if (providedRun && providedSplit) {
            const mappedId = computeMappedDayIdForDate(target, { activeRun: providedRun, splitTemplate: providedSplit, splitDays: providedSplitDays });
            setSplitDayMapped(true);
            setSplitDayId(mappedId ?? null);
            if (mappedId) {
              const { data: dayData } = await api.getDayById(mappedId);
              const day = dayData && dayData.length > 0 ? dayData[0] : null;
              setSplitDayName(day ? day.name : null);
              const { data: exData } = await api.getExercisesByDayId(mappedId);
              setSplitDayExercises(exData || []);
            } else {
              setSplitDayName(null);
              setSplitDayExercises([]);
            }
          } else if (activeSplitRun && splitTemplate) {
            const mappedId = computeMappedDayIdForDate(target);
            setSplitDayMapped(true);
            setSplitDayId(mappedId ?? null);
            if (mappedId) {
              const { data: dayData } = await api.getDayById(mappedId);
              const day = dayData && dayData.length > 0 ? dayData[0] : null;
              setSplitDayName(day ? day.name : null);
              const { data: exData } = await api.getExercisesByDayId(mappedId);
              setSplitDayExercises(exData || []);
            } else {
              setSplitDayName(null);
              setSplitDayExercises([]);
            }
          } else {
            setSplitDayMapped(false);
            setSplitDayId(null);
            setSplitDayName(null);
            setSplitDayExercises([]);
          }
        }
      } catch (e) {
        setSplitDayName(null);
        setSplitDayExercises([]);
      }
    } catch (e) {
      setTodayWorkout(null);
      setExercises([]);
      setDayNameFromWorkout(null);
    }
    setWorkoutLoading(false);
  };

  const createWorkoutFromScheduledDay = async (dateStr?: string) => {
    if (!userId || !splitDayName) return null;
    setCreatingWorkout(true);
    try {
      const today = dateStr || formatDateOnly(new Date());
      const payload: any = { user_id: userId, date: today };
      if (splitDayName) {
        const { data: dayData } = await api.getDayByName(splitDayName);
        if (dayData && dayData.length > 0) payload.day_id = dayData[0].id;
      }
      const { data, error } = await api.insertWorkout(payload);
      setCreatingWorkout(false);
      if (error) return null;
      if (data && data.length > 0) {
        const w = data[0];
        setTodayWorkout(w);
        try {
          const { data: instances } = await api.getWorkoutExercisesByWorkoutId(w.id);
          setExercises(instances || []);
        } catch (e) {
          if (w.day_id) {
            const { data: exData } = await api.getExercisesByDayId(w.day_id);
            setExercises(exData || []);
          } else {
            setExercises([]);
          }
        }
        return w;
      }
    } catch (e) {
      setCreatingWorkout(false);
      return null;
    }
    return null;
  };

  const createExercise = async (originalExercise: any, newName: string) => {
    if (!userId) return null;
    const dayId = todayWorkout?.day_id || originalExercise?.day_id || null;
    try {
      const payload: any = { name: newName, user_id: userId, day_id: dayId, sets: originalExercise?.sets || 3, reps: originalExercise?.reps || 8 };
      const { data, error } = await api.insertExercise(payload);
      if (error) return null;
      if (data && data.length > 0) {
        const ex = data[0];
        setExercises(prev => [...prev, ex]);
        return ex;
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const addBlankExerciseToWorkout = (dateStr?: string) => {
    if (!userId) return null;
    const id = `tmp-${Date.now()}`;
    const tmpEx: any = { id, name: 'Exercise Name', user_id: userId, day_id: todayWorkout?.day_id || null, sets: 1, reps: '' };
    setExercises(prev => [...prev, tmpEx]);

    (async () => {
      try {
        let w = todayWorkout;
        if (!w) {
          const today = dateStr || formatDateOnly(new Date());
          const { data: wdata } = await api.insertWorkout({ user_id: userId, date: today });
          if (wdata && wdata.length > 0) { w = wdata[0]; setTodayWorkout(w); }
        }
        if (!w) return;
        const payload: any = { user_id: userId, workout_id: w.id, exercise_id: null, name: 'Exercise Name', sets: 1, reps: '' };
        const { data, error } = await api.insertWorkoutExercise(payload);
        if (!error && data && data.length > 0) {
          const instance = data[0];
          setExercises(prev => prev.map(e => (String(e.id) === String(id) ? instance : e)));
          return;
        }
        return;
      } catch (e) { return; }
    })();

    return tmpEx;
  };

  const addBlankExerciseToSplit = () => {
    if (!userId) return null;
    const id = `tmp-s-${Date.now()}`;
    const dayId = splitDayExercises && splitDayExercises.length > 0 ? splitDayExercises[0].day_id : null;
    const newEx: any = { id, name: 'Exercise Name', user_id: userId, day_id: dayId, sets: 1, reps: '' };
    setSplitDayExercises(prev => [...prev, newEx]);
    return newEx;
  };

  const addTransientExercise = async (name = 'Exercise Name') => {
    if (!userId) return null;
    try {
      const payload: any = { name: name, user_id: userId, day_id: null, sets: 1, reps: '' };
      const { data, error } = await api.insertExercise(payload);
      if (error) return null;
      if (data && data.length > 0) { const ex = data[0]; setExercises(prev => [...prev, ex]); return ex; }
    } catch (e) {}
    return null;
  };

  const deleteExercise = async (exerciseId: string) => {
    if (!userId) return false;
    try {
      const local = exercises.find(e => String(e.id) === String(exerciseId));
      if (local && local.workout_id) {
        if (String(exerciseId).startsWith('tmp-')) { setExercises(prev => prev.filter(e => e.id !== exerciseId)); return true; }
        const { error } = await api.deleteWorkoutExercise(exerciseId);
        if (error) return false;
        setExercises(prev => prev.filter(e => e.id !== exerciseId));
        return true;
      }
      const { error } = await api.deleteExercise(exerciseId);
      if (error) return false;
      setExercises(prev => prev.filter(e => e.id !== exerciseId));
      setSplitDayExercises(prev => prev.filter(e => e.id !== exerciseId));
      return true;
    } catch (e) { return false; }
  };

  const updateWorkoutExerciseInstance = async (id: string, payload: any) => {
    if (!userId) return null;
    if (String(id).startsWith('tmp-')) return null;
    try {
      const { data, error } = await api.updateWorkoutExercise(id, payload);
      if (error) return null;
      if (data && data.length > 0) { const inst = data[0]; setExercises(prev => prev.map(e => (String(e.id) === String(id) ? inst : e))); return inst; }
    } catch (e) { return null; }
    return null;
  };

  return {
    userId,
    workoutLoading,
    todayWorkout,
    exercises,
    activeSplitRun,
    splitTemplate,
    splitDayExercises,
    splitDays,
    splitDayName,
    dayNameFromWorkout,
    fetchTodayWorkout,
    fetchActiveSplitRun,
    setScheduledDayForToday,
    ensureSetsForExercise,
    createWorkoutFromScheduledDay,
    createExercise,
    addBlankExerciseToWorkout,
    addBlankExerciseToSplit,
    deleteExercise,
    creatingWorkout,
    completing,
    splitDayId,
    splitDayMapped,
    setTodayWorkout,
    setExercises,
    setSplitDayExercises,
    addTransientExercise,
    updateWorkoutExerciseInstance,
  } as const;
}
