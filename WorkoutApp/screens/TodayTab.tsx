
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, ActivityIndicator, Alert, Keyboard, Modal, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles from '../styles/todayStyles';
import ConfirmModal from '../components/ConfirmModal';
import ExerciseCard from '../components/ExerciseCard';
import ModalButtons from '../components/ModalButtons';
import WorkoutControls from '../components/WorkoutControls';
import { useTodayWorkout } from '../hooks/useTodayWorkout';
import { useExerciseLogs } from '../hooks/useExerciseLogs';
import * as api from '../lib/api';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../lib/profileStore';



export default function TodayTab() {
  const insets = useSafeAreaInsets();
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
  const [showDeleteSetConfirm, setShowDeleteSetConfirm] = useState(false);
  const [deleteSetTarget, setDeleteSetTarget] = useState<{ exerciseId: string; index: number } | null>(null);
  const [showDeleteExerciseConfirm, setShowDeleteExerciseConfirm] = useState(false);
  const [deleteExerciseTarget, setDeleteExerciseTarget] = useState<string | null>(null);
  const [removedExerciseIds, setRemovedExerciseIds] = useState<string[]>([]);
  const [showBodyweightModal, setShowBodyweightModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
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

  const getExerciseName = (id: string | null) => {
    if (!id) return '';
    const ex = (exercises || []).find(e => e.id === id) || (splitDayExercises || []).find(e => e.id === id);
    return ex ? ex.name : '';
  };

  if (workoutLoading) return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]} contentContainerStyle={{ padding: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        {/* Compute weekday abbreviation + day name (prefer splitDayName, then workout day name) */}
        {(() => {
          const wdNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const today = new Date();
          const abbrev = wdNames[today.getDay()];
          const dayLabel = splitDayName || dayNameFromWorkout || 'Today';
          return <Text style={[styles.title, { marginBottom: 0 }]}>{`${abbrev} - ${dayLabel}`}</Text>;
        })()}
        <View style={{ flexDirection: 'row', marginLeft: 'auto' }}>
          <TouchableOpacity onPress={() => setShowBodyweightModal(true)} style={styles.bodyweightBtn} activeOpacity={0.9} accessibilityLabel="Open bodyweight modal">
            {IconFeather ? <IconFeather name="user" size={18} color="#fff" /> : <Text style={styles.bodyweightIcon}>🏋️‍♂️</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSettingsModal(true)} style={[styles.bodyweightBtn, { backgroundColor: '#444', marginLeft: 8 }]} activeOpacity={0.9} accessibilityLabel="Open settings">
            {IconFeather ? <IconFeather name="settings" size={18} color="#fff" /> : <Text style={styles.bodyweightIcon}>⚙️</Text>}
          </TouchableOpacity>
        </View>
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

      {/* Settings modal (simple placeholder with Logout) */}
      <Modal visible={showSettingsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Settings</Text>
            <TouchableOpacity
              onPress={async () => {
                try {
                  await supabase.auth.signOut();
                } catch (e) {
                  // ignore
                }
                useProfileStore.getState().setProfile(null);
              }}
              style={{ backgroundColor: '#ff3b30', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSettingsModal(false)} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ color: '#007AFF', fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {workoutLoading ? (
        <ActivityIndicator />
      ) : (
        <View>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>{splitDayName ? `${splitDayName}` : (dayNameFromWorkout || 'Today')}</Text>
          {(() => {
            const base = ((exercises && exercises.length > 0) ? exercises : splitDayExercises) || [];
            const visible = base.filter((it) => !removedExerciseIds.includes(it.id));
            return visible.map((item) => (
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
                onRemoveSet={(idx) => { setDeleteSetTarget({ exerciseId: item.id, index: idx }); setShowDeleteSetConfirm(true); }}
                onChangeNotes={(v) => logsHook.handleNotesChange(item.id, v)}
                onRemoveExercise={() => { setDeleteExerciseTarget(item.id); setShowDeleteExerciseConfirm(true); }}
                IconFeather={IconFeather}
              />
            ));
          })()}
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

      {/* If there's no workout for today still allow marking as rest day */}
      {!todayWorkout && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowRestConfirm(true)}
          disabled={resting}
          style={[styles.secondaryButton, resting ? styles.secondaryButtonDisabled : null]}
        >
          <Text style={[styles.secondaryButtonText, resting ? styles.secondaryButtonTextDisabled : null]}>{resting ? 'Logging...' : (isRestDay ? 'Unmark as Rest Day' : 'Mark as Rest Day')}</Text>
        </TouchableOpacity>
      )}

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

      <ConfirmModal
        visible={showDeleteSetConfirm}
        title="Delete Set?"
        message="Are you sure you want to permanently delete this set? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleteSetTarget) {
            const { exerciseId, index } = deleteSetTarget;
            setShowDeleteSetConfirm(false);
            setDeleteSetTarget(null);
            try {
              await logsHook.removeSetRow(exerciseId, index);
            } catch (e) {
              // ignore or alert
            }
          } else {
            setShowDeleteSetConfirm(false);
          }
        }}
        onCancel={() => { setShowDeleteSetConfirm(false); setDeleteSetTarget(null); }}
      />

      <ConfirmModal
        visible={showDeleteExerciseConfirm}
        title="Delete Exercise?"
        message={`Are you sure you want to delete "${getExerciseName(deleteExerciseTarget)}" for today? This will only hide it for today and will not delete it from your exercises.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleteExerciseTarget) {
            const id = deleteExerciseTarget;
            setShowDeleteExerciseConfirm(false);
            setDeleteExerciseTarget(null);
            try {
              // Hide exercise locally for today
              setRemovedExerciseIds(prev => [...prev, id]);
              // Clear any local logs/notes for the exercise
              logsHook.setLogs(prev => {
                const copy = { ...prev };
                delete copy[id];
                return copy;
              });
              logsHook.setNotesByExercise(prev => {
                const copy = { ...prev };
                delete copy[id];
                return copy;
              });
              // Clear any transient edited name or editing state
              setEditedNames(prev => {
                const copy = { ...prev };
                delete copy[id];
                return copy;
              });
              setEditingByExercise(prev => {
                const copy = { ...prev };
                delete copy[id];
                return copy;
              });
            } catch (e) {
              // ignore
            }
          } else {
            setShowDeleteExerciseConfirm(false);
          }
        }}
        onCancel={() => { setShowDeleteExerciseConfirm(false); setDeleteExerciseTarget(null); }}
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
