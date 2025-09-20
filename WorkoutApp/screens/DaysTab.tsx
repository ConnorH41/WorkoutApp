
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Button, FlatList, TouchableOpacity, Alert, Keyboard, Modal, Platform, ToastAndroid, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../lib/profileStore';
import ModalButtons from '../components/ModalButtons';
import EditPencil from '../components/EditPencil';

export default function DaysTab() {
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
  const [newExercise, setNewExercise] = useState({ name: '', sets: '', reps: '', notes: '' });
  const [addingEx, setAddingEx] = useState(false);
  const [editingExId, setEditingExId] = useState<string | null>(null);
  const [editingEx, setEditingEx] = useState({ name: '', sets: '', reps: '', notes: '' });
  // Modal states
  const [showAddDayModal, setShowAddDayModal] = useState(false);
  const [showEditDayModal, setShowEditDayModal] = useState(false);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [showEditExerciseModal, setShowEditExerciseModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetType, setDeleteTargetType] = useState<'day' | 'exercise' | null>(null);

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

  // Add exercise
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
        sets: parseInt(newExercise.sets),
        reps: parseInt(newExercise.reps),
        notes: newExercise.notes,
      });
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        setNewExercise({ name: '', sets: '', reps: '', notes: '' });
        setShowAddExerciseModal(false);
        fetchExercises(selectedDayId);
      }
    } finally {
      setAddingEx(false);
    }
  };

  // Delete exercise
  const handleDeleteExercise = async (id: string) => {
    setDeleteTargetId(id);
    setDeleteTargetType('exercise');
    setShowDeleteConfirm(true);
  };

  // Edit exercise
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
        sets: parseInt(editingEx.sets),
        reps: parseInt(editingEx.reps),
        notes: editingEx.notes,
      }).eq('id', editingExId);
      if (error) {
        Alert.alert('Error', error.message);
      } else if (selectedDayId) {
        setEditingExId(null);
        setEditingEx({ name: '', sets: '', reps: '', notes: '' });
        setShowEditExerciseModal(false);
        fetchExercises(selectedDayId);
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

  const fetchDays = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('days')
      .select('*')
      .eq('user_id', profile?.id)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setDays(data);
    }
    setLoading(false);
  };

  const handleAddDay = async () => {
    if (!newDayName.trim()) {
      showValidationToast('Day name is required');
      return false;
    }
    if (!profile || !profile.id) {
      Alert.alert('Error', 'You must be signed in to create a day');
      return false;
    }
    setAdding(true);
    try {
      const { error } = await supabase.from('days').insert({
        user_id: profile.id,
        name: newDayName.trim(),
      });
      if (error) {
        Alert.alert('Error', error.message);
        return false;
      } else {
        setNewDayName('');
        fetchDays();
        return true;
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteDay = async (id: string) => {
    setDeleteTargetId(id);
    setDeleteTargetType('day');
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId || !deleteTargetType) return;
    
    try {
      if (deleteTargetType === 'day') {
        const { error } = await supabase.from('days').delete().eq('id', deleteTargetId);
        if (error) {
          Alert.alert('Error', error.message);
        } else {
          fetchDays();
        }
      } else if (deleteTargetType === 'exercise') {
        const { error } = await supabase.from('exercises').delete().eq('id', deleteTargetId);
        if (error) {
          Alert.alert('Error', error.message);
        } else if (selectedDayId) {
          fetchExercises(selectedDayId);
        }
      }
    } finally {
      setShowDeleteConfirm(false);
      setDeleteTargetId(null);
      setDeleteTargetType(null);
    }
  };

  const handleEditDay = (id: string, name: string) => {
    setEditingDayId(id);
    setEditingDayName(name);
    setShowEditDayModal(true);
  };

  const newDayInputRef = useRef<any>(null);

  const focusNewDayInput = () => {
    try {
      newDayInputRef.current?.focus();
    } catch (e) {}
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
    } catch (error) {
      Alert.alert('Error', 'Failed to update day');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Days</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddDayModal(true)}
        >
          <Text style={styles.addButtonText}>Add New Day</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={days}
          keyExtractor={(item) => item.id}
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
                      {exercises.length} {exercises.length === 1 ? 'Exercise' : 'Exercises'}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.dayActions}>
                <TouchableOpacity onPress={() => handleDeleteDay(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
              {selectedDayId === item.id && (
                <View style={styles.exerciseSection}>
                  <Text style={styles.exerciseTitle}>Exercises</Text>
                  {exLoading ? <Text>Loading...</Text> : (
                    <View>
                      <FlatList
                        data={exercises}
                        keyExtractor={ex => ex.id}
                        renderItem={({ item: ex }) => (
                          <View style={styles.exerciseBox}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.exerciseName}>{ex.name}</Text>
                                <Text style={styles.exerciseDetails}>{ex.sets} sets × {ex.reps} reps</Text>
                                {ex.notes ? <Text style={styles.exerciseNotes}>{ex.notes}</Text> : null}
                              </View>
                              <View style={styles.exerciseActions}>
                                <TouchableOpacity onPress={() => handleDeleteExercise(ex.id)}>
                                  <Text style={styles.deleteTextSmall}>Delete</Text>
                                </TouchableOpacity>
                                <EditPencil onPress={() => handleEditExercise(ex)} accessibilityLabel={`Edit ${ex.name}`} />
                              </View>
                            </View>
                          </View>
                        )}
                      />
                      <TouchableOpacity
                        style={{ marginTop: 6 }}
                        onPress={() => {
                          setSelectedDayId(item.id);
                          fetchExercises(item.id);
                          setShowAddExerciseModal(true);
                        }}
                      >
                        <Text style={styles.addExerciseLink}>+ Add Exercise</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      {/* Add Day Modal */}
      <Modal
        visible={showAddDayModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddDayModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, width: '90%', maxWidth: 420, maxHeight: '90%' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
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

              <View>
                <ModalButtons
                  leftLabel="Cancel"
                  rightLabel={adding ? 'Adding...' : 'Add Day'}
                  onLeftPress={() => { setNewDayName(''); setShowAddDayModal(false); }}
                  onRightPress={async () => { const ok = await handleAddDay(); if (ok) setShowAddDayModal(false); }}
                  leftColor="#e0e0e0"
                  rightColor="#007AFF"
                  leftTextColor="#333"
                  rightTextColor="#fff"
                  rightDisabled={adding}
                />
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

      {/* Add Exercise Modal */}
      <Modal
        visible={showAddExerciseModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddExerciseModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, width: '90%', maxWidth: 420, maxHeight: '90%' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Add Exercise</Text>
              
              <Text style={{ marginBottom: 4, fontWeight: '500' }}>Exercise Name:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <TextInput
                  style={[styles.input, styles.textInput]}
                  placeholder="e.g. Bench Press"
                  value={newExercise.name}
                  onChangeText={v => setNewExercise(e => ({ ...e, name: v }))}
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
                      value={newExercise.sets}
                      onChangeText={v => setNewExercise(e => ({ ...e, sets: v }))}
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
                      value={newExercise.reps}
                      onChangeText={v => setNewExercise(e => ({ ...e, reps: v }))}
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
                value={newExercise.notes}
                onChangeText={v => setNewExercise(e => ({ ...e, notes: v }))}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                multiline
                numberOfLines={3}
              />

              <View>
                <ModalButtons
                  leftLabel="Cancel"
                  rightLabel={addingEx ? 'Adding...' : 'Add Exercise'}
                  onLeftPress={() => { setNewExercise({ name: '', sets: '', reps: '', notes: '' }); setShowAddExerciseModal(false); }}
                  onRightPress={handleAddExercise}
                  leftColor="#e0e0e0"
                  rightColor="#007AFF"
                  leftTextColor="#333"
                  rightTextColor="#fff"
                  rightDisabled={addingEx}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
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
  },
  dayBox: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
    backgroundColor: '#fafafa',
  },
  dayName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  exerciseCountBadge: {
    backgroundColor: '#e6f0ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  dayActions: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 10,
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  primaryBtn: {
    backgroundColor: '#007AFF',
  },
  primaryBtnText: {
    color: '#fff',
  },
  dangerBtn: {
    backgroundColor: '#ff3b30',
    borderWidth: 0,
  },
  dangerBtnText: {
    color: '#fff',
  },
  exerciseSection: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  exerciseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  exerciseBox: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  exerciseDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  exerciseNotes: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 8,
    padding: 6,
    borderRadius: 20,
  },
  deleteText: {
    color: '#ff3b30',
    fontWeight: '600',
  },
  deleteTextSmall: {
    color: '#ff3b30',
    fontWeight: '600',
    marginRight: 8,
  },
  addExerciseLink: {
    color: '#007AFF',
    fontWeight: '700',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
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
});

