
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, ScrollView, ActivityIndicator, Alert, Keyboard, Modal, TouchableOpacity } from 'react-native';
import ModalButtons from '../components/ModalButtons';
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
  const [logs, setLogs] = useState<{ [exerciseId: string]: Array<{ setNumber: number; reps: string; weight: string }> }>({});
  const [notesByExercise, setNotesByExercise] = useState<{ [exerciseId: string]: string }>({});
  const [creatingWorkout, setCreatingWorkout] = useState(false);
  const [savingLog, setSavingLog] = useState(false);

  useEffect(() => {
    if (profile && profile.id) {
      fetchTodayWorkout();
      fetchActiveSplitRun();
    }
  }, [profile?.id]);

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
  console.debug('Active split_run loaded:', run);

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
  console.debug('Loaded split_days for split:', run.split_id, splitDays);

      // Determine today's mapped day_id (week-mode only for now)
      // We require an exact weekday match against `split_days.weekday` (0=Sunday..6=Saturday).
      // Note: this uses the device local timezone via `getDay()`; adjust if you need server TZ.
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let mappedDayId: string | null = null;
      if (split && typeof split.mode === 'string' && split.mode.toLowerCase().includes('week')) {
        const wd = today.getDay();
        console.debug('Today weekday index (0=Sun..6=Sat):', wd);
        // Require exact match only (no fallback)
        const match = splitDays.find((sd: any) => sd.weekday != null && Number(sd.weekday) === wd);
        console.debug('Matched split_day for weekday lookup:', match);
        if (match) {
          mappedDayId = match.day_id;
        } else {
          console.debug(`No exact split_days.weekday match for today (weekday=${wd}).`);
          mappedDayId = null;
        }
      }

      if (mappedDayId) {
        console.debug('Mapped day id for today:', mappedDayId);
        // fetch day template and exercises
        const { data: dayData } = await supabase.from('days').select('*').eq('id', mappedDayId).limit(1);
        const day = dayData && dayData.length > 0 ? dayData[0] : null;
  setSplitDayName(day ? day.name : null);
  console.debug('Resolved split day:', day);

  const { data: exData } = await supabase.from('exercises').select('*').eq('day_id', mappedDayId).order('created_at', { ascending: true });
  console.debug('Fetched exercises for day_id', mappedDayId, exData);
  setSplitDayExercises(exData || []);
      } else {
        console.debug('No mapped day found for this split run. splitDays:', splitDays);
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
      // Fetch exercises for this workout's day_id
      if (workout.day_id) {
        const { data: exercisesData, error: exercisesError } = await supabase
          .from('exercises')
          .select('*')
          .eq('day_id', workout.day_id);
        if (exercisesData && !exercisesError) {
          setExercises(exercisesData);
        }
      }
    } else {
      setTodayWorkout(null);
      setExercises([]);
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
        }
        return w;
      }
      return null;
    } catch (e: any) {
      setCreatingWorkout(false);
      return null;
    }
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
        exercise_id: exerciseId,
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
      <Text style={styles.title}>Today</Text>
      <Text style={styles.sectionTitle}>Bodyweight</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowWeightModal(true)} activeOpacity={0.9}>
          <Text style={styles.addButtonText}>Enter Bodyweight</Text>
        </TouchableOpacity>
      </View>
      {/* Recent entries temporarily removed */}

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

      <Text style={styles.sectionTitle}>Today's Workout</Text>
      {workoutLoading ? (
        <ActivityIndicator />
      ) : todayWorkout && exercises.length > 0 ? (
        <View>
          {exercises.map((item) => (
            <View key={item.id} style={styles.exerciseBox}>
              <Text style={styles.exerciseTitle}>{item.name}</Text>
              <Text>Goal: {item.sets} x {item.reps}</Text>
              {(logs[item.id] || [{ setNumber: 1, reps: '', weight: '' }]).map((s, idx) => (
                <View key={`${item.id}-set-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ width: 56, fontWeight: '600' }}>{`Set ${s.setNumber}`}</Text>
                  <TextInput style={[styles.input, { width: 100 }]} placeholder="Weight" keyboardType="numeric" value={s.weight} onChangeText={(v) => handleSetChange(item.id, idx, 'weight', v)} />
                  <TextInput style={[styles.input, { width: 80, marginLeft: 8 }]} placeholder="Reps" keyboardType="numeric" value={s.reps} onChangeText={(v) => handleSetChange(item.id, idx, 'reps', v)} />
                  <TouchableOpacity onPress={() => removeSetRow(item.id, idx)} style={{ marginLeft: 8 }}>
                    <Text style={{ color: '#ff3b30' }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={() => addSetRow(item.id)} style={{ marginBottom: 8 }}>
                <Text style={{ color: '#007AFF', fontWeight: '700' }}>+ Add Set</Text>
              </TouchableOpacity>
              <TextInput style={[styles.input, styles.textInputMultiline]} placeholder="Notes (optional)" value={notesByExercise[item.id] || ''} onChangeText={(v) => handleNotesChange(item.id, v)} multiline numberOfLines={3} />
              <Button title={savingLog ? 'Saving...' : 'Save Sets'} onPress={() => saveSetsForExercise(item.id)} disabled={savingLog} />
            </View>
          ))}
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
            <View key={item.id} style={styles.exerciseBox}>
              <Text style={styles.exerciseTitle}>{item.name}</Text>
              <Text>Goal: {item.sets} x {item.reps}</Text>
              {/* Per-set rows */}
              {(logs[item.id] || [{ setNumber: 1, reps: '', weight: '' }]).map((s, idx) => (
                <View key={`${item.id}-set-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ width: 56, fontWeight: '600' }}>{`Set ${s.setNumber}`}</Text>
                  <TextInput style={[styles.input, { width: 100 }]} placeholder="Weight" keyboardType="numeric" value={s.weight} onChangeText={(v) => handleSetChange(item.id, idx, 'weight', v)} />
                  <TextInput style={[styles.input, { width: 80, marginLeft: 8 }]} placeholder="Reps" keyboardType="numeric" value={s.reps} onChangeText={(v) => handleSetChange(item.id, idx, 'reps', v)} />
                  <TouchableOpacity onPress={() => removeSetRow(item.id, idx)} style={{ marginLeft: 8 }}>
                    <Text style={{ color: '#ff3b30' }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={() => addSetRow(item.id)} style={{ marginBottom: 8 }}>
                <Text style={{ color: '#007AFF', fontWeight: '700' }}>+ Add Set</Text>
              </TouchableOpacity>
              <TextInput style={[styles.input, styles.textInputMultiline]} placeholder="Notes (optional)" value={notesByExercise[item.id] || ''} onChangeText={(v) => handleNotesChange(item.id, v)} multiline numberOfLines={3} />
              <Button title={savingLog ? 'Saving...' : 'Save Sets'} onPress={() => saveSetsForExercise(item.id)} disabled={savingLog} />
            </View>
          ))}
        </View>
      ) : (
        <View style={{ marginVertical: 16 }}>
          <Text>No workout scheduled for today.</Text>
          <Button title={resting ? 'Logging...' : 'Log Rest Day'} onPress={handleRestDay} disabled={resting} />
        </View>
      ))}

      {todayWorkout && !todayWorkout.completed && (
        <Button
          title={completing ? 'Completing...' : 'Mark Workout Complete'}
          onPress={handleCompleteWorkout}
          disabled={completing}
        />
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
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  exerciseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
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
});
