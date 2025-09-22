
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Alert, Keyboard, Modal, Platform, ToastAndroid, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles from '../styles/daysStyles';
import splitStyles from '../styles/splitsStyles';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../lib/profileStore';
import ModalButtons from '../components/ModalButtons';
import EditPencil from '../components/EditPencil';
import RemoveButton from '../components/RemoveButton';
import ConfirmModal from '../components/ConfirmModal';
import AddExercise from '../components/AddExercise';

export default function DaysTab() {
  const insets = useSafeAreaInsets();
  const profile = useProfileStore((state) => state.profile);
  const [days, setDays] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newDayName, setNewDayName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingDayName, setEditingDayName] = useState('');

  // Exercises state
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [exLoading, setExLoading] = useState(false);
  const [exerciseCounts, setExerciseCounts] = useState<Record<string, number>>({});
  const [newExercise, setNewExercise] = useState({ name: '', sets: '', reps: '', notes: '' });
  const [addingEx, setAddingEx] = useState(false);
  const [editingExId, setEditingExId] = useState<string | null>(null);
  const [editingEx, setEditingEx] = useState({ name: '', sets: '', reps: '', notes: '' });

  // Modal states
  const [showAddDayModal, setShowAddDayModal] = useState(false);
  const [newDayTab, setNewDayTab] = useState<number>(0);
  const [showEditDayModal, setShowEditDayModal] = useState(false);
  
  const [showEditExerciseModal, setShowEditExerciseModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetType, setDeleteTargetType] = useState<'day' | 'exercise' | null>(null);
  // Local modal preview edit state for Add Day exercises
  const [newModalEditIndex, setNewModalEditIndex] = useState<number | null>(null);
  const [newModalEditingEx, setNewModalEditingEx] = useState({ name: '', sets: '', reps: '', notes: '' });
  const [showPreviewDeleteConfirm, setShowPreviewDeleteConfirm] = useState(false);
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
      setExercises(data);
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
      const dayIds = data.map((d: any) => d.id);
      if (dayIds.length > 0) {
        const { data: exData } = await supabase
          .from('exercises')
          .select('id, day_id')
          .in('day_id', dayIds as string[]);
        const counts: Record<string, number> = {};
        (exData || []).forEach((e: any) => {
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
    if (!deleteTargetId || !deleteTargetType) return;
    try {
      if (deleteTargetType === 'exercise') {
        const { error } = await supabase.from('exercises').delete().eq('id', deleteTargetId);
        if (error) throw error;
        if (selectedDayId) fetchExercises(selectedDayId);
        // refresh counts
        fetchDays();
      } else if (deleteTargetType === 'day') {
        // delete exercises first, then day
        const { error: err1 } = await supabase.from('exercises').delete().eq('day_id', deleteTargetId);
        if (err1) throw err1;
        const { error: err2 } = await supabase.from('days').delete().eq('id', deleteTargetId);
        if (err2) throw err2;
        if (selectedDayId === deleteTargetId) setSelectedDayId(null);
        fetchDays();
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to delete');
    } finally {
      setShowDeleteConfirm(false);
      setDeleteTargetId(null);
      setDeleteTargetType(null);
    }
  };

  // Exercise handlers
  const handleAddExercise = async () => {
    if (!selectedDayId || !newExercise.name.trim() || !newExercise.sets || !newExercise.reps) {
      showValidationToast('Exercise name, sets, and reps are required');
      return;
    }
    setAddingEx(true);
    try {
      const { error } = await supabase.from('exercises').insert({
        day_id: selectedDayId,
        name: newExercise.name.trim(),
        sets: parseInt(newExercise.sets, 10),
        reps: parseInt(newExercise.reps, 10),
        notes: newExercise.notes,
      });
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        setNewExercise({ name: '', sets: '', reps: '', notes: '' });
        fetchExercises(selectedDayId);
        fetchDays();
      }
    } finally {
      setAddingEx(false);
    }
  };

  const handleEditExercise = (ex: any) => {
    setEditingExId(ex.id);
    setEditingEx({ name: ex.name, sets: String(ex.sets), reps: String(ex.reps), notes: ex.notes || '' });
    setShowEditExerciseModal(true);
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
                    {(exercises || []).map((ex) => (
                      <View key={ex.id} style={styles.exerciseBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.exerciseName}>{ex.name}</Text>
                            <Text style={styles.exerciseDetails}>{ex.sets} sets × {ex.reps} reps</Text>
                            {ex.notes ? <Text style={styles.exerciseNotes}>{ex.notes}</Text> : null}
                          </View>
                          <View style={[styles.exerciseActions, { alignSelf: 'center' }]}> 
                            <RemoveButton onPress={() => handleDeleteExercise(ex.id)} label="Delete" accessibilityLabel={`Delete ${ex.name}`} textStyle={styles.deleteTextSmall} />
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
                    <View key={ex.id || ex.name || idx} style={{ marginBottom: 8, padding: 8, borderRadius: 8, backgroundColor: '#f7f7f7' }}>
                      {newModalEditIndex === idx ? (
                        <View>
                          <TextInput value={newModalEditingEx.name} onChangeText={(v) => setNewModalEditingEx(prev => ({ ...prev, name: v }))} placeholder="Name" style={[styles.input, styles.textInput, { marginBottom: 6 }]} />
                          <View style={{ flexDirection: 'row' }}>
                            <TextInput value={newModalEditingEx.sets} onChangeText={(v) => setNewModalEditingEx(prev => ({ ...prev, sets: v }))} placeholder="Sets" style={[styles.input, styles.textInput, { flex: 1, marginRight: 6 }]} keyboardType="numeric" />
                            <TextInput value={newModalEditingEx.reps} onChangeText={(v) => setNewModalEditingEx(prev => ({ ...prev, reps: v }))} placeholder="Reps" style={[styles.input, styles.textInput, { flex: 1 }]} keyboardType="numeric" />
                          </View>
                          <TextInput value={newModalEditingEx.notes} onChangeText={(v) => setNewModalEditingEx(prev => ({ ...prev, notes: v }))} placeholder="Notes" style={[styles.input, styles.textInput, { marginTop: 6 }]} />
                          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                            <TouchableOpacity onPress={() => { setNewModalEditIndex(null); setNewModalEditingEx({ name: '', sets: '', reps: '', notes: '' }); }} style={{ marginRight: 8 }}>
                              <Text style={{ color: '#666' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => {
                              if (!newModalEditingEx.name.trim() || !newModalEditingEx.sets || !newModalEditingEx.reps) { showValidationToast('Exercise name, sets, and reps are required'); return; }
                              setExercises(prev => prev.map((p, i) => i === idx ? { ...p, ...newModalEditingEx } : p));
                              setNewModalEditIndex(null);
                              setNewModalEditingEx({ name: '', sets: '', reps: '', notes: '' });
                            }}>
                              <Text style={{ color: '#007AFF', fontWeight: '700' }}>Save</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <View>
                          <Text style={{ fontWeight: '600' }}>{ex.name}</Text>
                          <Text style={{ color: '#666' }}>{ex.sets} sets × {ex.reps} reps</Text>
                          {ex.notes ? <Text style={{ color: '#666' }}>{ex.notes}</Text> : null}
                          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, alignItems: 'center' }}>
                            <RemoveButton onPress={() => { setPreviewDeleteIndex(idx); setShowPreviewDeleteConfirm(true); }} label="Delete" accessibilityLabel={`Delete ${ex.name}`} textStyle={{ color: '#ff3b30', fontWeight: '700' }} />
                            <EditPencil onPress={() => { setNewModalEditIndex(idx); setNewModalEditingEx({ name: ex.name, sets: String(ex.sets), reps: String(ex.reps), notes: ex.notes || '' }); }} accessibilityLabel={`Edit ${ex.name}`} />
                          </View>
                        </View>
                      )}
                    </View>
                  ))}

                  <View style={{ marginTop: 8 }}>
                    <AddExercise
                      mode="inline"
                      onAdd={(ex) => {
                        setExercises(prev => [...prev, ex]);
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
                    onLeftPress={() => { setNewDayName(''); setExercises([]); setNewExercise({ name: '', sets: '', reps: '', notes: '' }); setShowAddDayModal(false); setNewDayTab(0); }}
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
                    onLeftPress={() => { setNewDayName(''); setExercises([]); setNewExercise({ name: '', sets: '', reps: '', notes: '' }); setShowAddDayModal(false); setNewDayTab(0); }}
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

      {/* Preview Delete Confirm for Add Day modal */}
      <ConfirmModal
        visible={showPreviewDeleteConfirm}
        title="Delete Exercise?"
        message="Are you sure you want to delete this exercise from the preview?"
        confirmLabel="Delete"
        onConfirm={() => {
          if (previewDeleteIndex !== null) {
            setExercises(prev => prev.filter((_, i) => i !== previewDeleteIndex));
          }
          setShowPreviewDeleteConfirm(false);
          setPreviewDeleteIndex(null);
        }}
        onCancel={() => { setShowPreviewDeleteConfirm(false); setPreviewDeleteIndex(null); }}
        confirmColor="#ff3b30"
      />

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

      

      {/* Edit Exercise Modal */}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <TextInput
                  style={[styles.input, styles.textInput]}
                  placeholder="e.g. Bench Press"
                  value={editingEx.name}
                  onChangeText={v => setEditingEx(e => ({ ...e, name: v }))}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>

              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ marginBottom: 4, fontWeight: '500' }}>Sets:</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 0 }}>
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
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={{ marginBottom: 4, fontWeight: '500' }}>Reps:</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 0 }}>
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

              <View>
                <ModalButtons
                  leftLabel="Cancel"
                  rightLabel="Save"
                  onLeftPress={() => { setEditingExId(null); setEditingEx({ name: '', sets: '', reps: '', notes: '' }); setShowEditExerciseModal(false); }}
                  onRightPress={handleSaveEditExercise}
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
                Are you sure you want to permanently delete this {deleteTargetType}? This action cannot be undone.
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

