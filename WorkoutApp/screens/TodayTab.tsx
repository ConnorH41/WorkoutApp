
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, ScrollView, ActivityIndicator, Alert, Keyboard, Modal, TouchableOpacity } from 'react-native';
import ModalButtons from '../components/ModalButtons';
import ConfirmModal from '../components/ConfirmModal';
import ExerciseCard from '../components/ExerciseCard';
import BodyweightModal from '../components/BodyweightModal';
import WorkoutControls from '../components/WorkoutControls';
// Import icons at runtime to avoid type errors when package isn't installed in the environment
let IconFeather: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Feather: _Feather } = require('@expo/vector-icons');
  IconFeather = _Feather;
} catch (e) {
  IconFeather = null;
}
import * as api from '../lib/api';
import { useProfileStore } from '../lib/profileStore';
import { useTodayWorkout } from '../hooks/useTodayWorkout';
import { useExerciseLogs } from '../hooks/useExerciseLogs';
import ExerciseList from '../components/ExerciseList';

export default function TodayTab() {
  const profile = useProfileStore((state) => state.profile);
  const [bodyweight, setBodyweight] = useState('');

  const [showWeightModal, setShowWeightModal] = useState(false);
  const [isKg, setIsKg] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    profile: hookProfile,
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
    setTodayWorkout,
    setExercises,
    setSplitDayExercises,
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

  // useExerciseLogs will be initialized after helper functions are declared
  const [nameByExercise, setNameByExercise] = useState<{ [exerciseId: string]: string }>({});
  const [editingByExercise, setEditingByExercise] = useState<{ [exerciseId: string]: boolean }>({});
  const [savingLog, setSavingLog] = useState(false);

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
    const { error } = await api.insertBodyweight({ user_id: profile.id, weight: weightKg });
    setSubmitting(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
  setBodyweight('');
  setShowWeightModal(false);
    }
  };

  // Use hook-provided workout/exercise actions (already destructured above)

  // Initialize exercise logs hook with callbacks that need local helpers
  const { logs, notesByExercise, setLogs, setNotesByExercise, addSetRow, removeSetRow, handleSetChange, handleNotesChange, ensureSetsForExercise, toggleSetCompleted, saveSetsForExercise } = useExerciseLogs({
    createWorkoutFromScheduledDay,
    createExercise,
    getTodayWorkout: () => todayWorkout,
    getExercises: () => exercises,
    getSplitDayExercises: () => splitDayExercises,
    getNameByExercise: (id: string) => nameByExercise[id],
  });

  // Manage per-exercise set rows

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

  // Toggle a single set as completed/uncompleted — handled by hook

  // notes handled by useExerciseLogs

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
      const ok = await deleteExercise(exerciseId);
      if (!ok) {
        Alert.alert('Error', 'Could not remove exercise');
      } else {
        removeExerciseLocal(exerciseId);
        Alert.alert('Removed', 'Exercise removed permanently');
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
    // For persisted items give option to remove locally or remove permanently
    Alert.alert(
      'Remove Exercise',
      'Remove this exercise from the list or remove it permanently from your exercises?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove Locally', onPress: () => removeExerciseLocal(item.id) },
        { text: 'Remove Permanently', style: 'destructive', onPress: () => deleteExercisePermanent(item.id) },
      ],
    );
  };

  // Ensure `logs` has the configured number of empty set rows for an exercise
  // ensureSetsForExercise moved to useExerciseLogs

  // Add a blank temporary exercise to today's workout (local only until saved)
  // `addBlankExerciseToWorkout` handled by hook `addBlankExerciseToWorkout`

  // Add a blank temporary exercise to the scheduled split day list (local only until saved)
  // `addBlankExerciseToSplit` handled by hook `addBlankExerciseToSplit`

  // Save sets for an exercise handled by hook's `saveSetsForExercise` (available from hook instance)


  

  // Complete/Rest button handlers
  // completion/resting flags are managed by the hook
  // Confirm modal state
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState<string | undefined>(undefined);
  const [confirmMessage, setConfirmMessage] = useState<string | undefined>(undefined);
  const [confirmConfirmLabel, setConfirmConfirmLabel] = useState<string | undefined>(undefined);
  const [confirmCancelLabel, setConfirmCancelLabel] = useState<string | undefined>(undefined);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const handleCompleteWorkout = async () => {
    if (!todayWorkout) return;
    const ok = await markComplete();
    if (ok) {
      Alert.alert('Workout Complete', 'Great job!');
      fetchTodayWorkout();
    } else {
      Alert.alert('Error', 'Could not mark workout complete');
    }
  };

  const handleRestDay = async () => {
    const ok = await markRestDay();
    if (ok) {
      Alert.alert('Rest Day', 'Rest day logged.');
    } else {
      Alert.alert('Error', 'Could not mark rest day');
    }
  };

  const handleUnmarkRestDay = async () => {
    const ok = await unmarkRestDay();
    if (ok) {
      Alert.alert('Rest Day', 'Rest day unmarked.');
    } else {
      Alert.alert('Error', 'Could not unmark rest day');
    }
  };

  // Confirmation modal helpers
  const showConfirm = (opts: { title?: string; message?: string; confirmLabel?: string; cancelLabel?: string; action?: () => void }) => {
    setConfirmTitle(opts.title);
    setConfirmMessage(opts.message);
    setConfirmConfirmLabel(opts.confirmLabel || 'Confirm');
    setConfirmCancelLabel(opts.cancelLabel || 'Cancel');
    setConfirmAction(() => opts.action || null);
    setConfirmVisible(true);
  };

  const confirmCompleteWorkout = () => {
    if (!todayWorkout) return;
    showConfirm({
      title: 'Complete Workout',
      message: 'Are you sure you want to mark this workout as complete? This will mark it finished for today.',
      confirmLabel: 'Complete',
      cancelLabel: 'Cancel',
      action: () => handleCompleteWorkout(),
    });
  };

  const confirmRestToggle = () => {
    if (isRestDay) {
      showConfirm({
        title: 'Unmark Rest Day',
        message: 'Are you sure you want to unmark today as a rest day?',
        confirmLabel: 'Unmark',
        cancelLabel: 'Cancel',
        action: () => handleUnmarkRestDay(),
      });
    } else {
      showConfirm({
        title: 'Mark Rest Day',
        message: 'Are you sure you want to mark today as a rest day? You can unmark it later.',
        confirmLabel: 'Mark Rest Day',
        cancelLabel: 'Cancel',
        action: () => handleRestDay(),
      });
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

      <BodyweightModal
        visible={showWeightModal}
        bodyweight={bodyweight}
        isKg={isKg}
        submitting={submitting}
        onClose={() => setShowWeightModal(false)}
        onChangeWeight={setBodyweight}
        onToggleKg={(v) => setIsKg(v)}
        onSave={handleLogBodyweight}
      />

      {workoutLoading ? (
        <ActivityIndicator />
      ) : (
        <View>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>{splitDayName ? `${splitDayName}` : (dayNameFromWorkout || 'Today')}</Text>
          <ExerciseList
            exercises={exercises}
            splitDayExercises={splitDayExercises}
            logs={logs}
            nameByExercise={nameByExercise}
            editingByExercise={editingByExercise}
            notesByExercise={notesByExercise}
            isRestDay={isRestDay}
            IconFeather={IconFeather}
            onToggleEdit={(id: string) => setEditingByExercise(prev => ({ ...prev, [id]: !prev[id] }))}
            onChangeName={(id: string, v: string) => setNameByExercise(prev => ({ ...prev, [id]: v }))}
            onChangeSet={(id: string, idx: number, field: string, v: string) => handleSetChange(id, idx, field as any, v)}
            onToggleCompleted={(id: string, idx: number) => toggleSetCompleted(id, idx)}
            onAddSet={(id: string) => addSetRow(id)}
            onRemoveSet={(id: string, idx: number) => confirmRemoveSetRow(id, idx)}
            onChangeNotes={(id: string, v: string) => handleNotesChange(id, v)}
            onRemoveExercise={(item: any) => confirmRemoveExercise(item)}
            onAddExercise={() => (exercises && exercises.length > 0) ? addBlankExerciseToWorkout() : addBlankExerciseToSplit()}
          />
        </View>
      )}

      <WorkoutControls
        todayWorkout={todayWorkout}
        isRestDay={isRestDay}
        completing={completing}
        resting={resting}
        onConfirmComplete={confirmCompleteWorkout}
        onConfirmRestToggle={confirmRestToggle}
      />
      {todayWorkout && todayWorkout.completed && (
        <Text style={{ color: 'green', marginTop: 12 }}>Workout marked as complete!</Text>
      )}
      <ConfirmModal
        visible={confirmVisible}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmConfirmLabel}
        cancelLabel={confirmCancelLabel}
        onCancel={() => setConfirmVisible(false)}
        onConfirm={() => {
          setConfirmVisible(false);
          try { if (confirmAction) confirmAction(); } catch (e) { /* ignore */ }
        }}
      />
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
