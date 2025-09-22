import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import * as api from '../lib/api';
import { useProfileStore } from '../lib/profileStore';

export function useTodayWorkout() {
  const profile = useProfileStore((s) => s.profile);
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
  const [resting, setResting] = useState(false);
  const [isRestDay, setIsRestDay] = useState(false);

  useEffect(() => {
    if (profile && profile.id) {
      (async () => {
        // Load split/run first so mapping info is available when we fetch today's workout
        const splitInfo = await fetchActiveSplitRun();
        if (splitInfo && splitInfo.run && splitInfo.split) {
          await fetchTodayWorkout(undefined, { activeRun: splitInfo.run, splitTemplate: splitInfo.split, splitDays: splitInfo.splitDays });
        } else {
          await fetchTodayWorkout();
        }
      })();
    }
  }, [profile?.id]);

  // Parse YYYY-MM-DD into a date at local midnight
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

  // Given a target date (Date) compute the mapped split day id using
  // activeSplitRun, splitTemplate, and splitDays state. Returns null if
  // no mapping applies (e.g., before run start or outside end date).
  const computeMappedDayIdForDate = (targetDate: Date, opts?: { activeRun?: any; splitTemplate?: any; splitDays?: any[] }) => {
    const run = opts?.activeRun ?? activeSplitRun;
    const split = opts?.splitTemplate ?? splitTemplate;
    const sd = opts?.splitDays ?? splitDays ?? [];
    if (!run || !split) return null;

    // Weekly mode: map by weekday field on split_days
    if (split && typeof split.mode === 'string' && split.mode.toLowerCase().includes('week')) {
      const wd = targetDate.getDay();
      const match = sd.find((sdd: any) => sdd.weekday != null && Number(sdd.weekday) === wd);
      return match ? match.day_id : null;
    }

    // Rotation mode: use order_index slots
    if (split && typeof split.mode === 'string' && split.mode.toLowerCase().includes('rotation')) {
      const rotSlots = (sd || []).filter((sdd: any) => sdd.order_index != null).sort((a: any, b: any) => (Number(a.order_index) || 0) - (Number(b.order_index) || 0));
      if (rotSlots.length === 0) return null;

  const runStart = parseDateOnly(run?.start_date ?? null);
  const runEnd = parseDateOnly(run?.end_date ?? null);

      if (runStart) {
        // If targetDate is before start, no mapping
        if (targetDate.getTime() < runStart.getTime()) return null;
        // If run has an end date and target is after end, no mapping
        if (runEnd && targetDate.getTime() > runEnd.getTime()) return null;

        const diffMs = targetDate.getTime() - runStart.getTime();
        const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        const idx = ((diffDays % rotSlots.length) + rotSlots.length) % rotSlots.length;
        return rotSlots[idx].day_id || null;
      }

      // No start date: default to first slot
      return rotSlots[0].day_id || null;
    }

    return null;
  };

  const ensureSetsForExercise = useCallback((exercise: any, setLogsFn?: (fn: any) => void) => {
    // Hook keeps this lightweight; specific logs state lives in the component for now.
    return null;
  }, []);

  const fetchActiveSplitRun = async () => {
    if (!profile || !profile.id) return;
    try {
      const { data } = await api.getActiveSplitRun(profile.id);
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let mappedDayId: string | null = null;
      if (split && typeof split.mode === 'string' && split.mode.toLowerCase().includes('week')) {
        const wd = today.getDay();
        const match = splitDays.find((sd: any) => sd.weekday != null && Number(sd.weekday) === wd);
        if (match) mappedDayId = match.day_id;
        else mappedDayId = null;
      }

      // Handle rotation-style splits: compute offset from the run start date and
      // map into the rotation slots (split_days ordered by order_index).
      if (split && typeof split.mode === 'string' && split.mode.toLowerCase().includes('rotation')) {
        try {
          const rotSlots = (splitDays || []).filter((sd: any) => sd.order_index != null).sort((a: any, b: any) => (Number(a.order_index) || 0) - (Number(b.order_index) || 0));
          if (rotSlots.length === 0) {
            mappedDayId = null;
          } else {
            // If the active run defines a start_date, compute days since start.
            // Dates in DB are stored as YYYY-MM-DD; parse date-only to avoid timezone shifts.
            const parseDateOnly = (s: string | null) => {
              if (!s) return null;
              const parts = String(s).split('-').map((p) => parseInt(p, 10));
              if (parts.length < 3 || parts.some((p) => Number.isNaN(p))) return null;
              return new Date(parts[0], parts[1] - 1, parts[2]);
            };

            const runStart = parseDateOnly(run?.start_date ?? null);
            if (runStart) {
              runStart.setHours(0, 0, 0, 0);
              const diffMs = today.getTime() - runStart.getTime();
              if (diffMs < 0) {
                // Before the rotation start — don't map a day yet
                mappedDayId = null;
              } else {
                const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
                const idx = ((diffDays % rotSlots.length) + rotSlots.length) % rotSlots.length;
                mappedDayId = rotSlots[idx].day_id || null;
              }
            } else {
              // No explicit start date — default to first rotation slot
              mappedDayId = rotSlots[0].day_id || null;
            }
          }
        } catch (e) {
          mappedDayId = null;
        }
      }

      if (mappedDayId) {
        const { data: dayData } = await api.getDayById(mappedDayId);
        const day = dayData && dayData.length > 0 ? dayData[0] : null;
        setSplitDayName(day ? day.name : null);
        setSplitDayId(mappedDayId);
        setSplitDayMapped(true);

        const { data: exData } = await api.getExercisesByDayId(mappedDayId);
        setSplitDayExercises(exData || []);
      } else {
        setSplitDayExercises([]);
        setSplitDayName(null);
        setSplitDayId(null);
        setSplitDayMapped(true);
      }
      return { run, split, splitDays: splitDaysData };
    } catch (e) {
      setActiveSplitRun(null);
      setSplitTemplate(null);
      setSplitDayExercises([]);
      return { run: null, split: null, splitDays: [] };
    }
  };

  const fetchTodayWorkout = async (dateStr?: string, opts?: { activeRun?: any; splitTemplate?: any; splitDays?: any[] }) => {
    setWorkoutLoading(true);
    const today = (dateStr && String(dateStr).slice(0, 10)) || formatDateOnly(new Date());
    if (!profile || !profile.id) {
      setWorkoutLoading(false);
      return;
    }
    try {
  const { data: workout, error: workoutError } = await api.getWorkoutByUserDate(profile.id, today);
      if (workout && !workoutError) {
        setTodayWorkout(workout);
        // Mark rest day if the workout exists and is marked completed
        setIsRestDay(!!workout.completed);
        if (workout.day_id) {
          const { data: dayData } = await api.getDayById(workout.day_id);
          if (dayData && dayData.length > 0) setDayNameFromWorkout(dayData[0].name);
          else setDayNameFromWorkout(null);
        } else setDayNameFromWorkout(null);

        if (workout.day_id) {
          const { data: exercisesData } = await api.getExercisesByDayId(workout.day_id);
          if (exercisesData) setExercises(exercisesData);
        }
      } else {
        setTodayWorkout(null);
        setExercises([]);
        setDayNameFromWorkout(null);
        // No explicit workout record for this date -> not a completed rest day
        setIsRestDay(false);
      }
      // Regardless of whether there's a created workout for the date, compute
      // the scheduled split day (if any) for this date so the UI can show the
      // split's day name/exercises when no workout exists.
      try {
        const target = parseDateOnly(today);
        if (target) {
          // If caller provided split/run info, use it directly so mapping doesn't rely on state propagation
          const providedRun = opts?.activeRun;
          const providedSplit = opts?.splitTemplate;
          const providedSplitDays = opts?.splitDays;
          if (providedRun && providedSplit) {
            const mappedId = computeMappedDayIdForDate(target, { activeRun: providedRun, splitTemplate: providedSplit, splitDays: providedSplitDays });
            try { console.debug('[useTodayWorkout] mappedId (provided) for', target.toISOString().slice(0,10), '=>', mappedId); } catch (e) {}
            setSplitDayMapped(true);
            setSplitDayId(mappedId ?? null);
            if (mappedId) {
              const { data: dayData } = await api.getDayById(mappedId);
              const day = dayData && dayData.length > 0 ? dayData[0] : null;
              setSplitDayName(day ? day.name : null);
              const { data: exData } = await api.getExercisesByDayId(mappedId);
              setSplitDayExercises(exData || []);
              setIsRestDay(false);
            } else {
              setSplitDayName(null);
              setSplitDayExercises([]);
            }
          } else if (activeSplitRun && splitTemplate) {
            const mappedId = computeMappedDayIdForDate(target);
            try { console.debug('[useTodayWorkout] mappedId for', target.toISOString().slice(0,10), '=>', mappedId); } catch (e) {}
            setSplitDayMapped(true);
            setSplitDayId(mappedId ?? null);
            if (mappedId) {
              const { data: dayData } = await api.getDayById(mappedId);
              const day = dayData && dayData.length > 0 ? dayData[0] : null;
              setSplitDayName(day ? day.name : null);
              const { data: exData } = await api.getExercisesByDayId(mappedId);
              setSplitDayExercises(exData || []);
              setIsRestDay(false);
            } else {
              setSplitDayName(null);
              setSplitDayExercises([]);
            }
          } else {
            // no split/run info available; mapping not evaluated
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

  const createWorkoutFromScheduledDay = async () => {
    if (!profile || !profile.id || !splitDayName) return null;
    setCreatingWorkout(true);
    try {
      const today = formatDateOnly(new Date());
      const payload: any = { user_id: profile.id, date: today };
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
        if (w.day_id) {
          const { data: exData } = await api.getExercisesByDayId(w.day_id);
          setExercises(exData || []);
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
    if (!profile || !profile.id) return null;
    const dayId = todayWorkout?.day_id || originalExercise?.day_id || null;
    try {
      const payload: any = {
        name: newName,
        user_id: profile.id,
        day_id: dayId,
        sets: originalExercise?.sets || 3,
        reps: originalExercise?.reps || 8,
      };
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

  const addBlankExerciseToWorkout = () => {
    if (!profile || !profile.id) return null;
    const id = `tmp-${Date.now()}`;
    const newEx: any = { id, name: 'Exercise Name', user_id: profile.id, day_id: todayWorkout?.day_id || null, sets: 1, reps: '' };
    setExercises(prev => [...prev, newEx]);
    return newEx;
  };

  const addBlankExerciseToSplit = () => {
    if (!profile || !profile.id) return null;
    const id = `tmp-s-${Date.now()}`;
    const dayId = splitDayExercises && splitDayExercises.length > 0 ? splitDayExercises[0].day_id : null;
    const newEx: any = { id, name: 'Exercise Name', user_id: profile.id, day_id: dayId, sets: 1, reps: '' };
    setSplitDayExercises(prev => [...prev, newEx]);
    return newEx;
  };

  const deleteExercise = async (exerciseId: string) => {
    if (!profile || !profile.id) return false;
    try {
      const { error } = await api.deleteExercise(exerciseId);
      if (error) return false;
      setExercises(prev => prev.filter(e => e.id !== exerciseId));
      setSplitDayExercises(prev => prev.filter(e => e.id !== exerciseId));
      return true;
    } catch (e) {
      return false;
    }
  };

  const markComplete = async () => {
    if (!todayWorkout || !todayWorkout.id) return false;
    setCompleting(true);
    try {
      const { data, error } = await api.updateWorkout(todayWorkout.id, { completed: true });
      setCompleting(false);
      if (error) return false;
      if (data && data.length > 0) setTodayWorkout(data[0]);
      return true;
    } catch (e) {
      setCompleting(false);
      return false;
    }
  };

  const markRestDay = async () => {
    if (!profile || !profile.id) return false;
    setResting(true);
    try {
  const today = formatDateOnly(new Date());
      if (todayWorkout && todayWorkout.id) {
        const { data, error } = await api.updateWorkout(todayWorkout.id, { completed: true });
        setResting(false);
        if (error) return false;
        if (data && data.length > 0) setTodayWorkout(data[0]);
      } else {
        const { data, error } = await api.insertWorkout({ user_id: profile.id, date: today, completed: true });
        setResting(false);
        if (error) return false;
        if (data && data.length > 0) setTodayWorkout(data[0]);
      }
      setIsRestDay(true);
      return true;
    } catch (e) {
      setResting(false);
      return false;
    }
  };

  const unmarkRestDay = async () => {
    if (!todayWorkout || !todayWorkout.id) {
      setIsRestDay(false);
      return true;
    }
    setResting(true);
    try {
      const { data, error } = await api.updateWorkout(todayWorkout.id, { completed: false });
      setResting(false);
      if (error) return false;
      if (data && data.length > 0) setTodayWorkout(data[0]);
      setIsRestDay(false);
      return true;
    } catch (e) {
      setResting(false);
      return false;
    }
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
    createWorkoutFromScheduledDay,
    createExercise,
    addBlankExerciseToWorkout,
    addBlankExerciseToSplit,
    deleteExercise,
    markComplete,
    markRestDay,
    unmarkRestDay,
    creatingWorkout,
    completing,
    resting,
    isRestDay,
  splitDayId,
  splitDayMapped,
    setTodayWorkout,
    setExercises,
    setSplitDayExercises,
  };
}
