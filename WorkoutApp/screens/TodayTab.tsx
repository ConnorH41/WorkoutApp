
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, ScrollView, ActivityIndicator, Alert, Keyboard, Modal, TouchableOpacity } from 'react-native';
import ModalButtons from '../components/ModalButtons';
import ExerciseCard from '../components/ExerciseCard';
// Import icons at runtime to avoid type errors when package isn't installed in the environment
let IconFeather: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Feather: _Feather } = require('@expo/vector-icons');
  IconFeather = _Feather;
} catch (e) {
  IconFeather = null;
}
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../lib/profileStore';

export default function TodayTab() {
  const profile = useProfileStore((state) => state.profile);
  const [bodyweight, setBodyweight] = useState('');
  
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [isKg, setIsKg] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [workoutLoading, setWorkoutLoading] = useState(false);
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [activeSplitRun, setActiveSplitRun] = useState<any | null>(null);
  const [splitTemplate, setSplitTemplate] = useState<any | null>(null);
  const [splitDayExercises, setSplitDayExercises] = useState<any[]>([]);
  const [splitDayName, setSplitDayName] = useState<string | null>(null);
  const [dayNameFromWorkout, setDayNameFromWorkout] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ [exerciseId: string]: Array<{ setNumber: number; reps: string; weight: string; completed?: boolean; logId?: string | null }> }>({});
  const [notesByExercise, setNotesByExercise] = useState<{ [exerciseId: string]: string }>({});
  const [nameByExercise, setNameByExercise] = useState<{ [exerciseId: string]: string }>({});
  const [editingByExercise, setEditingByExercise] = useState<{ [exerciseId: string]: boolean }>({});
  const [creatingWorkout, setCreatingWorkout] = useState(false);
  const [savingLog, setSavingLog] = useState(false);

  useEffect(() => {
    if (profile && profile.id) {
      fetchTodayWorkout();
      fetchActiveSplitRun();
    }
  }, [profile?.id]);

  // initialize nameByExercise from exercises when they change
  useEffect(() => {
    const map: { [k: string]: string } = {};
    exercises.forEach(ex => { if (ex && ex.id) map[ex.id] = ex.name; });
    splitDayExercises.forEach(ex => { if (ex && ex.id) map[ex.id] = ex.name; });
    setNameByExercise(prev => ({ ...map, ...prev }));
    // ensure editing flags exist (default false)
    const editMap: { [k: string]: boolean } = {};
    Object.keys(map).forEach(k => { editMap[k] = false; });
    setEditingByExercise(prev => ({ ...editMap, ...prev }));
  }, [exercises, splitDayExercises]);

  // Fetch currently active split_run for the user and load the day template/exercises
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

      // load split template to know mode
      const { data: splitData } = await supabase.from('splits').select('*').eq('id', run.split_id).limit(1);
      const split = splitData && splitData.length > 0 ? splitData[0] : null;
      setSplitTemplate(split);

      // load split_days mapping for this split
      const { data: sdData } = await supabase
        .from('split_days')
        .select('*')
        .eq('split_id', run.split_id)
        .order('order_index', { ascending: true });
  const splitDays = sdData || [];
  

      // Determine today's mapped day_id (week-mode only for now)
      // We require an exact weekday match against `split_days.weekday` (0=Sunday..6=Saturday).
      // Note: this uses the device local timezone via `getDay()`; adjust if you need server TZ.
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let mappedDayId: string | null = null;
      if (split && typeof split.mode === 'string' && split.mode.toLowerCase().includes('week')) {
        const wd = today.getDay();
        
        // Require exact match only (no fallback)
        const match = splitDays.find((sd: any) => sd.weekday != null && Number(sd.weekday) === wd);
        
        if (match) {
          mappedDayId = match.day_id;
        } else {
          
          mappedDayId = null;
        }
      }

      if (mappedDayId) {
        
        // fetch day template and exercises
        const { data: dayData } = await supabase.from('days').select('*').eq('id', mappedDayId).limit(1);
        const day = dayData && dayData.length > 0 ? dayData[0] : null;
  setSplitDayName(day ? day.name : null);
  

  const { data: exData } = await supabase.from('exercises').select('*').eq('day_id', mappedDayId).order('created_at', { ascending: true });
  
  setSplitDayExercises(exData || []);
  (exData || []).forEach((ex: any) => ensureSetsForExercise(ex));
      } else {
        
        setSplitDayExercises([]);
        setSplitDayName(null);
      }
    } catch (e) {
      setActiveSplitRun(null);
      setSplitTemplate(null);
      setSplitDayExercises([]);
      setSplitDayName(null);
    }
  };

  

  // Fetch today's workout and exercises
  const fetchTodayWorkout = async () => {
    setWorkoutLoading(true);
    // Get today's date in YYYY-MM-DD
    const today = new Date().toISOString().slice(0, 10);
    // Find today's workout for the user
    if (!profile || !profile.id) {
      setWorkoutLoading(false);
      return;
    }
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', profile.id)
      .eq('date', today)
      .single();
    if (workout && !workoutError) {
      setTodayWorkout(workout);
      // try to infer day name from the workout's day_id
      if (workout.day_id) {
        const { data: dayData } = await supabase.from('days').select('*').eq('id', workout.day_id).limit(1);
        if (dayData && dayData.length > 0) setDayNameFromWorkout(dayData[0].name);
        else setDayNameFromWorkout(null);
      } else {
        setDayNameFromWorkout(null);
      }
      // Fetch exercises for this workout's day_id
      if (workout.day_id) {
        const { data: exercisesData, error: exercisesError } = await supabase
          .from('exercises')
          .select('*')
          .eq('day_id', workout.day_id);
        if (exercisesData && !exercisesError) {
          setExercises(exercisesData);
          exercisesData.forEach((ex: any) => ensureSetsForExercise(ex));
        }
      }
    } else {
      setTodayWorkout(null);
      setExercises([]);
      setDayNameFromWorkout(null);
    }
    setWorkoutLoading(false);
  };

  const handleLogBodyweight = async () => {
    if (!bodyweight || !profile || !profile.id) return;
    const parsed = parseFloat(bodyweight);
    if (Number.isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid weight', 'Please enter a valid weight greater than 0.');
      return;
    }
    // Convert to kg when saving if user entered lbs
    const weightKg = isKg ? parsed : parsed * 0.45359237;
    setSubmitting(true);
    const { error } = await supabase.from('bodyweight').insert({
      user_id: profile.id,
      weight: weightKg,
    });
    setSubmitting(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
  setBodyweight('');
  setShowWeightModal(false);
    }
  };

  // Create a workout for today based on the scheduled day (if any)
  const createWorkoutFromScheduledDay = async () => {
    if (!profile || !profile.id || !splitDayName) return null;
    setCreatingWorkout(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const payload: any = { user_id: profile.id, date: today };
      // If we have a mapped split day name and the day exists we can attach day_id after fetching it
      // Try to resolve day by name
      if (splitDayName) {
        const { data: dayData } = await supabase.from('days').select('*').eq('name', splitDayName).limit(1);
        if (dayData && dayData.length > 0) payload.day_id = dayData[0].id;
      }
      const { data, error } = await supabase.from('workouts').insert([payload]).select().limit(1);
      setCreatingWorkout(false);
      if (error) {
        Alert.alert('Error', error.message);
        return null;
      }
      if (data && data.length > 0) {
        const w = data[0];
        // refresh today's workout state
        setTodayWorkout(w);
        // fetch exercises for the workout's day_id if set
        if (w.day_id) {
          const { data: exData } = await supabase.from('exercises').select('*').eq('day_id', w.day_id);
          setExercises(exData || []);
          (exData || []).forEach((ex: any) => ensureSetsForExercise(ex));
        }
        return w;
      }
      return null;
    } catch (e: any) {
      setCreatingWorkout(false);
      return null;
    }
  };

  // Create a new exercise row when the user renames a card to a new name
  const createExercise = async (originalExercise: any, newName: string) => {
    if (!profile || !profile.id) return null;
    // Determine day_id to attach the exercise to: prefer today's workout.day_id, fallback to original's day_id
    const dayId = todayWorkout?.day_id || originalExercise?.day_id || null;
    try {
      const payload: any = {
        name: newName,
        user_id: profile.id,
        day_id: dayId,
        sets: originalExercise?.sets || 3,
        reps: originalExercise?.reps || 8,
      };
      const { data, error } = await supabase.from('exercises').insert([payload]).select().limit(1);
      if (error) {
        Alert.alert('Error', error.message);
        return null;
      }
      if (data && data.length > 0) {
        const ex = data[0];
        // update local exercises list
        setExercises(prev => [...prev, ex]);
        ensureSetsForExercise(ex);
        return ex;
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || String(e));
    }
    return null;
  };

  // Manage per-exercise set rows
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

  const confirmRemoveSetRow = (exerciseId: string, index: number) => {
    Alert.alert(
      'Remove Set',
      'Are you sure you want to remove this set?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeSetRow(exerciseId, index) },
      ],
    );
  };

  const handleSetChange = (exerciseId: string, index: number, field: 'reps' | 'weight', value: string) => {
    setLogs(prev => {
      const arr = prev[exerciseId] ? [...prev[exerciseId]] : [];
      arr[index] = { ...(arr[index] || { setNumber: index + 1, reps: '', weight: '' }), [field]: value } as any;
      return { ...prev, [exerciseId]: arr };
    });
  };

  // Toggle a single set as completed/uncompleted — writes/updates a single log row in the DB
  const toggleSetCompleted = async (exerciseId: string, index: number) => {
    const setRow = (logs[exerciseId] || [])[index];
    if (!setRow) return;
    // validate numeric fields before marking complete
    if (!setRow.reps || !setRow.weight || isNaN(Number(setRow.reps)) || isNaN(Number(setRow.weight))) {
      Alert.alert('Invalid fields', 'Please enter numeric reps and weight for this set before marking it complete.');
      return;
    }
    const willComplete = !setRow.completed;
    try {
      // ensure workout exists
      let workout = todayWorkout;
      if (!workout) {
        workout = await createWorkoutFromScheduledDay();
        if (!workout) {
          Alert.alert('Error', 'Could not create workout for today');
          return;
        }
      }
      // determine exercise id (handle renamed -> new exercise)
      let targetExerciseId = exerciseId;
      const displayedName = nameByExercise[exerciseId];
      const originalExercise = exercises.find(e => e.id === exerciseId) || splitDayExercises.find(e => e.id === exerciseId);
      if (displayedName && originalExercise && displayedName.trim() !== originalExercise.name) {
        const created = await createExercise(originalExercise, displayedName.trim());
        if (created && created.id) targetExerciseId = created.id;
      }

      // if there's an existing log id, update; else insert
      if (setRow.logId) {
        const { error } = await supabase.from('logs').update({ completed: willComplete }).eq('id', setRow.logId);
        if (error) throw error;
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
        const { data, error } = await supabase.from('logs').insert([payload]).select().limit(1);
        if (error) throw error;
        if (data && data.length > 0) {
          // store returned log id
          setLogs(prev => {
            const arr = prev[exerciseId] ? [...prev[exerciseId]] : [];
            arr[index] = { ...(arr[index] || {}), completed: true, logId: data[0].id } as any;
            return { ...prev, [exerciseId]: arr };
          });
        }
      } else {
        // unchecking without logId — nothing to do
        // If unchecking an existing saved log (should have logId), it was handled above
        setLogs(prev => {
          const arr = prev[exerciseId] ? [...prev[exerciseId]] : [];
          arr[index] = { ...(arr[index] || {}), completed: false } as any;
          return { ...prev, [exerciseId]: arr };
        });
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || String(e));
    }
  };

  const handleNotesChange = (exerciseId: string, value: string) => {
    setNotesByExercise(prev => ({ ...prev, [exerciseId]: value }));
  };

  // Remove exercise locally (from either exercises or splitDayExercises) and clean related local state
  const removeExerciseLocal = (exerciseId: string) => {
    setExercises(prev => prev.filter(e => e.id !== exerciseId));
    setSplitDayExercises(prev => prev.filter(e => e.id !== exerciseId));
    setLogs(prev => {
      const copy: any = { ...prev };
      delete copy[exerciseId];
      return copy;
    });
    setNameByExercise(prev => {
      const copy: any = { ...prev };
      delete copy[exerciseId];
      return copy;
    });
    setEditingByExercise(prev => {
      const copy: any = { ...prev };
      delete copy[exerciseId];
      return copy;
    });
    setNotesByExercise(prev => {
      const copy: any = { ...prev };
      delete copy[exerciseId];
      return copy;
    });
  };

  const deleteExercisePermanent = async (exerciseId: string) => {
    if (!profile || !profile.id) return;
    try {
      const { error } = await supabase.from('exercises').delete().eq('id', exerciseId);
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        removeExerciseLocal(exerciseId);
        Alert.alert('Deleted', 'Exercise deleted permanently');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || String(e));
    }
  };

  const confirmRemoveExercise = (item: any) => {
    if (!item || !item.id) return;
    if (String(item.id).startsWith('tmp')) {
      // simple confirm for temporary items
      Alert.alert('Remove Exercise', 'Remove this temporary exercise?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeExerciseLocal(item.id) },
      ]);
      return;
    }
    // For persisted items give option to remove locally or delete permanently
    Alert.alert(
      'Remove Exercise',
      'Remove this exercise from the list or delete it permanently from your exercises?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove Locally', onPress: () => removeExerciseLocal(item.id) },
        { text: 'Delete Permanently', style: 'destructive', onPress: () => deleteExercisePermanent(item.id) },
      ],
    );
  };

  // Ensure `logs` has the configured number of empty set rows for an exercise
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

  // Add a blank temporary exercise to today's workout (local only until saved)
  const addBlankExerciseToWorkout = () => {
    if (!profile || !profile.id) return;
    const id = `tmp-${Date.now()}`;
    const newEx: any = { id, name: 'Exercise Name', user_id: profile.id, day_id: todayWorkout?.day_id || null, sets: 1, reps: '' };
    setExercises(prev => [...prev, newEx]);
    setNameByExercise(prev => ({ ...prev, [id]: 'Exercise Name' }));
    // do not auto-enable editing to avoid opening the keyboard
    setEditingByExercise(prev => ({ ...prev, [id]: false }));
    ensureSetsForExercise(newEx);
  };

  // Add a blank temporary exercise to the scheduled split day list (local only until saved)
  const addBlankExerciseToSplit = () => {
    if (!profile || !profile.id) return;
    const id = `tmp-s-${Date.now()}`;
    const dayId = splitDayExercises && splitDayExercises.length > 0 ? splitDayExercises[0].day_id : null;
    const newEx: any = { id, name: 'Exercise Name', user_id: profile.id, day_id: dayId, sets: 1, reps: '' };
    setSplitDayExercises(prev => [...prev, newEx]);
    setNameByExercise(prev => ({ ...prev, [id]: 'Exercise Name' }));
    // do not auto-enable editing to avoid opening the keyboard
    setEditingByExercise(prev => ({ ...prev, [id]: false }));
    ensureSetsForExercise(newEx);
  };

  // Save sets for an exercise; create workout first if missing
  const saveSetsForExercise = async (exerciseId: string) => {
    try {
      let workout = todayWorkout;
      if (!workout) {
        workout = await createWorkoutFromScheduledDay();
        if (!workout) {
          Alert.alert('Error', 'Could not create workout for today');
          return;
        }
      }
      // If the displayed name has been changed, create a new exercise and use its id
      const displayedName = nameByExercise[exerciseId];
      const originalExercise = exercises.find(e => e.id === exerciseId) || splitDayExercises.find(e => e.id === exerciseId);
      let targetExerciseId = exerciseId;
      if (displayedName && originalExercise && displayedName.trim() !== originalExercise.name) {
        const created = await createExercise(originalExercise, displayedName.trim());
        if (created && created.id) {
          targetExerciseId = created.id;
        }
      }
      const setRows = logs[exerciseId] || [];
      if (setRows.length === 0) {
        Alert.alert('No sets', 'Please add at least one set to save.');
        return;
      }
      // validate
      for (const r of setRows) {
        if (r.reps === '' || r.weight === '' || isNaN(Number(r.reps)) || isNaN(Number(r.weight))) {
          Alert.alert('Invalid fields', 'Please enter numeric reps and weight for all sets.');
          return;
        }
      }
      setSavingLog(true);
      const payload = setRows.map(r => ({
        workout_id: workout.id,
        exercise_id: targetExerciseId,
        set_number: r.setNumber,
        reps: parseInt(r.reps, 10),
        weight: parseFloat(r.weight),
        notes: notesByExercise[exerciseId] || '',
      }));
      const { error } = await supabase.from('logs').insert(payload);
      setSavingLog(false);
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Saved', 'Sets saved successfully');
        setLogs(prev => ({ ...prev, [exerciseId]: [] }));
        setNotesByExercise(prev => ({ ...prev, [exerciseId]: '' }));
      }
    } catch (e: any) {
      setSavingLog(false);
      Alert.alert('Error', e.message || String(e));
    }
  };


  

  // Complete/Rest button handlers
  const [completing, setCompleting] = useState(false);
  const [resting, setResting] = useState(false);

  const handleCompleteWorkout = async () => {
    if (!todayWorkout) return;
    setCompleting(true);
    const { error } = await supabase
      .from('workouts')
      .update({ completed: true })
      .eq('id', todayWorkout.id);
    setCompleting(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Workout Complete', 'Great job!');
      fetchTodayWorkout();
    }
  };

  const handleRestDay = async () => {
    if (!profile || !profile.id) return;
    setResting(true);
    // Insert a rest workout for today if not already present
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from('workouts')
      .insert({ user_id: profile.id, date: today, completed: true });
    setResting(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Rest Day', 'Rest day logged.');
      fetchTodayWorkout();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        {/* Compute weekday abbreviation + day name (prefer splitDayName, then workout day name) */}
        {(() => {
          const wdNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const today = new Date();
          const abbrev = wdNames[today.getDay()];
          const dayLabel = splitDayName || dayNameFromWorkout || 'Today';
          return <Text style={[styles.title, { marginBottom: 0 }]}>{`${abbrev} - ${dayLabel}`}</Text>;
        })()}
        <TouchableOpacity onPress={() => setShowWeightModal(true)} style={styles.bodyweightBtn} activeOpacity={0.9}>
          {IconFeather ? <IconFeather name="user" size={18} color="#fff" /> : <Text style={styles.bodyweightIcon}>🏋️‍♂️</Text>}
        </TouchableOpacity>
      </View>

      {/* Modal for entering bodyweight */}
      <Modal visible={showWeightModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Enter Today's Bodyweight</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <TextInput
                  style={[styles.input, styles.textInput, { marginBottom: 0 }]}
                  placeholder={isKg ? 'Weight (kg)' : 'Weight (lbs)'}
                  value={bodyweight}
                  onChangeText={setBodyweight}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              <View style={styles.unitSwitchContainer}>
                <TouchableOpacity
                  style={[styles.unitToggleBtn, isKg ? styles.unitToggleBtnActive : null]}
                  onPress={() => setIsKg(true)}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.unitToggleText, isKg ? styles.unitToggleTextActive : null]}>kg</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitToggleBtn, !isKg ? styles.unitToggleBtnActive : null]}
                  onPress={() => setIsKg(false)}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.unitToggleText, !isKg ? styles.unitToggleTextActive : null]}>lbs</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View>
              {/* Modal action buttons (shared component) */}
              <ModalButtons
                leftLabel="Cancel"
                rightLabel={submitting ? 'Logging...' : 'Save'}
                onLeftPress={() => setShowWeightModal(false)}
                onRightPress={handleLogBodyweight}
                leftColor="#e0e0e0"
                rightColor="#007AFF"
                leftTextColor="#000"
                rightTextColor="#fff"
                rightDisabled={submitting}
              />
            </View>
          </View>
        </View>
      </Modal>

      {workoutLoading ? (
        <ActivityIndicator />
      ) : todayWorkout && exercises.length > 0 ? (
        <View>
          {exercises.map((item) => (
            <ExerciseCard
              key={item.id}
              item={item}
              sets={logs[item.id] || [{ setNumber: 1, reps: '', weight: '', completed: false }]}
              name={nameByExercise[item.id]}
              editing={!!editingByExercise[item.id]}
              notes={notesByExercise[item.id]}
              onToggleEdit={() => setEditingByExercise(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
              onChangeName={(v) => setNameByExercise(prev => ({ ...prev, [item.id]: v }))}
              onChangeSet={(idx, field, v) => handleSetChange(item.id, idx, field as any, v)}
              onToggleCompleted={(idx) => toggleSetCompleted(item.id, idx)}
              onAddSet={() => addSetRow(item.id)}
              onRemoveSet={(idx) => confirmRemoveSetRow(item.id, idx)}
              onChangeNotes={(v) => handleNotesChange(item.id, v)}
              onRemoveExercise={() => confirmRemoveExercise(item)}
              IconFeather={IconFeather}
            />
          ))}
          <TouchableOpacity style={styles.addExerciseBtn} onPress={addBlankExerciseToWorkout}>
            <Text style={styles.addExerciseText}>+ Add Exercise</Text>
          </TouchableOpacity>
        </View>
  ) : todayWorkout ? (
        <View style={{ marginVertical: 16 }}>
          <Text>No exercises for today's workout.</Text>
        </View>
      ) : (splitDayExercises.length > 0 ? (
        <View>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>{splitDayName ? `Scheduled: ${splitDayName}` : 'Scheduled Day'}</Text>
          <Button title={todayWorkout ? 'Edit Workout' : creatingWorkout ? 'Creating...' : 'Create Today\'s Workout'} onPress={createWorkoutFromScheduledDay} disabled={creatingWorkout || !!todayWorkout} />
          {splitDayExercises.map((item) => (
            <ExerciseCard
              key={item.id}
              item={item}
              sets={logs[item.id] || [{ setNumber: 1, reps: '', weight: '' }]}
              name={nameByExercise[item.id]}
              editing={!!editingByExercise[item.id]}
              notes={notesByExercise[item.id]}
              onToggleEdit={() => setEditingByExercise(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
              onChangeName={(v) => setNameByExercise(prev => ({ ...prev, [item.id]: v }))}
              onChangeSet={(idx, field, v) => handleSetChange(item.id, idx, field as any, v)}
              onToggleCompleted={(idx) => toggleSetCompleted(item.id, idx)}
              onAddSet={() => addSetRow(item.id)}
              onRemoveSet={(idx) => confirmRemoveSetRow(item.id, idx)}
              onChangeNotes={(v) => handleNotesChange(item.id, v)}
              onRemoveExercise={() => confirmRemoveExercise(item)}
              IconFeather={IconFeather}
            />
          ))}
          <TouchableOpacity style={styles.addExerciseBtn} onPress={addBlankExerciseToSplit}>
            <Text style={styles.addExerciseText}>+ Add Exercise</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ marginVertical: 16 }}>
          <Text>No workout scheduled for today.</Text>
          <Button title={resting ? 'Logging...' : 'Log Rest Day'} onPress={handleRestDay} disabled={resting} />
        </View>
      ))}

      {todayWorkout && !todayWorkout.completed && (
        <>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleCompleteWorkout}
            disabled={completing}
            style={[styles.primaryButton, completing ? styles.primaryButtonDisabled : null]}
          >
            <Text style={[styles.primaryButtonText, completing ? styles.primaryButtonTextDisabled : null]}>{completing ? 'Completing...' : 'Mark Workout Complete'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleRestDay}
            disabled={resting}
            style={[styles.secondaryButton, resting ? styles.secondaryButtonDisabled : null]}
          >
            <Text style={[styles.secondaryButtonText, resting ? styles.secondaryButtonTextDisabled : null]}>{resting ? 'Logging...' : 'Mark as Rest Day'}</Text>
          </TouchableOpacity>
        </>
      )}
      {todayWorkout && todayWorkout.completed && (
        <Text style={{ color: 'green', marginTop: 12 }}>Workout marked as complete!</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 4,
    flex: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  exerciseBox: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
    paddingBottom: 40,
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  exerciseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
    backgroundColor: '#eee',
  },
  modalButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  textInput: {
    height: 40,
    fontSize: 16,
    paddingHorizontal: 8,
    paddingVertical: 8,
    textAlignVertical: 'center',
  },
  textInputMultiline: {
    minHeight: 60,
    fontSize: 16,
    paddingHorizontal: 8,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  unitSwitchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    minWidth: 96,
    height: 40,
  },
  unitLabel: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  unitToggleBtn: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
  },
  unitToggleBtnActive: {
    backgroundColor: '#007AFF',
  },
  unitToggleText: {
    color: '#333',
    fontWeight: '600',
  },
  unitToggleTextActive: {
    color: '#fff',
  },
  goalBadge: {
    position: 'absolute',
    right: 10,
    top: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  goalBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  bodyweightBtn: {
    marginLeft: 'auto',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyweightIcon: {
    fontSize: 20,
    color: '#fff',
  },
  removeBtn: {
    marginLeft: 8,
    paddingHorizontal: 4,
    paddingVertical: 0,
    // align vertically to center of inputs
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
  },
  removeBtnText: {
    color: '#ff3b30',
    fontWeight: '700',
    fontSize: 18,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 44,
  },
  setLabel: {
    width: 64,
    fontWeight: '600',
    marginRight: 8,
    height: 40,
    lineHeight: 40,
  },
  inputWeight: {
    width: 100,
    marginRight: 8,
    height: 40,
    paddingVertical: 6,
    textAlignVertical: 'center',
  },
  inputReps: {
    width: 80,
    marginRight: 8,
    height: 40,
    paddingVertical: 6,
    textAlignVertical: 'center',
  },
  addSetLink: {
    marginBottom: 8,
  },
  addSetText: {
    color: '#007AFF',
    fontWeight: '700',
  },
  addExerciseBtn: {
    marginTop: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
  },
  addExerciseText: {
    color: '#007AFF',
    fontWeight: '700',
  },
  notesInput: {
    marginTop: 8,
  },
  saveButtonWrap: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  exerciseTitleInput: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    paddingVertical: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  editPencil: {
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPencilText: {
    fontSize: 14,
  },
  removeExerciseBtn: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeExerciseText: {
    color: '#ff3b30',
    fontWeight: '600',
    fontSize: 12,
  },
  removeExerciseAbsolute: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxText: {
    color: '#fff',
    fontWeight: '700',
  },
  inputDisabled: {
    backgroundColor: '#f2f2f2',
    color: '#999',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  primaryButtonDisabled: {
    backgroundColor: '#90C3FF',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  primaryButtonTextDisabled: {
    color: '#f0f9ff',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  secondaryButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    color: '#333',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButtonTextDisabled: {
    color: '#666',
  },
});
