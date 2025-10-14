import React from 'react';
import { Modal, View, Text, TextInput, ScrollView, Keyboard } from 'react-native';
import ModalButtons from './ModalButtons';
import styles from '../styles/daysStyles';
import { ExerciseForm } from '../lib/types';
import { colors } from '../styles/theme';

type Props = {
  visible: boolean;
  exercise: ExerciseForm;
  setExercise: React.Dispatch<React.SetStateAction<ExerciseForm>>;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  saving?: boolean;
};

export default function EditExerciseModal({ visible, exercise, setExercise, onClose, onSave, saving = false }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <View style={{ backgroundColor: colors.background, padding: 16, borderRadius: 12, width: '90%', maxWidth: 420, maxHeight: '90%' }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Edit Exercise</Text>
            <Text style={{ marginBottom: 4, fontWeight: '500' }}>Exercise Name:</Text>
            <TextInput style={[styles.input, styles.textInput, { marginBottom: 8 }]} placeholder="e.g. Bench Press" value={exercise.name} onChangeText={v => setExercise(prev => ({ ...prev, name: v }))} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ marginBottom: 4, fontWeight: '500' }}>Sets:</Text>
                <TextInput style={[styles.input, styles.textInput]} placeholder="3" value={exercise.sets} onChangeText={v => setExercise(prev => ({ ...prev, sets: v }))} keyboardType="numeric" returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={{ marginBottom: 4, fontWeight: '500' }}>Reps:</Text>
                <TextInput style={[styles.input, styles.textInput]} placeholder="8-12" value={exercise.reps} onChangeText={v => setExercise(prev => ({ ...prev, reps: v }))} keyboardType="numeric" returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
              </View>
            </View>
            <Text style={{ marginBottom: 4, fontWeight: '500' }}>Notes (optional):</Text>
            <TextInput style={[styles.input, styles.textInputMultiline, { marginBottom: 16 }]} placeholder="e.g. Focus on form, increase weight next week" value={exercise.notes} onChangeText={v => setExercise(prev => ({ ...prev, notes: v }))} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} multiline numberOfLines={3} />
            <ModalButtons leftLabel="Cancel" rightLabel={saving ? 'Saving...' : 'Save'} onLeftPress={onClose} onRightPress={onSave} leftColor={colors.backgroundMuted} rightColor={colors.primary} leftTextColor={colors.text} rightTextColor={colors.background} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}