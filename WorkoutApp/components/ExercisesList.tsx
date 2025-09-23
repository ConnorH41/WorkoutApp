import React, { useState } from 'react';
import { View, Text } from 'react-native';
import styles from '../styles/daysStyles';
import RemoveButton from './RemoveButton';
import EditPencil from './EditPencil';
import AddExercise from './AddExercise';
import EditExerciseModal from './EditExerciseModal';
import { ExerciseForm } from '../lib/types';

type Props = {
  exercises: ExerciseForm[];
  loading?: boolean;
  onAdd?: (ex: any) => Promise<void> | void; // server-backed add
  onEdit?: (ex: ExerciseForm) => void; // server-backed edit
  onDelete?: (id?: string) => void; // server-backed delete by id
  setExercises?: React.Dispatch<React.SetStateAction<ExerciseForm[]>>; // preview mode
  addButtonText?: string;
};

export default function ExercisesList({ exercises, loading, onAdd, onEdit, onDelete, setExercises, addButtonText }: Props) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ExerciseForm>({ name: '', sets: '', reps: '', notes: '' });

  const openEdit = (idx: number) => {
    const ex = exercises[idx];
    setEditForm({ name: ex.name, sets: String(ex.sets), reps: String(ex.reps), notes: ex.notes || '' });
    setEditingIdx(idx);
  };

  const handleSaveEdit = async () => {
    if (editingIdx === null) return;
    // server-backed edit
    if (onEdit) {
      onEdit(editForm);
    } else if (setExercises) {
      setExercises(prev => prev.map((e, i) => i === editingIdx ? { ...e, name: editForm.name.trim(), sets: editForm.sets, reps: editForm.reps, notes: editForm.notes } : e));
    }
    setEditingIdx(null);
    setEditForm({ name: '', sets: '', reps: '', notes: '' });
  };

  const handleDelete = (idx: number, id?: string) => {
    if (onDelete) {
      onDelete(id);
    } else if (setExercises) {
      setExercises(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const handleAdd = async (ex: any) => {
    const form: ExerciseForm = { name: ex.name, sets: String(ex.sets), reps: String(ex.reps), notes: ex.notes };
    if (onAdd) {
      await onAdd(form);
    } else if (setExercises) {
      setExercises(prev => [...prev, form]);
    }
  };

  return (
    <View>
      <Text style={styles.exerciseTitle}>Exercises</Text>
      {loading ? <Text>Loading...</Text> : (
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
                  <RemoveButton onPress={() => handleDelete(i, ex.id)} label="Delete" accessibilityLabel={`Delete ${ex.name}`} textStyle={styles.deleteTextSmall} />
                  <EditPencil onPress={() => openEdit(i)} accessibilityLabel={`Edit ${ex.name}`} />
                </View>
              </View>
            </View>
          ))}

          <AddExercise
            mode="modal"
            addButtonText={addButtonText}
            onAdd={handleAdd}
          />

          <EditExerciseModal
            visible={editingIdx !== null}
            exercise={editForm}
            setExercise={(e) => setEditForm(e)}
            onClose={() => { setEditingIdx(null); setEditForm({ name: '', sets: '', reps: '', notes: '' }); }}
            onSave={handleSaveEdit}
          />
        </View>
      )}
    </View>
  );
}
