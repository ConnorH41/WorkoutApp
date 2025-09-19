
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Button, FlatList, TouchableOpacity, Alert, Keyboard, Modal } from 'react-native';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../lib/profileStore';

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
    if (!selectedDayId || !newExercise.name.trim() || !newExercise.sets || !newExercise.reps) return;
    setAddingEx(true);
    const { error } = await supabase.from('exercises').insert({
      day_id: selectedDayId,
      name: newExercise.name.trim(),
      sets: parseInt(newExercise.sets),
      reps: parseInt(newExercise.reps),
      notes: newExercise.notes,
    });
    setAddingEx(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setNewExercise({ name: '', sets: '', reps: '', notes: '' });
      fetchExercises(selectedDayId);
    }
  };

  // Delete exercise
  const handleDeleteExercise = async (id: string) => {
    Alert.alert('Delete Exercise', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('exercises').delete().eq('id', id);
          if (error) {
            Alert.alert('Error', error.message);
          } else if (selectedDayId) {
            fetchExercises(selectedDayId);
          }
        }
      }
    ]);
  };

  // Edit exercise
  const handleEditExercise = (ex: any) => {
    setEditingExId(ex.id);
    setEditingEx({ name: ex.name, sets: String(ex.sets), reps: String(ex.reps), notes: ex.notes || '' });
  };

  const handleSaveEditExercise = async () => {
    if (!editingExId || !editingEx.name.trim() || !editingEx.sets || !editingEx.reps) return;
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
      fetchExercises(selectedDayId);
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
      Alert.alert('Validation', 'Day name is required');
      return false;
    }
    if (!profile || !profile.id) return false;
    setAdding(true);
    const { error } = await supabase.from('days').insert({
      user_id: profile.id,
      name: newDayName.trim(),
    });
    setAdding(false);
    if (error) {
      Alert.alert('Error', error.message);
      return false;
    } else {
      setNewDayName('');
      fetchDays();
      return true;
    }
  };

  const handleDeleteDay = async (id: string) => {
    Alert.alert('Delete Day', 'Are you sure you want to delete this day?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('days').delete().eq('id', id);
          if (error) {
            Alert.alert('Error', error.message);
          } else {
            fetchDays();
          }
        }
      }
    ]);
  };

  const handleEditDay = (id: string, name: string) => {
    setEditingDayId(id);
    setEditingDayName(name);
  };

  const newDayInputRef = useRef<any>(null);

  const focusNewDayInput = () => {
    try {
      newDayInputRef.current?.focus();
    } catch (e) {}
  };

  const [showAddDayModal, setShowAddDayModal] = useState(false);
  const openAddDayModal = () => setShowAddDayModal(true);
  const closeAddDayModal = () => setShowAddDayModal(false);

  const handleSaveEditDay = async () => {
    if (!editingDayId || !editingDayName.trim()) return;
    const { error } = await supabase.from('days').update({ name: editingDayName.trim() }).eq('id', editingDayId);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setEditingDayId(null);
      setEditingDayName('');
      fetchDays();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Days</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddDayModal}>
          <Text style={styles.addButtonText}>Add Day</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Add new day (e.g. Upper A)"
          value={newDayName}
          onChangeText={setNewDayName}
          ref={newDayInputRef}
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        <Button title={adding ? 'Adding...' : 'Add'} onPress={handleAddDay} disabled={adding} />
      </View>

      <Modal visible={showAddDayModal} animationType="slide" transparent={true} onRequestClose={closeAddDayModal}>
        <View style={modalStyles.backdrop}>
          <View style={modalStyles.modalCard}>
            <Text style={modalStyles.modalTitle}>Day Name:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <TextInput
                style={{ width: '100%', marginBottom: 8, height: 35, fontSize: 16, textAlignVertical: 'top', padding: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 4 }}
                placeholder="e.g. Upper A"
                value={newDayName}
                onChangeText={setNewDayName}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                multiline
                numberOfLines={2}
                autoFocus
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <TouchableOpacity style={[styles.modalButton, { marginRight: 8 }]} onPress={() => { setNewDayName(''); closeAddDayModal(); }}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.primaryBtn]} onPress={async () => { const ok = await handleAddDay(); if (ok) { closeAddDayModal(); } }}>
                <Text style={styles.primaryBtnText}>{adding ? 'Adding...' : 'Add Day'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={days}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.dayBox}>
              {editingDayId === item.id ? (
                <>
                  <TextInput
                    style={styles.input}
                    value={editingDayName}
                    onChangeText={setEditingDayName}
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                  <Button title="Save" onPress={handleSaveEditDay} />
                  <Button title="Cancel" onPress={() => setEditingDayId(null)} />
                </>
              ) : (
                <>
                  <TouchableOpacity onPress={() => {
                    if (selectedDayId === item.id) {
                      setSelectedDayId(null);
                    } else {
                      setSelectedDayId(item.id);
                      fetchExercises(item.id);
                    }
                  }}>
                    <Text style={styles.dayName}>{item.name}</Text>
                  </TouchableOpacity>
                  <View style={styles.dayActions}>
                    <TouchableOpacity onPress={() => handleEditDay(item.id, item.name)}>
                      <Text style={styles.editBtn}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteDay(item.id)}>
                      <Text style={styles.deleteBtn}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                  {selectedDayId === item.id && (
                    <View style={styles.exerciseSection}>
                      <Text style={styles.exerciseTitle}>Exercises</Text>
                      <View style={styles.row}>
                        <TextInput
                          style={styles.input}
                          placeholder="Exercise name"
                          value={newExercise.name}
                          onChangeText={v => setNewExercise(e => ({ ...e, name: v }))}
                          returnKeyType="done"
                          onSubmitEditing={() => Keyboard.dismiss()}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="Sets"
                          value={newExercise.sets}
                          onChangeText={v => setNewExercise(e => ({ ...e, sets: v }))}
                          keyboardType="numeric"
                          returnKeyType="done"
                          onSubmitEditing={() => Keyboard.dismiss()}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="Reps"
                          value={newExercise.reps}
                          onChangeText={v => setNewExercise(e => ({ ...e, reps: v }))}
                          keyboardType="numeric"
                          returnKeyType="done"
                          onSubmitEditing={() => Keyboard.dismiss()}
                        />
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="Notes (optional)"
                        value={newExercise.notes}
                        onChangeText={v => setNewExercise(e => ({ ...e, notes: v }))}
                        returnKeyType="done"
                        onSubmitEditing={() => Keyboard.dismiss()}
                      />
                      <Button title={addingEx ? 'Adding...' : 'Add Exercise'} onPress={handleAddExercise} disabled={addingEx} />
                      {exLoading ? <Text>Loading...</Text> : (
                        <FlatList
                          data={exercises}
                          keyExtractor={ex => ex.id}
                          renderItem={({ item: ex }) => (
                            <View style={styles.exerciseBox}>
                              {editingExId === ex.id ? (
                                <>
                                  <TextInput
                                    style={styles.input}
                                    value={editingEx.name}
                                    onChangeText={v => setEditingEx(e => ({ ...e, name: v }))}
                                    returnKeyType="done"
                                    onSubmitEditing={() => Keyboard.dismiss()}
                                  />
                                  <TextInput
                                    style={styles.input}
                                    value={editingEx.sets}
                                    onChangeText={v => setEditingEx(e => ({ ...e, sets: v }))}
                                    keyboardType="numeric"
                                    returnKeyType="done"
                                    onSubmitEditing={() => Keyboard.dismiss()}
                                  />
                                  <TextInput
                                    style={styles.input}
                                    value={editingEx.reps}
                                    onChangeText={v => setEditingEx(e => ({ ...e, reps: v }))}
                                    keyboardType="numeric"
                                    returnKeyType="done"
                                    onSubmitEditing={() => Keyboard.dismiss()}
                                  />
                                  <TextInput
                                    style={styles.input}
                                    value={editingEx.notes}
                                    onChangeText={v => setEditingEx(e => ({ ...e, notes: v }))}
                                    returnKeyType="done"
                                    onSubmitEditing={() => Keyboard.dismiss()}
                                  />
                                  <Button title="Save" onPress={handleSaveEditExercise} />
                                  <Button title="Cancel" onPress={() => setEditingExId(null)} />
                                </>
                              ) : (
                                <>
                                  <Text style={styles.exerciseName}>{ex.name} ({ex.sets} x {ex.reps})</Text>
                                  {ex.notes ? <Text style={styles.exerciseNotes}>{ex.notes}</Text> : null}
                                  <View style={styles.dayActions}>
                                    <TouchableOpacity onPress={() => handleEditExercise(ex)}>
                                      <Text style={styles.editBtn}>Edit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDeleteExercise(ex.id)}>
                                      <Text style={styles.deleteBtn}>Delete</Text>
                                    </TouchableOpacity>
                                  </View>
                                </>
                              )}
                            </View>
                          )}
                        />
                      )}
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        />
      )}
    </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  dayName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dayActions: {
    flexDirection: 'row',
    marginTop: 4,
  },
  editBtn: {
    color: 'blue',
    marginRight: 16,
  },
  deleteBtn: {
    color: 'red',
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
    padding: 8,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  exerciseNotes: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  primaryBtn: {
    backgroundColor: '#007AFF',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
});
