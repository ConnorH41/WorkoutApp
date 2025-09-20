import React from 'react';
import ExerciseCard from './ExerciseCard';

type Props = {
  item: any;
  sets: any[];
  name?: string;
  editing?: boolean;
  readonlyMode?: boolean;
  notes?: string;
  IconFeather?: any;
  onToggleEdit: () => void;
  onChangeName: (v: string) => void;
  onChangeSet: (idx: number, field: string, v: string) => void;
  onToggleCompleted: (idx: number) => void;
  onAddSet: () => void;
  onRemoveSet: (idx: number) => void;
  onChangeNotes: (v: string) => void;
  onRemoveExercise: () => void;
};

export default function ExerciseItem({ item, sets, name, editing, readonlyMode, notes, IconFeather, onToggleEdit, onChangeName, onChangeSet, onToggleCompleted, onAddSet, onRemoveSet, onChangeNotes, onRemoveExercise }: Props) {
  return (
    <ExerciseCard
      item={item}
      sets={sets}
      name={name || ''}
      editing={!!editing}
      readonlyMode={!!readonlyMode}
      notes={notes || ''}
      onToggleEdit={onToggleEdit}
      onChangeName={onChangeName}
      onChangeSet={onChangeSet}
      onToggleCompleted={onToggleCompleted}
      onAddSet={onAddSet}
      onRemoveSet={onRemoveSet}
      onChangeNotes={onChangeNotes}
      onRemoveExercise={onRemoveExercise}
      IconFeather={IconFeather}
    />
  );
}
