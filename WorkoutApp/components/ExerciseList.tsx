import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import ExerciseCard from './ExerciseCard';

type Props = {
  exercises: any[];
  splitDayExercises: any[];
  logs: { [k: string]: any[] };
  nameByExercise: { [k: string]: string };
  editingByExercise: { [k: string]: boolean };
  notesByExercise: { [k: string]: string };
  isRestDay: boolean;
  IconFeather?: any;
  onToggleEdit: (id: string) => void;
  onChangeName: (id: string, v: string) => void;
  onChangeSet: (id: string, idx: number, field: string, v: string) => void;
  onToggleCompleted: (id: string, idx: number) => void;
  onAddSet: (id: string) => void;
  onRemoveSet: (id: string, idx: number) => void;
  onChangeNotes: (id: string, v: string) => void;
  onRemoveExercise: (item: any) => void;
  onAddExercise: () => void;
};

export default function ExerciseList({ exercises, splitDayExercises, logs, nameByExercise, editingByExercise, notesByExercise, isRestDay, IconFeather, onToggleEdit, onChangeName, onChangeSet, onToggleCompleted, onAddSet, onRemoveSet, onChangeNotes, onRemoveExercise, onAddExercise }: Props) {
  const items = (exercises && exercises.length > 0) ? exercises : splitDayExercises;
  return (
    <View>
      {items.map((item) => (
        <ExerciseCard
          key={item.id}
          item={item}
          sets={logs[item.id] || [{ setNumber: 1, reps: '', weight: '', completed: false }]}
          name={nameByExercise[item.id]}
          editing={!!editingByExercise[item.id]}
          readonlyMode={isRestDay}
          notes={notesByExercise[item.id]}
          onToggleEdit={() => onToggleEdit(item.id)}
          onChangeName={(v) => onChangeName(item.id, v)}
          onChangeSet={(idx, field, v) => onChangeSet(item.id, idx, field, v)}
          onToggleCompleted={(idx) => onToggleCompleted(item.id, idx)}
          onAddSet={() => onAddSet(item.id)}
          onRemoveSet={(idx) => onRemoveSet(item.id, idx)}
          onChangeNotes={(v) => onChangeNotes(item.id, v)}
          onRemoveExercise={() => onRemoveExercise(item)}
          IconFeather={IconFeather}
        />
      ))}

      <TouchableOpacity style={{ marginTop: 0, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, alignSelf: 'flex-start' }} onPress={onAddExercise}>
        <Text style={{ color: '#007AFF', fontWeight: '700' }}>+ Add Exercise</Text>
      </TouchableOpacity>
    </View>
  );
}
