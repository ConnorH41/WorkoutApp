
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Alert, Keyboard, Modal, Platform, ToastAndroid, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles from '../styles/daysStyles';
import splitStyles from '../styles/splitsStyles';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../lib/profileStore';
import { Day, Exercise, ExerciseForm, DeleteTargetType } from '../lib/types';
import ModalButtons from '../components/ModalButtons';
import EditPencil from '../components/EditPencil';
import RemoveButton from '../components/RemoveButton';
import ConfirmModal from '../components/ConfirmModal';
import AddExercise from '../components/AddExercise';

export default function DaysTab() {
  const insets = useSafeAreaInsets();
  const profile = useProfileStore((state) => state.profile);
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(false);
  const [newDayName, setNewDayName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingDayName, setEditingDayName] = useState('');

  // Exercises state
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseForm[]>([]);
  const [exLoading, setExLoading] = useState(false);
  const [exerciseCounts, setExerciseCounts] = useState<Record<string, number>>({});
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
  const fetchExercises = async (dayId: string) => {
    setExLoading(true);
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('day_id', dayId)
      .order('created_at', { ascending: true });
    if (!error && data) {
      // Map DB exercise rows to ExerciseForm which uses string fields for inputs
      const mapped = (data as Exercise[]).map(e => ({
        id: e.id,
        day_id: e.day_id,
        name: e.name,
        sets: String(e.sets),
        reps: String(e.reps),
        notes: e.notes || ''
      }));
      setExercises(mapped);
    }
    setExLoading(false);
  };

  // Day CRUD
  const fetchDays = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('days')
      .select('*')
      .eq('user_id', profile?.id)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setDays(data);
  const dayIds = data.map((d: Day) => d.id);
      if (dayIds.length > 0) {
        const { data: exData } = await supabase
          .from('exercises')
          .select('id, day_id')
          .in('day_id', dayIds as string[]);
        const counts: Record<string, number> = {};
        (exData || []).forEach((e: { day_id: string }) => {
          counts[e.day_id] = (counts[e.day_id] || 0) + 1;
        });
        setExerciseCounts(counts);
      } else {
        setExerciseCounts({});
      }
    }
    setLoading(false);
  };

  const handleAddDay = async () => {
    if (!newDayName.trim()) {
      showValidationToast('Day name is required');
      return null;
    }
    setAdding(true);
    try {
      const { data, error } = await supabase.from('days').insert({ name: newDayName.trim(), user_id: profile?.id }).select();
      if (error) {
        Alert.alert('Error', error.message);
        return null;
      }
      const created = data && data.length > 0 ? data[0] : null;
      setNewDayName('');
      await fetchDays();
      return created;
    } finally {
      setAdding(false);
    }
  };

  const handleEditDay = (id: string, name: string) => {
    setEditingDayId(id);
    setEditingDayName(name);
    setShowEditDayModal(true);
  };

  const handleSaveEditDay = async () => {
    if (!editingDayId || !editingDayName.trim()) {
      showValidationToast('Day name is required');
      return;
    }
    try {
      const { error } = await supabase.from('days').update({ name: editingDayName.trim() }).eq('id', editingDayId);
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        setEditingDayId(null);
        setEditingDayName('');
        setShowEditDayModal(false);
        fetchDays();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update day');
    }
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

  const confirmDelete = async () => {
    if (!deleteTargetType) return;
    try {
      if (deleteTargetType === 'exercise') {
        if (!deleteTargetId) return;
        const { error } = await supabase.from('exercises').delete().eq('id', deleteTargetId);
        if (error) throw error;
        if (selectedDayId) fetchExercises(selectedDayId);
        // refresh counts
        fetchDays();
      } else if (deleteTargetType === 'day') {
        if (!deleteTargetId) return;
        // delete exercises first, then day
        const { error: err1 } = await supabase.from('exercises').delete().eq('day_id', deleteTargetId);
        if (err1) throw err1;
        const { error: err2 } = await supabase.from('days').delete().eq('id', deleteTargetId);
        if (err2) throw err2;
        if (selectedDayId === deleteTargetId) setSelectedDayId(null);
        fetchDays();
      } else if (deleteTargetType === 'preview') {
        if (previewDeleteIndex !== null) {
          setExercises(prev => prev.filter((_, i) => i !== previewDeleteIndex));
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to delete');
    } finally {
      setShowDeleteConfirm(false);
      setDeleteTargetId(null);
      setDeleteTargetType(null);
      setPreviewDeleteIndex(null);
    }
  };

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
      const { error } = await supabase.from('exercises').update({
        name: editingEx.name.trim(),
        sets: parseInt(editingEx.sets, 10),
        reps: parseInt(editingEx.reps, 10),
        notes: editingEx.notes,
      }).eq('id', editingExId);
      if (error) {
        Alert.alert('Error', error.message);
      } else if (selectedDayId) {
        setEditingExId(null);
        setEditingEx({ name: '', sets: '', reps: '', notes: '' });
        setShowEditExerciseModal(false);
        fetchExercises(selectedDayId);
        fetchDays();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update exercise');
    }
  };

  useEffect(() => {
    if (profile && profile.id) {
      fetchDays();
    }
  }, [profile?.id]);

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
      {loading && <Text>Loading...</Text>}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}> 
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
                <View style={styles.exerciseCountBadge}>
                  <Text style={styles.badgeText}>
                    { (exerciseCounts[item.id] ?? 0) } { (exerciseCounts[item.id] ?? 0) === 1 ? 'Exercise' : 'Exercises' }
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.dayActions}>
              <RemoveButton onPress={() => handleDeleteDay(item.id)} label="Delete" accessibilityLabel={`Delete ${item.name}`} />
            </View>
            {selectedDayId === item.id && (
              <View style={styles.exerciseSection}>
                <Text style={styles.exerciseTitle}>Exercises</Text>
                {exLoading ? <Text>Loading...</Text> : (
                  <View>
                    {(exercises || []).map((ex, i) => (
                      <View key={ex.id ?? `${ex.name}-${i}`} style={styles.exerciseBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.exerciseName}>{ex.name}</Text>
                            <Text style={styles.exerciseDetails}>{ex.sets} sets × {ex.reps} reps</Text>
                            {ex.notes ? <Text style={styles.exerciseNotes}>{ex.notes}</Text> : null}
                          </View>
                          <View style={[styles.exerciseActions, { alignSelf: 'center' }]}> 
                            <RemoveButton onPress={() => ex.id && handleDeleteExercise(ex.id)} label="Delete" accessibilityLabel={`Delete ${ex.name}`} textStyle={styles.deleteTextSmall} />
                            <EditPencil onPress={() => handleEditExercise(ex)} accessibilityLabel={`Edit ${ex.name}`} />
                          </View>
                        </View>
                      </View>
                    ))}
                    <AddExercise
                      mode="modal"
                      adding={addingEx}
                      onAdd={async (ex) => {
                        if (!item.id) return;
                        setAddingEx(true);
                        try {
                          const { error } = await supabase.from('exercises').insert({
                            day_id: item.id,
                            name: ex.name,
                            sets: parseInt(String(ex.sets), 10),
                            reps: parseInt(String(ex.reps), 10),
                            notes: ex.notes,
                          });
                          if (error) {
                            Alert.alert('Error', error.message);
                          } else {
                            fetchExercises(item.id);
                            fetchDays();
                          }
                        } finally {
                          setAddingEx(false);
                        }
                      }}
                    />
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      {/* Add Day Modal */}
      <Modal
        visible={showAddDayModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddDayModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, width: '90%', maxWidth: 420, maxHeight: '90%' }}>
            <View style={{ flexDirection: 'row', marginBottom: 20, backgroundColor: '#f0f0f0', borderRadius: 8, padding: 4 }}>
              <TouchableOpacity
                style={[splitStyles.tabButton, { backgroundColor: newDayTab === 0 ? '#007AFF' : 'transparent' }]}
                onPress={() => setNewDayTab(0)}
              >
                <Text style={{ color: newDayTab === 0 ? '#fff' : '#333', fontWeight: 'bold', fontSize: 12 }}>1. General</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[splitStyles.tabButton, { backgroundColor: newDayTab === 1 ? '#007AFF' : 'transparent' }]}
                onPress={() => setNewDayTab(1)}
              >
                <Text style={{ color: newDayTab === 1 ? '#fff' : '#333', fontWeight: 'bold', fontSize: 12 }}>2. Exercises</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
              {newDayTab === 0 && (
                <>
                  <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Add New Day</Text>

                  <Text style={{ marginBottom: 4, fontWeight: '500' }}>Day Name:</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <TextInput
                      style={[styles.input, styles.textInput]}
                      placeholder="e.g. Upper A, Push Day"
                      value={newDayName}
                      onChangeText={setNewDayName}
                      returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                    />
                  </View>
                </>
              )}

              {newDayTab === 1 && (
                <>
                  <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Exercises</Text>
                  {/* Exercise list preview while adding a day (not yet persisted) */}
                  {(exercises || []).map((ex, idx) => (
                    <View key={ex.id || ex.name || idx} style={styles.exerciseBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.exerciseName}>{ex.name}</Text>
                          <Text style={styles.exerciseDetails}>{ex.sets} sets × {ex.reps} reps</Text>
                          {ex.notes ? <Text style={styles.exerciseNotes}>{ex.notes}</Text> : null}
                        </View>
                        <View style={[styles.exerciseActions, { alignSelf: 'center' }]}> 
                          <RemoveButton 
                            onPress={() => handleDeletePreviewExercise(idx)} 
                            label="Delete" 
                            accessibilityLabel={`Delete ${ex.name}`} 
                            textStyle={styles.deleteTextSmall} 
                          />
                          <EditPencil 
                            onPress={() => handleEditPreviewExercise(idx)} 
                            accessibilityLabel={`Edit ${ex.name}`} 
                          />
                        </View>
                      </View>
                    </View>
                  ))}

                  <View style={{ marginTop: 8 }}>
                    <AddExercise
                      mode="modal"
                      addButtonText="Add Exercise"
                      onAdd={(ex) => {
                        // Normalize to ExerciseForm (strings for sets/reps)
                        const form: ExerciseForm = { name: ex.name, sets: String(ex.sets), reps: String(ex.reps), notes: ex.notes };
                        setExercises(prev => [...prev, form]);
                      }}
                    />
                  </View>

                  
                </>
              )}

              <View style={{ marginTop: 12 }}>
                {newDayTab < 1 ? (
                  <ModalButtons
                    leftLabel="Cancel"
                    rightLabel="Next"
                    onLeftPress={() => { setNewDayName(''); setExercises([]); setShowAddDayModal(false); setNewDayTab(0); }}
                    onRightPress={() => setNewDayTab(newDayTab + 1)}
                    leftColor="#e0e0e0"
                    rightColor="#007AFF"
                    leftTextColor="#333"
                    rightTextColor="#fff"
                  />
                ) : (
                  <ModalButtons
                    leftLabel="Cancel"
                    rightLabel={adding ? 'Creating...' : 'Create'}
                    onLeftPress={() => { setNewDayName(''); setExercises([]); setShowAddDayModal(false); setNewDayTab(0); }}
                    onRightPress={async () => {
                      const created = await handleAddDay();
                      if (!created || !created.id) return;
                      const dayId = created.id;
                      try {
                        if (dayId && exercises.length > 0) {
                          for (const ex of exercises) {
                            const { error } = await supabase.from('exercises').insert({ day_id: dayId, name: ex.name, sets: parseInt(String(ex.sets), 10), reps: parseInt(String(ex.reps), 10), notes: ex.notes });
                            if (error) console.warn('Failed to insert exercise', error.message);
                          }
                          await fetchDays();
                        }
                      } finally {
                        setNewDayName('');
                        setExercises([]);
                        setShowAddDayModal(false);
                        setNewDayTab(0);
                      }
                    }}
                    leftColor="#e0e0e0"
                    rightColor="#007AFF"
                    leftTextColor="#333"
                    rightTextColor="#fff"
                    rightDisabled={adding}
                  />
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      

      {/* Edit Day Modal */}
      <Modal
        visible={showEditDayModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditDayModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, width: '90%', maxWidth: 420, maxHeight: '90%' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Edit Day</Text>

              <Text style={{ marginBottom: 4, fontWeight: '500' }}>Day Name:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <TextInput
                  style={[styles.input, styles.textInput]}
                  placeholder="e.g. Upper A, Push Day"
                  value={editingDayName}
                  onChangeText={setEditingDayName}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>

              <View>
                <ModalButtons
                  leftLabel="Cancel"
                  rightLabel="Save"
                  onLeftPress={() => { setEditingDayId(null); setEditingDayName(''); setShowEditDayModal(false); }}
                  onRightPress={handleSaveEditDay}
                  leftColor="#e0e0e0"
                  rightColor="#007AFF"
                  leftTextColor="#333"
                  rightTextColor="#fff"
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      

      {/* Edit Exercise Modal for Expanded Day */}
      <Modal
        visible={showEditExerciseModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditExerciseModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, width: '90%', maxWidth: 420, maxHeight: '90%' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Edit Exercise</Text>
              
              <Text style={{ marginBottom: 4, fontWeight: '500' }}>Exercise Name:</Text>
              <TextInput
                style={[styles.input, styles.textInput, { marginBottom: 8 }]}
                placeholder="e.g. Bench Press"
                value={editingEx.name}
                onChangeText={v => setEditingEx(e => ({ ...e, name: v }))}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />

              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ marginBottom: 4, fontWeight: '500' }}>Sets:</Text>
                  <TextInput
                    style={[styles.input, styles.textInput]}
                    placeholder="3"
                    value={editingEx.sets}
                    onChangeText={v => setEditingEx(e => ({ ...e, sets: v }))}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={{ marginBottom: 4, fontWeight: '500' }}>Reps:</Text>
                  <TextInput
                    style={[styles.input, styles.textInput]}
                    placeholder="8-12"
                    value={editingEx.reps}
                    onChangeText={v => setEditingEx(e => ({ ...e, reps: v }))}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                </View>
              </View>

              <Text style={{ marginBottom: 4, fontWeight: '500' }}>Notes (optional):</Text>
              <TextInput
                style={[styles.input, styles.textInputMultiline, { marginBottom: 16 }]}
                placeholder="e.g. Focus on form, increase weight next week"
                value={editingEx.notes}
                onChangeText={v => setEditingEx(e => ({ ...e, notes: v }))}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                multiline
                numberOfLines={3}
              />

              <ModalButtons
                leftLabel="Cancel"
                rightLabel="Save"
                onLeftPress={() => { 
                  setEditingExId(null); 
                  setEditingEx({ name: '', sets: '', reps: '', notes: '' }); 
                  setShowEditExerciseModal(false); 
                }}
                onRightPress={handleSaveEditExercise}
                leftColor="#e0e0e0"
                rightColor="#007AFF"
                leftTextColor="#333"
                rightTextColor="#fff"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Preview Exercise Modal for Add Day */}
      <Modal
        visible={showPreviewEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPreviewEditModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, width: '90%', maxWidth: 420, maxHeight: '90%' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Edit Exercise</Text>
              
              <Text style={{ marginBottom: 4, fontWeight: '500' }}>Exercise Name:</Text>
              <TextInput
                style={[styles.input, styles.textInput, { marginBottom: 8 }]}
                placeholder="e.g. Bench Press"
                value={previewEditForm.name}
                onChangeText={v => setPreviewEditForm(e => ({ ...e, name: v }))}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />

              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ marginBottom: 4, fontWeight: '500' }}>Sets:</Text>
                  <TextInput
                    style={[styles.input, styles.textInput]}
                    placeholder="3"
                    value={previewEditForm.sets}
                    onChangeText={v => setPreviewEditForm(e => ({ ...e, sets: v }))}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={{ marginBottom: 4, fontWeight: '500' }}>Reps:</Text>
                  <TextInput
                    style={[styles.input, styles.textInput]}
                    placeholder="8-12"
                    value={previewEditForm.reps}
                    onChangeText={v => setPreviewEditForm(e => ({ ...e, reps: v }))}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                </View>
              </View>

              <Text style={{ marginBottom: 4, fontWeight: '500' }}>Notes (optional):</Text>
              <TextInput
                style={[styles.input, styles.textInputMultiline, { marginBottom: 16 }]}
                placeholder="e.g. Focus on form, increase weight next week"
                value={previewEditForm.notes}
                onChangeText={v => setPreviewEditForm(e => ({ ...e, notes: v }))}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                multiline
                numberOfLines={3}
              />

              <ModalButtons
                leftLabel="Cancel"
                rightLabel="Save"
                onLeftPress={() => { 
                  setEditingPreviewIdx(null);
                  setPreviewEditForm({ name: '', sets: '', reps: '', notes: '' }); 
                  setShowPreviewEditModal(false); 
                }}
                onRightPress={handleSavePreviewEdit}
                leftColor="#e0e0e0"
                rightColor="#007AFF"
                leftTextColor="#333"
                rightTextColor="#fff"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, width: '90%', maxWidth: 420 }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>
                Delete {deleteTargetType === 'day' ? 'Day' : 'Exercise'}?
              </Text>
              <Text style={{ marginBottom: 16 }}>
                Are you sure you want to permanently delete this {deleteTargetType === 'day' ? 'day' : 'exercise'}? This action cannot be undone.
              </Text>
              <View>
                <ModalButtons
                  leftLabel="Cancel"
                  rightLabel="Delete"
                  onLeftPress={() => { setShowDeleteConfirm(false); setDeleteTargetId(null); setDeleteTargetType(null); }}
                  onRightPress={confirmDelete}
                  leftColor="#e0e0e0"
                  rightColor="#ff3b30"
                  leftTextColor="#333"
                  rightTextColor="#fff"
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// styles moved to ../styles/daysStyles.ts

