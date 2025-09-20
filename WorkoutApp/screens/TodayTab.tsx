
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, ActivityIndicator, Alert, Keyboard, Modal, TouchableOpacity } from 'react-native';
import styles from '../styles/todayStyles';
import ConfirmModal from '../components/ConfirmModal';
import ExerciseCard from '../components/ExerciseCard';
import ModalButtons from '../components/ModalButtons';
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
  const [editingByExercise, setEditingByExercise] = useState<Record<string, boolean>>({});

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
        <TouchableOpacity onPress={() => setShowBodyweightModal(true)} style={styles.bodyweightBtn} activeOpacity={0.9}>
          {IconFeather ? <IconFeather name="user" size={18} color="#fff" /> : <Text style={styles.bodyweightIcon}>🏋️‍♂️</Text>}
        </TouchableOpacity>
      </View>

      {/* Modal for entering bodyweight */}
      <Modal visible={showBodyweightModal} animationType="slide" transparent>
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
              <ModalButtons
                leftLabel="Cancel"
                rightLabel={bodyweightSubmitting ? 'Logging...' : 'Save'}
                onLeftPress={() => setShowBodyweightModal(false)}
                onRightPress={onSaveBodyweight}
                leftColor="#e0e0e0"
                rightColor="#007AFF"
                leftTextColor="#000"
                rightTextColor="#fff"
                rightDisabled={bodyweightSubmitting}
              />
            </View>
          </View>
        </View>
      </Modal>

      {workoutLoading ? (
        <ActivityIndicator />
      ) : (
        <View>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>{splitDayName ? `${splitDayName}` : (dayNameFromWorkout || 'Today')}</Text>
          {(((exercises && exercises.length > 0) ? exercises : splitDayExercises) || []).map((item) => (
            <ExerciseCard
              key={item.id}
              item={item}
              sets={logsHook.logs[item.id] || [{ setNumber: 1, reps: '', weight: '', completed: false }]}
              name={editedNames[item.id] ?? item.name}
              editing={!!editingByExercise[item.id]}
              readonlyMode={isRestDay}
              notes={logsHook.notesByExercise[item.id] || ''}
              onToggleEdit={() => setEditingByExercise(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
              onChangeName={(v) => setEditedNames(prev => ({ ...prev, [item.id]: v }))}
              onChangeSet={(idx, field, v) => logsHook.handleSetChange(item.id, idx, field as any, v)}
              onToggleCompleted={(idx) => logsHook.toggleSetCompleted(item.id, idx)}
              onAddSet={() => logsHook.addSetRow(item.id)}
              onRemoveSet={(idx) => logsHook.removeSetRow(item.id, idx)}
              onChangeNotes={(v) => logsHook.handleNotesChange(item.id, v)}
              onRemoveExercise={() => deleteExercise(item.id)}
              IconFeather={IconFeather}
            />
          ))}
          <TouchableOpacity style={styles.addExerciseBtn} onPress={() => (exercises && exercises.length > 0) ? addBlankExerciseToWorkout() : addBlankExerciseToSplit()} disabled={isRestDay}>
            <Text style={styles.addExerciseText}>+ Add Exercise</Text>
          </TouchableOpacity>
        </View>
      )}

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
