import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, TextInput, FlatList, ActivityIndicator, Alert, Keyboard, Modal, TouchableOpacity, Platform, ScrollView } from 'react-native';
import BodyweightCard from '../components/BodyweightCard';
import { useTheme } from '../lib/ThemeContext';
import DatePickerModal from '../components/DatePickerModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles from '../styles/todayStyles';
import ConfirmModal from '../components/ConfirmModal';
import ExerciseCard from '../components/ExerciseCard';
import ModalButtons from '../components/ModalButtons';
// import WorkoutControls removed
import { useTodayWorkout } from '../hooks/useTodayWorkout';
import { useExerciseLogs } from '../hooks/useExerciseLogs';
import * as api from '../lib/api';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../lib/profileStore';
import { colors } from '../styles/theme';



// ...existing imports...

// Import icons at runtime to avoid type errors when package isn't installed in the environment

export default function TodayTab() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [calendarDate, setCalendarDate] = useState<Date | null>(new Date());
  const [bodyweight, setBodyweight] = useState('');
  const [isKg, setIsKg] = useState(true);
  const [bodyweightSubmitting, setBodyweightSubmitting] = useState(false);
  const [bodyweightRecordId, setBodyweightRecordId] = useState<string | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showChangeDayModal, setShowChangeDayModal] = useState(false);
  const [changeDaySubmitting, setChangeDaySubmitting] = useState(false);
  const [splitDayNames, setSplitDayNames] = useState<Record<string, string>>({});
  const [splitDayNamesLoading, setSplitDayNamesLoading] = useState(false);
  const [removedExerciseIds, setRemovedExerciseIds] = useState<string[]>([]);
  const [editedNames, setEditedNames] = useState<Record<string, string>>({});
  const [editingByExercise, setEditingByExercise] = useState<Record<string, boolean>>({});
  const notesDebounceTimers = useRef<Record<string, any>>({});
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showRestConfirm, setShowRestConfirm] = useState(false);
  const [showDeleteSetConfirm, setShowDeleteSetConfirm] = useState(false);
  const [deleteSetTarget, setDeleteSetTarget] = useState<{ exerciseId: string; index: number } | null>(null);
  const [showDeleteExerciseConfirm, setShowDeleteExerciseConfirm] = useState(false);
  const [deleteExerciseTarget, setDeleteExerciseTarget] = useState<string | null>(null);

  // Date formatting helper
  const formatDateOnly = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const dd = new Date(d);
    dd.setHours(0, 0, 0, 0);
    return `${dd.getFullYear()}-${pad(dd.getMonth() + 1)}-${pad(dd.getDate())}`;
  };

  // --- useTodayWorkout hook ---
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
    creatingWorkout,
    splitDayId,
    splitDayMapped,
    activeSplitRun,
    splitTemplate,
    splitDays,
    setScheduledDayForToday,
  } = useTodayWorkout();

  // Refetch workout data when calendar date changes
  useEffect(() => {
    if (profile && profile.id && calendarDate) {
      const isoDate = formatDateOnly(calendarDate);
      fetchActiveSplitRun().then(splitInfo => {
        if (splitInfo && splitInfo.run && splitInfo.split) {
          fetchTodayWorkout(isoDate, { activeRun: splitInfo.run, splitTemplate: splitInfo.split, splitDays: splitInfo.splitDays });
        } else {
          fetchTodayWorkout(isoDate);
        }
      });
    }
  }, [calendarDate, profile]);

  // --- logsHook ---
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

  const onSaveBodyweight = async () => {
    if (!profile || !profile.id) return;
    const parsed = parseFloat(bodyweight);
    if (isNaN(parsed)) {
      Alert.alert('Invalid weight', 'Enter a numeric weight value');
      return;
    }
    setBodyweightSubmitting(true);
    try {
      const unit: 'kg' | 'lbs' = isKg ? 'kg' : 'lbs';
      if (bodyweightRecordId) {
        const { data, error } = await api.updateBodyweight(bodyweightRecordId, { weight: parsed, unit });
        if (error) throw error;
        // Keep the value and ensure record id persists so input becomes read-only
  const arr = ((data as unknown) as any[]) || [];
        const row: any = arr[0] || null;
        if (row && row.id) setBodyweightRecordId(row.id as string);
      } else {
        const { data, error } = await api.insertBodyweight({ user_id: profile.id, weight: parsed, unit });
        if (error) throw error;
  const arr = ((data as unknown) as any[]) || [];
        const row: any = arr[0] || null;
        if (row && row.id) setBodyweightRecordId(row.id as string);
      }
      // Do not clear the value; lock the field by having recordId set
    } catch (e: any) {
      Alert.alert('Error', e.message || String(e));
    } finally {
      setBodyweightSubmitting(false);
    }
  };

  // Load existing bodyweight for the selected date (calendarDate or today)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!profile || !profile.id) return;
      try {
        const isoDate = calendarDate ? formatDateOnly(calendarDate) : formatDateOnly(new Date());
        const { data, error } = await api.getBodyweightByUserDate(profile.id, isoDate);
        if (!mounted) return;
        if (!error && data && data.length > 0) {
          const row = data[0];
          setBodyweight(String(row.weight ?? ''));
          if (row.unit === 'lbs') setIsKg(false);
          else setIsKg(true);
          setBodyweightRecordId(row.id || null);
        } else {
          setBodyweight('');
          setBodyweightRecordId(null);
        }
      } catch (e) {}
    };
    load();
    return () => { mounted = false; };
  }, [calendarDate, profile]);

  // Load historical logs when date or workout changes
  useEffect(() => {
    let mounted = true;
    const loadHistoricalLogs = async () => {
      if (!profile || !profile.id || !calendarDate) return;
      
      // Wait for workout to be loaded
      if (workoutLoading) return;

      try {
        const isoDate = formatDateOnly(calendarDate);
        // Fetch workout for the selected date
        const { data: workout, error: workoutError } = await api.getWorkoutByUserDate(profile.id, isoDate);
        if (!workout || workoutError) {
          // No workout for this date, clear logs
          logsHook.setLogs({});
          logsHook.setNotesByExercise({});
          return;
        }

        // Fetch logs for this workout
        const { data: logsData, error: logsError } = await api.getLogsByWorkoutId(workout.id);
        if (logsError || !logsData || logsData.length === 0) {
          logsHook.setLogs({});
          logsHook.setNotesByExercise({});
          return;
        }

        // Fetch workout_exercises to create mapping
        const { data: workoutExercises } = await api.getWorkoutExercisesByWorkoutId(workout.id);
        
        // Create a mapping from original exercise_id to workout_exercise instance id
        // workout_exercises have both: id (instance) and exercise_id (original)
        const exerciseIdToInstanceId: { [originalExerciseId: string]: string } = {};
        if (workoutExercises && workoutExercises.length > 0) {
          workoutExercises.forEach((we: any) => {
            if (we.exercise_id) {
              // Map original exercise_id to this workout_exercise instance id
              exerciseIdToInstanceId[we.exercise_id] = we.id;
            }
          });
        }

        // Group logs by their exercise_id, then map to workout_exercise instance ids
        const logsByOriginalExercise: { [exerciseId: string]: Array<any> } = {};
        const notesByOriginalExercise: { [exerciseId: string]: string } = {};

        logsData.forEach((log: any) => {
          const origExerciseId = log.exercise_id;
          if (!logsByOriginalExercise[origExerciseId]) {
            logsByOriginalExercise[origExerciseId] = [];
          }
          logsByOriginalExercise[origExerciseId].push({
            setNumber: log.set_number,
            reps: String(log.reps || ''),
            weight: String(log.weight || ''),
            completed: !!log.completed,
            logId: log.id,
          });
          // Store notes (typically same for all sets of an exercise)
          if (log.notes && !notesByOriginalExercise[origExerciseId]) {
            notesByOriginalExercise[origExerciseId] = log.notes;
          }
        });

        // Sort sets by set_number for each exercise
        Object.keys(logsByOriginalExercise).forEach(exerciseId => {
          logsByOriginalExercise[exerciseId].sort((a, b) => a.setNumber - b.setNumber);
        });

        // Map logs to workout_exercise instance ids for the UI
        const groupedLogs: { [instanceId: string]: Array<any> } = {};
        const notesMap: { [instanceId: string]: string } = {};

        Object.keys(logsByOriginalExercise).forEach(origExerciseId => {
          const instanceId = exerciseIdToInstanceId[origExerciseId];
          if (instanceId) {
            // Map to the workout_exercise instance
            groupedLogs[instanceId] = logsByOriginalExercise[origExerciseId];
            if (notesByOriginalExercise[origExerciseId]) {
              notesMap[instanceId] = notesByOriginalExercise[origExerciseId];
            }
          } else {
            // Fallback: if no workout_exercise instance found, use original exercise_id
            // This handles cases where exercises were logged directly
            groupedLogs[origExerciseId] = logsByOriginalExercise[origExerciseId];
            if (notesByOriginalExercise[origExerciseId]) {
              notesMap[origExerciseId] = notesByOriginalExercise[origExerciseId];
            }
          }
        });

        if (mounted) {
          logsHook.setLogs(groupedLogs);
          logsHook.setNotesByExercise(notesMap);
        }
      } catch (e) {
        console.error('Error loading historical logs:', e);
        if (mounted) {
          logsHook.setLogs({});
          logsHook.setNotesByExercise({});
        }
      }
    };

    loadHistoricalLogs();
    return () => { mounted = false; };
  }, [calendarDate, profile, todayWorkout, workoutLoading, exercises]);

      
  // Prepare the data array for the FlatList:
  // Always show scheduled `splitDayExercises` first, then any persisted or locally-added `exercises`.
  // Filter out any exercises that duplicate scheduled items (by id) to avoid duplicate keys.
  const scheduledIds = new Set((splitDayExercises || []).map(s => s.id));
  const base: any[] = [...(splitDayExercises || []), ...(exercises || []).filter(e => !scheduledIds.has(e.id))];
  const visibleExercises = base.filter((it) => !removedExerciseIds.includes(it.id));

  // Determine whether all visible sets are checked/completed locally — treat
  // that as an effective completed state for UI labeling and confirm flows.
  const allSetsCompleted = useMemo(() => {
    try {
      if (!visibleExercises || visibleExercises.length === 0) return false;
      return visibleExercises.every(it => {
        const rows = logsHook.logs[String(it.id)] || [];
        if (!rows || rows.length === 0) return false;
        return rows.every((r: any) => !!r && !!r.completed);
      });
    } catch (e) {
      return false;
    }
  }, [visibleExercises, logsHook.logs, calendarDate]);

  const effectiveCompleted = !!((todayWorkout && todayWorkout.completed) || allSetsCompleted);

  // Header label and rest detection: some splits (rotation rest-only) show 'Rest' in the header
  const headerDayLabel = (splitDayName || dayNameFromWorkout || 'Rest');
  const hasActiveSplit = !!activeSplitRun || !!splitTemplate;
  // Treat as rest day for UI when either persisted as rest, or when the active split
  // was evaluated for the date (`splitDayMapped === true`) and the mapping returned
  // `null` (no split day slot) => treat as an explicit rest day from the split.
  const headerIsRest = hasActiveSplit && splitDayMapped && splitDayId == null;
  // Helper to get an exercise display name by id (used in delete confirm)
  const getExerciseName = (id: string | null) => {
    if (!id) return '';
    if (editedNames[id]) return editedNames[id];
    const ex = (exercises || []).find((e: any) => e.id === id) || (splitDayExercises || []).find((e: any) => e.id === id);
    return ex ? (ex.name || '') : '';
  };

  // Stable top header for the day title, date, theme switch, and actions
  const Header: React.FC = () => {
    const dateLabel = (() => {
      try {
        if (!calendarDate) return '';
        const d = new Date(calendarDate);
        const opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
        return d.toLocaleDateString(undefined, opts);
      } catch {
        return '';
      }
    })();
    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            {/* Match Days/Splits title size (fonts.size.xxxl -> ~28) */}
            <Text style={{ fontSize: 28, fontWeight: '700', color: '#212121' }}>{headerDayLabel}</Text>
            {!!dateLabel && <Text style={{ color: '#666', marginTop: 2 }}>{dateLabel}</Text>}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => setShowCalendarModal(true)}
              activeOpacity={0.8}
              accessibilityLabel="Open calendar"
              style={{ padding: 6 }}
            >
              {IconFeather ? (
                <IconFeather name="calendar" size={22} color={theme.primary} />
              ) : (
                <Text style={{ color: theme.primary, fontWeight: '700' }}>Calendar</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowSettingsModal(true)}
              activeOpacity={0.8}
              accessibilityLabel="Open settings"
              style={{ padding: 6, marginLeft: 8 }}
            >
              {IconFeather ? (
                <IconFeather name="settings" size={22} color={theme.primary} />
              ) : (
                <Text style={{ color: theme.primary, fontWeight: '700' }}>Settings</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.backgroundMuted, marginTop: 8, marginBottom: 12 }} />
      </View>
    );
  };

  return (
  <View style={[styles.container, { paddingTop: insets.top, paddingBottom: 0 }]}> 
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        data={visibleExercises}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={(
          <View>
            <Header />
            <BodyweightCard
              bodyweight={bodyweight}
              isKg={isKg}
              submitting={bodyweightSubmitting}
              recordId={bodyweightRecordId}
              onChangeWeight={setBodyweight}
              onToggleKg={setIsKg}
              onSave={onSaveBodyweight}
            />
          </View>
        )}
        renderItem={({ item }) => {
          // Ensure the sets array matches the number specified for the exercise
          let sets = logsHook.logs[String(item.id)] || [];
          const expectedSets = Number(item.sets) || 1;
          if (sets.length < expectedSets) {
            sets = [
              ...sets,
              ...Array(expectedSets - sets.length).fill(0).map((_, i) => ({
                setNumber: sets.length + i + 1,
                reps: '',
                weight: '',
                completed: false,
                logId: null,
              }))
            ];
          } else if (sets.length > expectedSets) {
            sets = sets.slice(0, expectedSets);
          }
          return (
            <ExerciseCard
              key={item.id}
              item={item}
              sets={sets}
              name={editedNames[item.id] ?? item.name}
              editing={!!editingByExercise[item.id]}
              readonlyMode={headerIsRest}
              notes={logsHook.notesByExercise[String(item.id)] || ''}
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
          );
        }}
        ListFooterComponent={() => (
          <View>
            {/* + Add Exercise text link placed above the workout controls and left-aligned */}
            <View style={{ marginTop: 12, paddingHorizontal: 16 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  try {
                    addBlankExerciseToWorkout();
                  } catch (e) {}
                }}
                style={{ alignSelf: 'flex-start' }}
              >
                <Text style={{ color: theme.primary, fontWeight: '700' }}>{'+ Add Exercise'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      {/* Modals and confirmations placed outside the FlatList but inside the component root */}
      {/* Removed Bodyweight Modal - now inline card only */}

      {/* Settings modal (simple placeholder with Logout) */}
      <Modal visible={showSettingsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Settings</Text>
            <TouchableOpacity
              onPress={async () => {
                // Load display names for day_id references before opening modal
                try {
                  setSplitDayNamesLoading(true);
                  const ids = Array.from(new Set((splitDays || []).map((s: any) => s.day_id).filter(Boolean)));
                  const map: Record<string, string> = {};
                  await Promise.all(ids.map(async (id) => {
                    try {
                      const { data } = await api.getDayById(id);
                      if (data && data.length > 0) map[id] = data[0].name || id;
                      else map[id] = id;
                    } catch (e) {
                      map[id] = id;
                    }
                  }));
                  setSplitDayNames(map);
                } catch (e) {
                  // ignore
                } finally {
                  setSplitDayNamesLoading(false);
                  // close settings so the change-day modal is visible on top
                  setShowSettingsModal(false);
                  setShowChangeDayModal(true);
                }
              }}
              style={[styles.primaryButton, { marginBottom: 8 }]}
            >
              <Text style={styles.primaryButtonText}>{splitDayNamesLoading ? 'Loading...' : 'Change Scheduled Day'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                try {
                  await supabase.auth.signOut();
                } catch (e) {
                  // ignore
                }
                useProfileStore.getState().setProfile(null);
              }}
              style={[styles.primaryButton, { backgroundColor: colors.danger, marginBottom: 8 }]}
            >
              <Text style={styles.primaryButtonText}>Logout</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowSettingsModal(false)} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ConfirmModal for workout complete removed */}

      {/* ConfirmModal for rest day removed */}

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

      {/* Calendar DatePickerModal */}
      <DatePickerModal
        visible={showCalendarModal}
        initialDate={calendarDate}
        onCancel={() => setShowCalendarModal(false)}
        onConfirm={(isoDate) => {
          setShowCalendarModal(false);
          // Parse ISO date string (YYYY-MM-DD) to create a Date at local midnight
          // to avoid timezone offset issues
          const [year, month, day] = isoDate.split('-').map(Number);
          setCalendarDate(new Date(year, month - 1, day));
        }}
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
