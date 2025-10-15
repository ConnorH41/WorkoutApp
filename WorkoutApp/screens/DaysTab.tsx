
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Alert, Keyboard, Modal, Platform, ToastAndroid, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles from '../styles/daysStyles';
import splitStyles from '../styles/splitsStyles';
import { useProfileStore } from '../lib/profileStore';
import { Day, ExerciseForm, DeleteTargetType } from '../lib/types';
import useDays from '../hooks/useDays';
import useExercises from '../hooks/useExercises';
import ModalButtons from '../components/ModalButtons';
import EditPencil from '../components/EditPencil';
import RemoveButton from '../components/RemoveButton';
import AddExercise from '../components/AddExercise';
import DayRow from '../components/DayRow';
import Badge from '../components/Badge';
import ExercisesList from '../components/ExercisesList';
import AddDayModal from '../components/AddDayModal';
import EditDayModal from '../components/EditDayModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import EditExerciseModal from '../components/EditExerciseModal';
import { colors } from '../styles/theme';

export default function DaysTab() {
  const insets = useSafeAreaInsets();
  const profile = useProfileStore((state) => state.profile);
  const { days, loading, exerciseCounts, fetchDays, createDay, updateDay, deleteDay } = useDays();
  // Local optimistic counts to show immediate UI updates for creates/deletes
  const [localCounts, setLocalCounts] = useState<Record<string, number>>({});
  const [newDayName, setNewDayName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingDayName, setEditingDayName] = useState('');

  // Exercises state
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const { exercises, loading: exLoading, fetchExercises, setExercises, createExercise, updateExercise, deleteExercise } = useExercises();
  
  const [addingEx, setAddingEx] = useState(false);
  const [editingExId, setEditingExId] = useState<string | null>(null);
  const [editingEx, setEditingEx] = useState<ExerciseForm>({ name: '', sets: '', reps: '', notes: '' });

  // Modal states
  const [showAddDayModal, setShowAddDayModal] = useState(false);
  const [newDayTab, setNewDayTab] = useState<number>(0);
  const [showEditDayModal, setShowEditDayModal] = useState(false);
  
  // For expanded day exercise editing (existing functionality)
  const [showEditExerciseModal, setShowEditExerciseModal] = useState(false);
  
  // Simplified exercise editing states for preview
  const [showPreviewEditModal, setShowPreviewEditModal] = useState(false);
  const [editingPreviewIdx, setEditingPreviewIdx] = useState<number | null>(null);
  const [previewEditForm, setPreviewEditForm] = useState<ExerciseForm>({ name: '', sets: '', reps: '', notes: '' });
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetType, setDeleteTargetType] = useState<DeleteTargetType | null>(null);
  const [previewDeleteIndex, setPreviewDeleteIndex] = useState<number | null>(null);

  const showValidationToast = (msg: string) => {
    if (Platform.OS === 'android' && ToastAndroid && ToastAndroid.show) {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('Validation', msg);
    }
  };

  // Fetch exercises for a day

  // Exercise handlers - REBUILT FROM SCRATCH

  const handleEditExercise = (ex: ExerciseForm) => {
    setEditingExId(ex.id ?? null);
    setEditingEx({ name: ex.name, sets: String(ex.sets), reps: String(ex.reps), notes: ex.notes || '' });
    setShowEditExerciseModal(true);
  };

  // NEW: Simple preview exercise edit handler
  const handleEditPreviewExercise = (index: number) => {
    const ex = exercises[index];
    setEditingPreviewIdx(index);
    setPreviewEditForm({ 
      name: ex.name, 
      sets: String(ex.sets), 
      reps: String(ex.reps), 
      notes: ex.notes || '' 
    });
    setShowPreviewEditModal(true);
  };

  // NEW: Save preview exercise edit
  const handleSavePreviewEdit = () => {
    if (!previewEditForm.name.trim() || !previewEditForm.sets || !previewEditForm.reps) {
      showValidationToast('Exercise name, sets, and reps are required');
      return;
    }
    
    if (editingPreviewIdx !== null) {
      setExercises(prev => prev.map((ex, i) => 
        i === editingPreviewIdx ? {
          ...ex,
          name: previewEditForm.name.trim(),
          sets: previewEditForm.sets,
          reps: previewEditForm.reps,
          notes: previewEditForm.notes
        } : ex
      ));
      
      // Reset state
      setEditingPreviewIdx(null);
      setPreviewEditForm({ name: '', sets: '', reps: '', notes: '' });
      setShowPreviewEditModal(false);
    }
  };

  // NEW: Simple delete handler for preview exercises
  const handleDeletePreviewExercise = (index: number) => {
    setPreviewDeleteIndex(index);
    setDeleteTargetType('preview');
    setShowDeleteConfirm(true);
  };

  const handleSaveEditExercise = async () => {
    if (!editingExId || !editingEx.name.trim() || !editingEx.sets || !editingEx.reps) {
      showValidationToast('Exercise name, sets, and reps are required');
      return;
    }
    try {
      await updateExercise(editingExId, editingEx, selectedDayId ?? undefined);
      if (selectedDayId) {
        setEditingExId(null);
        setEditingEx({ name: '', sets: '', reps: '', notes: '' });
        setShowEditExerciseModal(false);
        await fetchExercises(selectedDayId);
        await fetchDays(profile?.id);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update exercise');
    }
  };

  useEffect(() => {
    if (profile && profile.id) {
      fetchDays(profile.id);
    }
  }, [profile?.id]);

  // Day and delete handlers
  const handleEditDay = (id: string, name: string) => {
    setEditingDayId(id);
    setEditingDayName(name);
    setShowEditDayModal(true);
  };

  const handleDeleteDay = (id: string) => {
    setDeleteTargetId(id);
    setDeleteTargetType('day');
    setShowDeleteConfirm(true);
  };

  const handleDeleteExercise = (id: string) => {
    setDeleteTargetId(id);
    setDeleteTargetType('exercise');
    setShowDeleteConfirm(true);
  };

  const handleAddDay = async (): Promise<Day | null> => {
    if (!newDayName.trim()) {
      showValidationToast('Day name is required');
      return null;
    }
    setAdding(true);
    try {
      const created = await createDay(newDayName.trim(), profile?.id);
      return created || null;
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create day');
      return null;
    } finally {
      setAdding(false);
    }
  };

  const handleSaveEditDay = async () => {
    if (!editingDayId || !editingDayName.trim()) {
      showValidationToast('Day name is required');
      return;
    }
    try {
      await updateDay(editingDayId, editingDayName.trim(), profile?.id);
      setShowEditDayModal(false);
      setEditingDayId(null);
      setEditingDayName('');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update day');
    }
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      if (deleteTargetType === 'day' && deleteTargetId) {
        await deleteDay(deleteTargetId, profile?.id);
        if (selectedDayId === deleteTargetId) {
          setSelectedDayId(null);
          setExercises([]);
        }
      } else if (deleteTargetType === 'exercise' && deleteTargetId) {
        // optimistic remove
        const removedId = deleteTargetId;
        const prevExercises = exercises;
        setExercises(prev => prev.filter(e => e.id !== removedId));
        setLocalCounts(prev => ({ ...prev, [selectedDayId as string]: Math.max(0, (prev[selectedDayId as string] ?? exerciseCounts[selectedDayId as string] ?? 1) - 1) }));
        try {
          await deleteExercise(removedId, selectedDayId ?? undefined);
          if (selectedDayId) await fetchExercises(selectedDayId);
          await fetchDays(profile?.id);
        } catch (err: any) {
          // rollback
          setExercises(prevExercises);
          setLocalCounts(prev => ({ ...prev, [selectedDayId as string]: (exerciseCounts[selectedDayId as string] ?? 0) }));
          throw err;
        }
      } else if (deleteTargetType === 'preview' && previewDeleteIndex !== null) {
        setExercises(prev => prev.filter((_, i) => i !== previewDeleteIndex));
        setPreviewDeleteIndex(null);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Delete failed');
    } finally {
      setDeleteTargetId(null);
      setDeleteTargetType(null);
    }
  };

  const ListHeader = () => (
    <View style={{ paddingHorizontal: 16 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Days</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddDayModal(true)}
        >
          <Text style={styles.addButtonText}>Add New Day</Text>
        </TouchableOpacity>
      </View>
  <View style={{ borderBottomWidth: 1, borderBottomColor: colors.backgroundMuted, marginBottom: 12 }} />
      {loading && <Text>Loading...</Text>}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: 0 }]}> 
      <FlatList
        data={days}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={ListHeader}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              if (selectedDayId === item.id) {
                setSelectedDayId(null);
              } else {
                setSelectedDayId(item.id);
                fetchExercises(item.id);
              }
            }}
            style={styles.dayBox}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.dayName}>{item.name}</Text>
                <EditPencil onPress={() => handleEditDay(item.id, item.name)} accessibilityLabel={`Edit ${item.name}`} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Badge
                  text={`${(localCounts[item.id] ?? exerciseCounts[item.id] ?? 0)} ${(localCounts[item.id] ?? exerciseCounts[item.id] ?? 0) === 1 ? 'Exercise' : 'Exercises'}`}
                  backgroundColor={styles.exerciseCountBadge?.backgroundColor || colors.backgroundMuted}
                  color={styles.badgeText?.color || '#333'}
                  size="sm"
                  style={{ marginLeft: 8 }}
                />
              </View>
            </View>
            <View style={styles.dayActions}>
              <RemoveButton onPress={() => handleDeleteDay(item.id)} label="Delete" accessibilityLabel={`Delete ${item.name}`} />
            </View>
            {selectedDayId === item.id && (
              <View style={styles.exerciseSection}>
                <ExercisesList
                  exercises={exercises}
                  onEdit={(ex) => handleEditExercise(ex)}
                  onDelete={(id) => id && handleDeleteExercise(id)}
                  onAdd={async (ex) => {
                    if (!item.id) return;
                    // optimistic insert
                    const optimistic: ExerciseForm = { id: `tmp-${Date.now()}`, name: ex.name, sets: String(ex.sets), reps: String(ex.reps), notes: ex.notes };
                    setExercises(prev => [...prev, optimistic]);
                    setLocalCounts(prev => ({ ...prev, [item.id]: (prev[item.id] ?? exerciseCounts[item.id] ?? 0) + 1 }));
                    try {
                      await createExercise(item.id, optimistic);
                      // refresh authoritative data
                      await fetchExercises(item.id);
                      await fetchDays(profile?.id);
                    } catch (err: any) {
                      // rollback optimistic
                      setExercises(prev => prev.filter(e => e.id !== optimistic.id));
                      setLocalCounts(prev => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] ?? exerciseCounts[item.id] ?? 1) - 1) }));
                      Alert.alert('Error', err?.message || 'Failed to add exercise');
                    } finally {
                      setAddingEx(false);
                    }
                  }}
                  loading={exLoading}
                />
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      <AddDayModal
        visible={showAddDayModal}
        onClose={() => { setShowAddDayModal(false); setNewDayTab(0); setNewDayName(''); setExercises([]); }}
        tabIndex={newDayTab}
        setTabIndex={setNewDayTab}
        dayName={newDayName}
        setDayName={setNewDayName}
        exercises={exercises}
        setExercises={setExercises}
        creating={adding}
        onCreate={async () => {
          const created = await handleAddDay();
          if (!created || !created.id) return;
          const dayId = created.id;
          try {
            if (dayId && exercises.length > 0) {
              for (const ex of exercises) {
                try {
                  await createExercise(dayId, ex);
                } catch (err) {
                  console.warn('Failed to insert exercise', err);
                }
              }
              await fetchDays(profile?.id);
            }
          } finally {
            setNewDayName('');
            setExercises([]);
            setShowAddDayModal(false);
            setNewDayTab(0);
          }
        }}
      />

      

      <EditDayModal visible={showEditDayModal} onClose={() => setShowEditDayModal(false)} name={editingDayName} setName={setEditingDayName} onSave={handleSaveEditDay} />

      

      <EditExerciseModal
        visible={showEditExerciseModal}
        exercise={editingEx}
        setExercise={(e) => setEditingEx(e)}
        onClose={() => { setEditingExId(null); setEditingEx({ name: '', sets: '', reps: '', notes: '' }); setShowEditExerciseModal(false); }}
        onSave={handleSaveEditExercise}
        saving={false}
      />

      <EditExerciseModal
        visible={showPreviewEditModal}
        exercise={previewEditForm}
        setExercise={(e) => setPreviewEditForm(e)}
        onClose={() => { setEditingPreviewIdx(null); setPreviewEditForm({ name: '', sets: '', reps: '', notes: '' }); setShowPreviewEditModal(false); }}
        onSave={handleSavePreviewEdit}
        saving={false}
      />

      <DeleteConfirmModal visible={showDeleteConfirm} onCancel={() => { setShowDeleteConfirm(false); setDeleteTargetId(null); setDeleteTargetType(null); }} onConfirm={confirmDelete} targetType={deleteTargetType} />
    </View>
  );
}

// styles moved to ../styles/daysStyles.ts

