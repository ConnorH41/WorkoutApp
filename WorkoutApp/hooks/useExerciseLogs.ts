import { useState } from 'react';
import { Alert } from 'react-native';
import * as api from '../lib/api';

type UseExerciseLogsOpts = {
  createWorkoutFromScheduledDay?: () => Promise<any | null>;
  createExercise?: (originalExercise: any, newName: string) => Promise<any | null>;
  createTransientExercise?: (name?: string) => Promise<any | null>;
  getTodayWorkout?: () => any | null;
  getExercises?: () => any[];
  getSplitDayExercises?: () => any[];
  getNameByExercise?: (id: string) => string | undefined;
};

export function useExerciseLogs(opts?: UseExerciseLogsOpts) {
  const [logs, setLogs] = useState<{ [exerciseId: string]: Array<{ setNumber: number; reps: string; weight: string; completed?: boolean; logId?: string | null }> }>({});
  const [notesByExercise, setNotesByExercise] = useState<{ [exerciseId: string]: string }>({});

  const addSetRow = (exerciseId: string) => {
    setLogs(prev => {
      const arr = prev[exerciseId] ? [...prev[exerciseId]] : [];
      arr.push({ setNumber: arr.length + 1, reps: '', weight: '' });
      return { ...prev, [exerciseId]: arr };
    });
  };

  const removeSetRow = (exerciseId: string, index: number) => {
    setLogs(prev => {
      const arr = prev[exerciseId] ? [...prev[exerciseId]] : [];
      arr.splice(index, 1);
      arr.forEach((r, i) => (r.setNumber = i + 1));
      return { ...prev, [exerciseId]: arr };
    });
  };

  const handleSetChange = (exerciseId: string, index: number, field: 'reps' | 'weight', value: string) => {
    setLogs(prev => {
      const arr = prev[exerciseId] ? [...prev[exerciseId]] : [];
      arr[index] = { ...(arr[index] || { setNumber: index + 1, reps: '', weight: '' }), [field]: value } as any;
      return { ...prev, [exerciseId]: arr };
    });
  };

  const handleNotesChange = (exerciseId: string, value: string) => {
    setNotesByExercise(prev => ({ ...prev, [exerciseId]: value }));
  };

  const ensureSetsForExercise = (exercise: any) => {
    const target = Number(exercise?.sets) || 1;
    setLogs(prev => {
      const existing = prev[exercise.id] || [];
      if (existing.length >= target) return prev;
      const arr = [...existing];
      for (let i = existing.length; i < target; i++) {
        arr.push({ setNumber: i + 1, reps: '', weight: '', completed: false, logId: null });
      }
      return { ...prev, [exercise.id]: arr };
    });
  };

  const toggleSetCompleted = async (exerciseId: string, index: number) => {
    const setRow = (logs[exerciseId] || [])[index];
    if (!setRow) return;
    const willComplete = !setRow.completed;
    // Only validate numeric reps/weight when marking a set complete (not when un-marking)
    if (willComplete && (!setRow.reps || !setRow.weight || isNaN(Number(setRow.reps)) || isNaN(Number(setRow.weight)))) {
      Alert.alert('Invalid fields', 'Please enter numeric reps and weight for this set before marking it complete.');
      return;
    }
    try {
      let workout = opts?.getTodayWorkout ? opts.getTodayWorkout() : null;
      if (!workout && opts?.createWorkoutFromScheduledDay) {
        workout = await opts.createWorkoutFromScheduledDay();
        if (!workout) {
          Alert.alert('Error', 'Could not create workout for today');
          return;
        }
      }

  let targetExerciseId = exerciseId;
  const displayedName = opts?.getNameByExercise ? opts.getNameByExercise(exerciseId) : undefined;
  const originalExercise = (opts?.getExercises ? opts.getExercises() : []).find((e: any) => e.id === exerciseId) || (opts?.getSplitDayExercises ? opts.getSplitDayExercises().find((e: any) => e.id === exerciseId) : null);
      if (displayedName && originalExercise && displayedName.trim() !== originalExercise.name && opts?.createExercise) {
        const created = await opts.createExercise(originalExercise, displayedName.trim());
        if (created && created.id) targetExerciseId = created.id;
      }
      // If the exercise id is a temporary local id (tmp-...), create a persistent exercise first
      if (String(targetExerciseId).startsWith('tmp-')) {
        const newName = (displayedName && String(displayedName).trim()) || (originalExercise && originalExercise.name) || 'Exercise Name';
        let created = null;
        if (opts?.createExercise) {
          try { created = await opts.createExercise(originalExercise || null, newName); } catch (e) { created = null; }
        }
        // Fallback: try transient/persistent via createTransientExercise if provided
        if ((!created || !created.id) && opts?.createTransientExercise) {
          try { created = await opts.createTransientExercise(newName); } catch (e) { created = null; }
        }
        if ((!created || !created.id)) {
          try {
            const wk = workout || (opts?.getTodayWorkout ? opts.getTodayWorkout() : null);
            const payload: any = { name: newName, user_id: wk?.user_id || undefined, day_id: null, sets: originalExercise?.sets || 1, reps: originalExercise?.reps || null };
            const { data, error } = await api.insertExercise(payload);
            if (!error && data && data.length > 0) created = data[0];
          } catch (e) {
            // ignore
          }
        }
        // Last-resort: try inserting directly via API using workout.user_id if available
        if ((!created || !created.id)) {
          try {
            const wk = workout || (opts?.getTodayWorkout ? opts.getTodayWorkout() : null);
            const payload: any = { name: newName, user_id: wk?.user_id || undefined, day_id: null, sets: originalExercise?.sets || 1, reps: originalExercise?.reps || null };
            const { data, error } = await api.insertExercise(payload);
            if (!error && data && data.length > 0) created = data[0];
          } catch (e) {
            // ignore
          }
        }
        if (created && created.id) targetExerciseId = created.id;
        else {
          Alert.alert('Error', 'Could not create exercise to attach logs.');
          return;
        }
      }

      if (setRow.logId) {
        const { error } = await api.updateLog(setRow.logId, { completed: willComplete });
        if (error) throw error;
        // update local state so UI toggles immediately
        setLogs(prev => {
          const arr = prev[exerciseId] ? [...prev[exerciseId]] : [];
          arr[index] = { ...(arr[index] || {}), completed: willComplete } as any;
          return { ...prev, [exerciseId]: arr };
        });
        // If this exercise is a persisted workout_exercise instance, also update its completed flag
        try {
          const localExercises = opts?.getExercises ? opts.getExercises() : [];
          const localEx = localExercises.find((e: any) => String(e.id) === String(exerciseId));
          if (localEx && localEx.workout_id) {
            await api.updateWorkoutExercise(localEx.id, { completed: willComplete, completed_at: willComplete ? new Date().toISOString() : null });
          }
        } catch (e) {
          // ignore sync error
        }
      } else if (willComplete) {
        const payload: any = {
          workout_id: workout.id,
          exercise_id: targetExerciseId,
          set_number: setRow.setNumber,
          reps: parseInt(setRow.reps, 10),
          weight: parseFloat(setRow.weight),
          notes: notesByExercise[exerciseId] || '',
          completed: true,
        };
  const { data, error } = await api.insertSingleLog(payload);
        if (error) throw error;
        if (data && data.length > 0) {
          setLogs(prev => {
            const arr = prev[exerciseId] ? [...prev[exerciseId]] : [];
            arr[index] = { ...(arr[index] || {}), completed: true, logId: data[0].id } as any;
            return { ...prev, [exerciseId]: arr };
          });
          // If this exercise corresponds to a persisted workout_exercise instance, mark it completed
          try {
            const localExercises = opts?.getExercises ? opts.getExercises() : [];
            const localEx = localExercises.find((e: any) => String(e.id) === String(exerciseId));
            if (localEx && localEx.workout_id) {
              await api.updateWorkoutExercise(localEx.id, { completed: true, completed_at: new Date().toISOString() });
            }
          } catch (e) {
            // ignore
          }
        }
      } else {
        setLogs(prev => {
          const arr = prev[exerciseId] ? [...prev[exerciseId]] : [];
          arr[index] = { ...(arr[index] || {}), completed: false } as any;
          return { ...prev, [exerciseId]: arr };
        });
        // If un-completing and there's a persisted instance, clear its completed flag
        try {
          const localExercises = opts?.getExercises ? opts.getExercises() : [];
          const localEx = localExercises.find((e: any) => String(e.id) === String(exerciseId));
          if (localEx && localEx.workout_id) {
            await api.updateWorkoutExercise(localEx.id, { completed: false, completed_at: null });
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || String(e));
    }
  };

  const saveSetsForExercise = async (exerciseId: string) => {
    try {
      let workout = opts?.getTodayWorkout ? opts.getTodayWorkout() : null;
      if (!workout && opts?.createWorkoutFromScheduledDay) {
        workout = await opts.createWorkoutFromScheduledDay();
        if (!workout) {
          Alert.alert('Error', 'Could not create workout for today');
          return;
        }
      }

  const displayedName = opts?.getNameByExercise ? opts.getNameByExercise(exerciseId) : undefined;
  const originalExercise = (opts?.getExercises ? opts.getExercises() : []).find((e: any) => e.id === exerciseId) || (opts?.getSplitDayExercises ? opts.getSplitDayExercises().find((e: any) => e.id === exerciseId) : null);
      let targetExerciseId = exerciseId;
      if (displayedName && originalExercise && displayedName.trim() !== originalExercise.name && opts?.createExercise) {
        const created = await opts.createExercise(originalExercise, displayedName.trim());
        if (created && created.id) targetExerciseId = created.id;
      }
      // If exerciseId is a temporary local id, create a persisted exercise first
      if (String(targetExerciseId).startsWith('tmp-')) {
        const newName = (displayedName && String(displayedName).trim()) || (originalExercise && originalExercise.name) || 'Exercise Name';
        let created = null;
        if (opts?.createExercise) {
          try { created = await opts.createExercise(originalExercise || null, newName); } catch (e) { created = null; }
        }
        if ((!created || !created.id) && opts?.createTransientExercise) {
          try { created = await opts.createTransientExercise(newName); } catch (e) { created = null; }
        }
        if (created && created.id) targetExerciseId = created.id;
        else {
          Alert.alert('Error', 'Could not create exercise to attach logs.');
          return;
        }
      }

      const setRows = logs[exerciseId] || [];
      if (setRows.length === 0) {
        Alert.alert('No sets', 'Please add at least one set to save.');
        return;
      }
      for (const r of setRows) {
        if (r.reps === '' || r.weight === '' || isNaN(Number(r.reps)) || isNaN(Number(r.weight))) {
          Alert.alert('Invalid fields', 'Please enter numeric reps and weight for all sets.');
          return;
        }
      }

      const payload = setRows.map(r => ({
        workout_id: workout.id,
        exercise_id: targetExerciseId,
        set_number: r.setNumber,
        reps: parseInt(r.reps, 10),
        weight: parseFloat(r.weight),
        notes: notesByExercise[exerciseId] || '',
      }));
      const { error } = await api.insertLogs(payload);
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Saved', 'Sets saved successfully');
        setLogs(prev => ({ ...prev, [exerciseId]: [] }));
        setNotesByExercise(prev => ({ ...prev, [exerciseId]: '' }));
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || String(e));
    }
  };

  return {
    logs,
    notesByExercise,
    setLogs,
    setNotesByExercise,
    addSetRow,
    removeSetRow,
    handleSetChange,
    handleNotesChange,
    ensureSetsForExercise,
    toggleSetCompleted,
    saveSetsForExercise,
  };
}
