
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, FlatList, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../lib/profileStore';

export default function TodayTab() {
  const profile = useProfileStore((state) => state.profile);
  const [bodyweight, setBodyweight] = useState('');
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [workoutLoading, setWorkoutLoading] = useState(false);
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [logs, setLogs] = useState<{ [exerciseId: string]: { sets: string; reps: string; weight: string; notes: string } }>({});
  const [savingLog, setSavingLog] = useState(false);

  useEffect(() => {
    if (profile && profile.id) {
      fetchBodyweightEntries();
      fetchTodayWorkout();
    }
  }, [profile?.id]);

  const fetchBodyweightEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bodyweight')
      .select('*')
      .eq('user_id', profile.id)
      .order('logged_at', { ascending: false })
      .limit(7);
    if (!error && data) {
      setEntries(data);
    }
    setLoading(false);
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
    setSubmitting(true);
    const { error } = await supabase.from('bodyweight').insert({
      user_id: profile.id,
      weight: parseFloat(bodyweight),
    });
    setSubmitting(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setBodyweight('');
      fetchBodyweightEntries();
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today</Text>
      <Text style={styles.sectionTitle}>Log Bodyweight</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Enter weight (kg)"
          value={bodyweight}
          onChangeText={setBodyweight}
          keyboardType="numeric"
        />
        <Button title={submitting ? 'Logging...' : 'Log'} onPress={handleLogBodyweight} disabled={submitting} />
      </View>
      <Text style={styles.sectionTitle}>Recent Entries</Text>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Text>{item.logged_at}: {item.weight} kg</Text>
          )}
        />
      )}

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
                style={styles.input}
                placeholder="Sets"
                value={logs[item.id]?.sets || ''}
                onChangeText={(v) => handleLogChange(item.id, 'sets', v)}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Reps"
                value={logs[item.id]?.reps || ''}
                onChangeText={(v) => handleLogChange(item.id, 'reps', v)}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Weight (kg)"
                value={logs[item.id]?.weight || ''}
                onChangeText={(v) => handleLogChange(item.id, 'weight', v)}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Notes (optional)"
                value={logs[item.id]?.notes || ''}
                onChangeText={(v) => handleLogChange(item.id, 'notes', v)}
              />
              <Button
                title={savingLog ? 'Saving...' : 'Save Log'}
                onPress={() => handleSaveLog(item.id)}
                disabled={savingLog}
              />
            </View>
          )}
        />
      ) : (
        <Text>No workout scheduled for today.</Text>
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
});
