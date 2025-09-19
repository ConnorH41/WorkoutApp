
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, FlatList, ActivityIndicator, Alert, Keyboard, Modal, TouchableOpacity } from 'react-native';
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
  const [logs, setLogs] = useState<{ [exerciseId: string]: { sets: string; reps: string; weight: string; notes: string } }>({});
  const [savingLog, setSavingLog] = useState(false);

  useEffect(() => {
    if (profile && profile.id) {
      fetchTodayWorkout();
    }
  }, [profile?.id]);

  

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

  // Handle logging sets/reps/weight/notes for an exercise
  const handleLogChange = (exerciseId: string, field: string, value: string) => {
    setLogs((prev) => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        [field]: value,
      },
    }));
  };

  const handleSaveLog = async (exerciseId: string) => {
    if (!todayWorkout || !profile || !profile.id) return;
    const log = logs[exerciseId];
    if (!log?.sets || !log?.reps || !log?.weight) {
      Alert.alert('Missing fields', 'Please fill in sets, reps, and weight.');
      return;
    }
    setSavingLog(true);
    const { error } = await supabase.from('logs').insert({
      workout_id: todayWorkout.id,
      exercise_id: exerciseId,
      set_number: parseInt(log.sets),
      reps: parseInt(log.reps),
      weight: parseFloat(log.weight),
      notes: log.notes || '',
    });
    setSavingLog(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Log saved!');
      setLogs((prev) => ({ ...prev, [exerciseId]: { sets: '', reps: '', weight: '', notes: '' } }));
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
    <View style={styles.container}>
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
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.exerciseBox}>
              <Text style={styles.exerciseTitle}>{item.name}</Text>
              <Text>Goal: {item.sets} x {item.reps}</Text>
              <TextInput
                style={[styles.input, styles.textInput]}
                placeholder="Sets"
                value={logs[item.id]?.sets || ''}
                onChangeText={(v) => handleLogChange(item.id, 'sets', v)}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              <TextInput
                style={[styles.input, styles.textInput]}
                placeholder="Reps"
                value={logs[item.id]?.reps || ''}
                onChangeText={(v) => handleLogChange(item.id, 'reps', v)}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              <TextInput
                style={[styles.input, styles.textInput]}
                placeholder="Weight (kg)"
                value={logs[item.id]?.weight || ''}
                onChangeText={(v) => handleLogChange(item.id, 'weight', v)}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              <TextInput
                style={[styles.input, styles.textInputMultiline]}
                placeholder="Notes (optional)"
                value={logs[item.id]?.notes || ''}
                onChangeText={(v) => handleLogChange(item.id, 'notes', v)}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                multiline
                numberOfLines={3}
              />
              <Button
                title={savingLog ? 'Saving...' : 'Save Log'}
                onPress={() => handleSaveLog(item.id)}
                disabled={savingLog}
              />
            </View>
          )}
        />
      ) : todayWorkout ? (
        <View style={{ marginVertical: 16 }}>
          <Text>No exercises for today's workout.</Text>
        </View>
      ) : (
        <View style={{ marginVertical: 16 }}>
          <Text>No workout scheduled for today.</Text>
          <Button title={resting ? 'Logging...' : 'Log Rest Day'} onPress={handleRestDay} disabled={resting} />
        </View>
      )}

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
    </View>
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
