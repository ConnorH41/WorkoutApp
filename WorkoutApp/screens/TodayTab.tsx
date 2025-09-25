
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, FlatList, ActivityIndicator, Alert, Keyboard, Modal, TouchableOpacity, Platform } from 'react-native';
import DatePickerModal from '../components/DatePickerModal';
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
  fetchActiveSplitRun,
    createWorkoutFromScheduledDay,
    createExercise,
    addBlankExerciseToWorkout,
  addTransientExercise,
    addBlankExerciseToSplit,
    deleteExercise,
  updateWorkoutExerciseInstance,
  markComplete,
  unmarkComplete,
    markRestDay,
    unmarkRestDay,
    creatingWorkout,
    completing,
    resting,
    isRestDay,
    splitDayId,
    splitDayMapped,
    activeSplitRun,
    splitTemplate,
  } = useTodayWorkout();
  

  const [editedNames, setEditedNames] = useState<Record<string, string>>({});
  const [editingByExercise, setEditingByExercise] = useState<Record<string, boolean>>({});
  const notesDebounceTimers = useRef<Record<string, any>>({});

  const logsHook = useExerciseLogs({
    createWorkoutFromScheduledDay,
    createExercise,
    createTransientExercise: addTransientExercise,
    getTodayWorkout: () => todayWorkout,
    getExercises: () => exercises,
    getSplitDayExercises: () => splitDayExercises,
    getNameByExercise: (id: string) => {
      if (editedNames[id]) return editedNames[id];
      const ex = exercises.find(e => e.id === id) || splitDayExercises.find(e => e.id === id);
      return ex ? ex.name : undefined;
    },
  });

  // Load persisted logs for today's workout when it becomes available so
  // reps/weight/completed state is restored on reload/login.
  useEffect(() => {
    const loadPersistedLogs = async () => {
      try {
        if (!todayWorkout || !todayWorkout.id) return;
        const { data, error } = await api.getLogsByWorkoutId(todayWorkout.id);
        if (error || !data) return;
        // Transform into logsHook shape: group by exercise id and fill arrays
        const grouped: any = {};
        const notes: any = {};
        for (const row of data) {
          const exId = String(row.exercise_id || row.workout_exercise_id || row.exercise_id || '');
          if (!grouped[exId]) grouped[exId] = [];
          grouped[exId].push({ setNumber: row.set_number, reps: String(row.reps ?? ''), weight: String(row.weight ?? ''), completed: !!row.completed, logId: row.id });
          if (row.notes) notes[exId] = String(row.notes);
        }
        // Ensure each group's sets are sorted by setNumber and indexed from 0..n-1
        Object.keys(grouped).forEach(k => {
          grouped[k] = grouped[k].sort((a: any, b: any) => (a.setNumber || 0) - (b.setNumber || 0));
        });
        // Update logsHook state
        logsHook.setLogs(grouped);
        logsHook.setNotesByExercise(notes);
      } catch (e) {
        // ignore
      }
    };
    loadPersistedLogs();
  }, [todayWorkout?.id]);

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
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date | null>(new Date());

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

      
  // Prepare the data array for the FlatList:
  // Always show scheduled `splitDayExercises` first, then any persisted or locally-added `exercises`.
  // Filter out any exercises that duplicate scheduled items (by id) to avoid duplicate keys.
  const scheduledIds = new Set((splitDayExercises || []).map(s => s.id));
  const base: any[] = [...(splitDayExercises || []), ...(exercises || []).filter(e => !scheduledIds.has(e.id))];
  const visibleExercises = base.filter((it) => !removedExerciseIds.includes(it.id));

  // Header label and rest detection: some splits (rotation rest-only) show 'Rest' in the header
  const headerDayLabel = (splitDayName || dayNameFromWorkout || 'Rest');
  const hasActiveSplit = !!activeSplitRun || !!splitTemplate;
  // Treat as rest day for UI when either persisted as rest, or when the active split
  // was evaluated for the date (`splitDayMapped === true`) and the mapping returned
  // `null` (no split day slot) => treat as an explicit rest day from the split.
  const headerIsRest = !!isRestDay || (hasActiveSplit && splitDayMapped && splitDayId == null);

    const Header = () => (
      <View style={{ paddingHorizontal: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        {(() => {
          const refDate = calendarDate ?? new Date();
          const dayLabel = splitDayName || dayNameFromWorkout || 'Rest';
          const weekdayLong = refDate.toLocaleString(undefined, { weekday: 'long' });
          const monthLong = refDate.toLocaleString(undefined, { month: 'long' });
          const dayNum = refDate.getDate();
          const fullDateLine = `${weekdayLong} ${monthLong} ${dayNum}`;
          return (
            <View style={{ flexDirection: 'column' }}>
              <Text style={[styles.title, { marginBottom: 2 }]}>{headerIsRest ? 'Rest' : `${dayLabel} Day`}</Text>
              <Text style={{ color: '#666', fontSize: 14 }}>{fullDateLine}</Text>
            </View>
          );
        })()}
        <View style={{ flexDirection: 'row', marginLeft: 'auto' }}>
          <TouchableOpacity onPress={() => setShowBodyweightModal(true)} style={styles.bodyweightBtn} activeOpacity={0.9} accessibilityLabel="Open bodyweight modal">
            {IconFeather ? <IconFeather name="user" size={18} color="#fff" /> : <Text style={styles.bodyweightIcon}>🏋️‍♂️</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowCalendarModal(true)}
            style={[styles.bodyweightBtn, { backgroundColor: '#2a9df4', marginLeft: 8 }]}
            activeOpacity={0.9}
            accessibilityLabel="Open calendar"
          >
            {IconFeather ? <IconFeather name="calendar" size={18} color="#fff" /> : <Text style={styles.bodyweightIcon}>📅</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSettingsModal(true)} style={[styles.bodyweightBtn, { backgroundColor: '#444', marginLeft: 8 }]} activeOpacity={0.9} accessibilityLabel="Open settings">
            {IconFeather ? <IconFeather name="settings" size={18} color="#fff" /> : <Text style={styles.bodyweightIcon}>⚙️</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Footer removed: day-name display moved to header to avoid duplication.

  const getExerciseName = (id: string | null) => {
    if (!id) return '';
    const ex = (exercises || []).find(e => e.id === id) || (splitDayExercises || []).find(e => e.id === id);
    return ex ? ex.name : '';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}> 
  <FlatList
    style={{ flex: 1 }}
    contentContainerStyle={{ paddingBottom: 24 }}
      data={visibleExercises}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={Header}
      ListFooterComponent={() => (
        <View>
          {/* + Add Exercise text link placed above the workout controls and left-aligned */}
          <View style={{ marginTop: 12, paddingHorizontal: 16 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                try {
                  addBlankExerciseToWorkout();
                } catch (e) {
                  // ignore
                }
              }}
              style={{ alignSelf: 'flex-start' }}
            >
              <Text style={{ color: '#007AFF', fontWeight: '700' }}>{'+ Add Exercise'}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 12 }}>
            <WorkoutControls
              todayWorkout={todayWorkout}
              isRestDay={headerIsRest}
              completing={completing}
              resting={resting}
              onConfirmComplete={() => setShowCompleteConfirm(true)}
              onUnmarkComplete={() => setShowCompleteConfirm(true)}
              onConfirmRestToggle={() => setShowRestConfirm(true)}
            />
          </View>

          {/* If there's no workout for today and neither the run nor the header indicate a rest day,
              allow marking either as a completed workout or marking as a rest day. Both buttons
              should be visible under the same conditions. */}
          {!todayWorkout && !headerIsRest && (
            <View style={{ paddingHorizontal: 16 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowCompleteConfirm(true)}
                disabled={completing}
                style={[styles.secondaryButton, completing ? styles.secondaryButtonDisabled : null, { marginBottom: 8 }]}
              >
                <Text style={[styles.secondaryButtonText, completing ? styles.secondaryButtonTextDisabled : null]}>{completing ? 'Completing...' : 'Mark Workout Complete'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowRestConfirm(true)}
                disabled={resting}
                style={[styles.secondaryButton, resting ? styles.secondaryButtonDisabled : null]}
              >
                <Text style={[styles.secondaryButtonText, resting ? styles.secondaryButtonTextDisabled : null]}>{resting ? 'Logging...' : 'Mark as Rest Day'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* If it's a rest day (either flagged or implied by header) show a friendly message instead of the mark button */}
          {headerIsRest && (
            <View style={{ padding: 12 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowRestConfirm(true)}
                disabled={resting}
                style={[styles.secondaryButton, resting ? styles.secondaryButtonDisabled : null]}
              >
                <Text style={[styles.secondaryButtonText, resting ? styles.secondaryButtonTextDisabled : null]}>{resting ? 'Logging...' : 'Unmark as Rest Day'}</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      )}
      renderItem={({ item }) => (
        <ExerciseCard
          key={item.id}
          item={item}
          sets={logsHook.logs[item.id] || [{ setNumber: 1, reps: '', weight: '', completed: false }]}
          name={editedNames[item.id] ?? item.name}
          editing={!!editingByExercise[item.id]}
          readonlyMode={headerIsRest}
          notes={logsHook.notesByExercise[item.id] || ''}
          onToggleEdit={() => {
            // If we are toggling off editing, persist the name if changed
            const currently = !!editingByExercise[item.id];
            if (currently) {
              const edited = editedNames[item.id];
              if (edited != null && String(edited).trim() !== String(item.name).trim()) {
                // persist name change for persisted instances
                if (item && item.workout_id) {
                  updateWorkoutExerciseInstance(item.id, { name: String(edited).trim() }).catch(() => {});
                }
              }
            }
            setEditingByExercise(prev => ({ ...prev, [item.id]: !prev[item.id] }));
          }}
          onChangeName={(v) => setEditedNames(prev => ({ ...prev, [item.id]: v }))}
          onChangeNotes={(v) => {
            logsHook.handleNotesChange(item.id, v);
            try { if (notesDebounceTimers.current[item.id]) clearTimeout(notesDebounceTimers.current[item.id]); } catch {}
            notesDebounceTimers.current[item.id] = setTimeout(async () => {
              if (item && item.workout_id) {
                try { await updateWorkoutExerciseInstance(item.id, { notes: v }); } catch (e) {}
              }
            }, 800);
          }}
          onChangeSet={(idx, field, v) => logsHook.handleSetChange(item.id, idx, field as any, v)}
          onToggleCompleted={(idx) => logsHook.toggleSetCompleted(item.id, idx)}
          onAddSet={async () => { logsHook.addSetRow(item.id); if (item && item.workout_id) { try { await updateWorkoutExerciseInstance(item.id, { sets: (Number(item.sets) || 1) + 1 }); } catch {} } }}
          onRemoveSet={(idx) => { setDeleteSetTarget({ exerciseId: item.id, index: idx }); setShowDeleteSetConfirm(true); }}
          
          onRemoveExercise={() => { setDeleteExerciseTarget(item.id); setShowDeleteExerciseConfirm(true); }}
          IconFeather={IconFeather}
        />
      )}
    />

      {/* Modals and confirmations placed outside the FlatList but inside the component root */}
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

      {/* Calendar modal (placeholder) */}
      <DatePickerModal
        visible={showCalendarModal}
        initialDate={calendarDate}
        onCancel={() => setShowCalendarModal(false)}
        onConfirm={(isoDate) => {
          setShowCalendarModal(false);
            // Parse YYYY-MM-DD into a local Date at midnight to avoid timezone shifts
            const parts = isoDate.split('-').map(p => parseInt(p, 10));
            let d: Date | null = null;
            if (parts.length === 3 && parts.every(p => !Number.isNaN(p))) {
              d = new Date(parts[0], parts[1] - 1, parts[2]);
              d.setHours(0, 0, 0, 0);
            }
            setCalendarDate(d);
          // clear transient UI state so day-specific edits don't carry across
          setRemovedExerciseIds([]);
          setEditedNames({});
          setEditingByExercise({});
          (async () => {
            // ensure split/run data is loaded first so mapping is accurate for the chosen date
            const splitInfo = await fetchActiveSplitRun();
            if (splitInfo && splitInfo.run && splitInfo.split) {
              await fetchTodayWorkout(isoDate, { activeRun: splitInfo.run, splitTemplate: splitInfo.split, splitDays: splitInfo.splitDays });
            } else {
              await fetchTodayWorkout(isoDate);
            }
          })();
        }}
      />

      <ConfirmModal
        visible={showCompleteConfirm}
        title={todayWorkout && todayWorkout.completed ? 'Unmark Workout as Complete?' : 'Mark Workout Complete?'}
        message={todayWorkout && todayWorkout.completed ? "This will unmark today's workout as complete. Continue?" : "This will mark today's workout as complete. Continue?"}
        onConfirm={async () => {
          setShowCompleteConfirm(false);
          // If the workout is currently completed, un-complete sets and unmark the workout
          if (todayWorkout && todayWorkout.completed) {
            const uncompleteAllSetsThenUnmark = async () => {
              try {
                const items = visibleExercises || [];
                for (const it of items) {
                  const exId = it.id;
                  const setRows = logsHook.logs[exId] || [];
                  for (let i = 0; i < setRows.length; i++) {
                    const row = setRows[i];
                    if (!row || !row.completed) continue;
                    try {
                      // toggleSetCompleted will un-persist the completed flag if possible
                      // eslint-disable-next-line no-await-in-loop
                      await logsHook.toggleSetCompleted(exId, i);
                    } catch (e) {
                      // fallback: update local state to uncheck
                      logsHook.setLogs(prev => {
                        const copy = { ...prev } as any;
                        const arr = copy[exId] ? [...copy[exId]] : [];
                        while (arr.length <= i) arr.push({ setNumber: arr.length + 1, reps: '', weight: '', completed: false, logId: null });
                        arr[i] = { ...(arr[i] || {}), completed: false } as any;
                        copy[exId] = arr;
                        return copy;
                      });
                    }
                  }
                }
              } catch (e) {
                // ignore
              }
              try { await unmarkComplete(); } catch (e) {}
            };
            await uncompleteAllSetsThenUnmark();
          } else {
            // If there's no persisted workout object for today yet, create one so
            // marking complete persists and the 'Unmark' path becomes available.
            if (!todayWorkout) {
              try {
                await createWorkoutFromScheduledDay();
              } catch (e) {
                // ignore creation errors - we'll still attempt to markComplete which may no-op
              }
            }

            // Otherwise, complete sets then mark workout complete
            const completeAllSetsThenMark = async () => {
              try {
                const items = visibleExercises || [];
                for (const it of items) {
                  const exId = it.id;
                  const setRows = logsHook.logs[exId] || [];

                  // If there are no sets, skip
                  if (setRows.length === 0) continue;

                  // Persist each set individually so the UI rows remain present and
                  // are marked completed (read-only) — matching the per-set checkbox behavior.
                  for (let i = 0; i < setRows.length; i++) {
                    const row = setRows[i];
                    if (!row || row.completed) continue;
                    const repsOk = row && row.reps !== '' && !Number.isNaN(Number(row.reps));
                    const weightOk = row && row.weight !== '' && !Number.isNaN(Number(row.weight));
                    if (repsOk && weightOk) {
                      try {
                        // Persist this set as a completed log and keep the local row
                        // eslint-disable-next-line no-await-in-loop
                        await logsHook.toggleSetCompleted(exId, i);
                      } catch (e) {
                        // ignore per-set errors and continue
                      }
                    } else {
                      // Mark locally as completed so UI shows checks even if not persisted
                      logsHook.setLogs(prev => {
                        const copy = { ...prev } as any;
                        const arr = copy[exId] ? [...copy[exId]] : [];
                        while (arr.length <= i) arr.push({ setNumber: arr.length + 1, reps: '', weight: '', completed: false, logId: null });
                        arr[i] = { ...(arr[i] || {}), completed: true } as any;
                        copy[exId] = arr;
                        return copy;
                      });
                    }
                  }
                }
              } catch (e) {
                // ignore
              }
              // Finally, mark workout complete (persist flag)
              try { await markComplete(); } catch (e) {}
            };
            await completeAllSetsThenMark();
          }
        }}
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

    </View>
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
