import React from 'react';
import { View, Text } from 'react-native';
import styles from '../styles/daysStyles';
import RemoveButton from './RemoveButton';
import EditPencil from './EditPencil';
import AddExercise from './AddExercise';
import { ExerciseForm } from '../lib/types';

type Props = {
  exercises: ExerciseForm[];
  onEdit: (ex: ExerciseForm) => void;
  onDelete: (id?: string) => void;
  onAdd: (ex: ExerciseForm | any) => Promise<void> | void;
  loading?: boolean;
};

export default function ExercisesList({ exercises, onEdit, onDelete, onAdd, loading }: Props) {
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
                  <RemoveButton onPress={() => onDelete(ex.id)} label="Delete" accessibilityLabel={`Delete ${ex.name}`} textStyle={styles.deleteTextSmall} />
                  <EditPencil onPress={() => onEdit(ex)} accessibilityLabel={`Edit ${ex.name}`} />
                </View>
              </View>
            </View>
          ))}

          <AddExercise
            mode="modal"
            onAdd={onAdd}
          />
        </View>
      )}
    </View>
  );
}
