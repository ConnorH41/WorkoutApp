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
  setExercises: React.Dispatch<React.SetStateAction<ExerciseForm[]>>;
};

export default function PreviewExerciseEditor({ exercises, setExercises }: Props) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ExerciseForm>({ name: '', sets: '', reps: '', notes: '' });

  const openEdit = (idx: number) => {
    const ex = exercises[idx];
    setEditForm({ name: ex.name, sets: String(ex.sets), reps: String(ex.reps), notes: ex.notes || '' });
    setEditingIdx(idx);
  };

  const handleSave = () => {
    if (editingIdx === null) return;
    setExercises(prev => prev.map((e, i) => i === editingIdx ? { ...e, name: editForm.name.trim(), sets: editForm.sets, reps: editForm.reps, notes: editForm.notes } : e));
    setEditingIdx(null);
    setEditForm({ name: '', sets: '', reps: '', notes: '' });
  };

  const handleDelete = (idx: number) => {
    setExercises(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <View>
      <Text style={styles.exerciseTitle}>Exercises</Text>
      {(exercises || []).map((ex, idx) => (
        <View key={ex.id ?? `${ex.name}-${idx}`} style={styles.exerciseBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.exerciseName}>{ex.name}</Text>
              <Text style={styles.exerciseDetails}>{ex.sets} sets × {ex.reps} reps</Text>
              {ex.notes ? <Text style={styles.exerciseNotes}>{ex.notes}</Text> : null}
            </View>
            <View style={[styles.exerciseActions, { alignSelf: 'center' }]}>
              <RemoveButton onPress={() => handleDelete(idx)} label="Remove" accessibilityLabel={`Remove ${ex.name}`} textStyle={styles.deleteTextSmall} />
              <EditPencil onPress={() => openEdit(idx)} accessibilityLabel={`Edit ${ex.name}`} />
            </View>
          </View>
        </View>
      ))}

      <View style={{ marginTop: 8 }}>
        <AddExercise mode="modal" addButtonText="Add Exercise" onAdd={(ex) => {
          const form: ExerciseForm = { name: ex.name, sets: String(ex.sets), reps: String(ex.reps), notes: ex.notes };
          setExercises(prev => [...prev, form]);
        }} />
      </View>

      <EditExerciseModal
        visible={editingIdx !== null}
        exercise={editForm}
        setExercise={(e) => setEditForm(e)}
        onClose={() => { setEditingIdx(null); setEditForm({ name: '', sets: '', reps: '', notes: '' }); }}
        onSave={handleSave}
      />
    </View>
  );
}
