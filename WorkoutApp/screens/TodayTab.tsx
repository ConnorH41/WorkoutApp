
import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import styles from '../styles/todayStyles';
import ModalButtons from '../components/ModalButtons';
import ConfirmModal from '../components/ConfirmModal';
import ExerciseCard from '../components/ExerciseCard';
import BodyweightModal from '../components/BodyweightModal';
import WorkoutControls from '../components/WorkoutControls';
import { useTodayWorkout } from '../hooks/useTodayWorkout';
import { useExerciseLogs } from '../hooks/useExerciseLogs';
import * as api from '../lib/api';



export default function TodayTab() {
  const {
    profile,
    workoutLoading,
    todayWorkout,
    exercises,
    splitDayExercises,
    splitDayName,
    dayNameFromWorkout,
    fetchTodayWorkout,
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
  } = useTodayWorkout();

  const [editedNames, setEditedNames] = useState<Record<string, string>>({});

  const logsHook = useExerciseLogs({
    createWorkoutFromScheduledDay,
    createExercise,
    getTodayWorkout: () => todayWorkout,
    getExercises: () => exercises,
    getSplitDayExercises: () => splitDayExercises,
    getNameByExercise: (id: string) => {
      if (editedNames[id]) return editedNames[id];
      const ex = exercises.find(e => e.id === id) || splitDayExercises.find(e => e.id === id);
      return ex ? ex.name : undefined;
    },
  });

  // Ensure default set rows exist for all exercises
  useEffect(() => {
    (exercises || []).forEach(ex => logsHook.ensureSetsForExercise(ex));
    (splitDayExercises || []).forEach(ex => logsHook.ensureSetsForExercise(ex));
  }, [exercises, splitDayExercises]);

  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showRestConfirm, setShowRestConfirm] = useState(false);
  const [showBodyweightModal, setShowBodyweightModal] = useState(false);
  const [bodyweight, setBodyweight] = useState('');
  const [isKg, setIsKg] = useState(true);
  const [bodyweightSubmitting, setBodyweightSubmitting] = useState(false);

  const onSaveBodyweight = async () => {
    if (!profile || !profile.id) return;
    const parsed = parseFloat(bodyweight);
    if (isNaN(parsed)) {
      Alert.alert('Invalid weight', 'Enter a numeric weight value');
      return;
    }
    setBodyweightSubmitting(true);
    try {
      await api.insertBodyweight({ user_id: profile.id, weight: parsed });
      setShowBodyweightModal(false);
      setBodyweight('');
    } catch (e: any) {
      Alert.alert('Error', e.message || String(e));
    } finally {
      setBodyweightSubmitting(false);
    }
  };

  useEffect(() => {
    fetchTodayWorkout();
  }, []);

  if (workoutLoading) return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 64 }}>
      <Text style={styles.title}>Today</Text>

      {splitDayName ? <Text style={styles.sectionTitle}>{`Scheduled: ${splitDayName}`}</Text> : null}
      {dayNameFromWorkout ? <Text style={styles.sectionTitle}>{`Day: ${dayNameFromWorkout}`}</Text> : null}

      <View>
        {(exercises || []).map((ex) => (
          <View key={ex.id}>
            <ExerciseCard
              item={ex}
              sets={logsHook.logs[ex.id] || []}
              name={editedNames[ex.id] ?? ex.name}
              editing={false}
              notes={logsHook.notesByExercise[ex.id] || ''}
              onToggleEdit={() => { /* noop */ }}
              onChangeName={(v) => setEditedNames(prev => ({ ...prev, [ex.id]: v }))}
              onChangeSet={(idx, field, val) => logsHook.handleSetChange(ex.id, idx, field, val)}
              onToggleCompleted={(idx) => logsHook.toggleSetCompleted(ex.id, idx)}
              onAddSet={() => logsHook.addSetRow(ex.id)}
              onRemoveSet={(idx) => logsHook.removeSetRow(ex.id, idx)}
              onChangeNotes={(v) => logsHook.handleNotesChange(ex.id, v)}
              onRemoveExercise={() => deleteExercise(ex.id)}
              IconFeather={IconFeather}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 12 }}>
              <TouchableOpacity onPress={() => logsHook.saveSetsForExercise(ex.id)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#007AFF', marginRight: 8 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save Sets</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => logsHook.toggleSetCompleted(ex.id, 0)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#e0e0e0' }}>
                <Text style={{ color: '#333', fontWeight: '700' }}>Toggle First Set</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 12 }}>
        <ModalButtons
          leftLabel="Add Exercise"
          rightLabel="Create From Schedule"
          onLeftPress={() => addBlankExerciseToWorkout()}
          onRightPress={() => createWorkoutFromScheduledDay()}
          leftColor="#e0e0e0"
          rightColor="#007AFF"
          leftTextColor="#333"
          rightTextColor="#fff"
        />
      </View>

      <View style={{ marginTop: 12 }}>
        <WorkoutControls
          todayWorkout={todayWorkout}
          isRestDay={!!isRestDay}
          completing={completing}
          resting={resting}
          onConfirmComplete={() => setShowCompleteConfirm(true)}
          onConfirmRestToggle={() => setShowRestConfirm(true)}
        />
      </View>
      
      <ConfirmModal
        visible={showCompleteConfirm}
        title="Mark Workout Complete?"
        message="This will mark today's workout as complete. Continue?"
        onConfirm={async () => { setShowCompleteConfirm(false); await markComplete(); }}
        onCancel={() => setShowCompleteConfirm(false)}
      />

      <ConfirmModal
        visible={showRestConfirm}
        title={isRestDay ? 'Unmark Rest Day?' : 'Mark Rest Day?'}
        message={isRestDay ? "This will unmark today as a rest day." : "This will mark today as a rest day."}
        confirmLabel={isRestDay ? 'Unmark' : 'Mark'}
        onConfirm={async () => { setShowRestConfirm(false); if (isRestDay) await unmarkRestDay(); else await markRestDay(); }}
        onCancel={() => setShowRestConfirm(false)}
      />

      <BodyweightModal
        visible={showBodyweightModal}
        bodyweight={bodyweight}
        isKg={isKg}
        submitting={bodyweightSubmitting}
        onClose={() => setShowBodyweightModal(false)}
        onChangeWeight={setBodyweight}
        onToggleKg={setIsKg}
        onSave={onSaveBodyweight}
      />
    </ScrollView>
  );
}

// Import icons at runtime to avoid type errors when package isn't installed in the environment
let IconFeather: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  IconFeather = require('@expo/vector-icons').Feather;
} catch (e) {
  IconFeather = null;
}
