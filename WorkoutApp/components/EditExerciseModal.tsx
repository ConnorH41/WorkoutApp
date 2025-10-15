import React from 'react';
import { Modal, View, Text, TextInput, ScrollView, Keyboard, TouchableOpacity } from 'react-native';
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{
          backgroundColor: colors.background,
          padding: 24,
          borderRadius: 20,
          width: '90%',
          maxWidth: 420,
          maxHeight: '90%',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        }}>
          {/* X Close Button */}
          <View style={{ position: 'relative' }}>
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                padding: 8,
                zIndex: 10,
              }}
              onPress={onClose}
            >
              <Text style={{
                fontSize: 24,
                color: colors.textMuted,
                fontWeight: '600',
              }}>✕</Text>
            </TouchableOpacity>

            {/* Title Section */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontWeight: '700',
                fontSize: 22,
                marginBottom: 4,
                color: colors.text,
                letterSpacing: 0.3,
              }}>Edit Exercise</Text>
              <Text style={{
                fontSize: 14,
                color: colors.textMuted,
                letterSpacing: 0.2,
              }}>Update exercise details</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
            {/* Exercise Name */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{
                marginBottom: 8,
                fontWeight: '600',
                fontSize: 14,
                color: colors.text,
                letterSpacing: 0.2,
              }}>Exercise Name:</Text>
              <TextInput
                style={{
                  borderWidth: 2,
                  borderColor: colors.border,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 15,
                  backgroundColor: colors.background,
                  color: colors.text,
                  height: 50,
                }}
                placeholder="e.g. Bench Press"
                placeholderTextColor={colors.textMuted}
                value={exercise.name}
                onChangeText={v => setExercise(prev => ({ ...prev, name: v }))}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
            </View>

            {/* Sets and Reps */}
            <View style={{ flexDirection: 'row', marginBottom: 16, gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  marginBottom: 8,
                  fontWeight: '600',
                  fontSize: 14,
                  color: colors.text,
                  letterSpacing: 0.2,
                }}>Sets:</Text>
                <TextInput
                  style={{
                    borderWidth: 2,
                    borderColor: colors.border,
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 15,
                    backgroundColor: colors.background,
                    color: colors.text,
                    height: 50,
                  }}
                  placeholder="3"
                  placeholderTextColor={colors.textMuted}
                  value={exercise.sets}
                  onChangeText={v => setExercise(prev => ({ ...prev, sets: v }))}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  marginBottom: 8,
                  fontWeight: '600',
                  fontSize: 14,
                  color: colors.text,
                  letterSpacing: 0.2,
                }}>Reps:</Text>
                <TextInput
                  style={{
                    borderWidth: 2,
                    borderColor: colors.border,
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 15,
                    backgroundColor: colors.background,
                    color: colors.text,
                    height: 50,
                  }}
                  placeholder="8-12"
                  placeholderTextColor={colors.textMuted}
                  value={exercise.reps}
                  onChangeText={v => setExercise(prev => ({ ...prev, reps: v }))}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>
            </View>

            {/* Notes */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{
                marginBottom: 8,
                fontWeight: '600',
                fontSize: 14,
                color: colors.text,
                letterSpacing: 0.2,
              }}>Notes (optional):</Text>
              <TextInput
                style={{
                  borderWidth: 2,
                  borderColor: colors.border,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 15,
                  backgroundColor: colors.background,
                  color: colors.text,
                  minHeight: 80,
                  textAlignVertical: 'top',
                }}
                placeholder="e.g. Focus on form, increase weight next week"
                placeholderTextColor={colors.textMuted}
                value={exercise.notes}
                onChangeText={v => setExercise(prev => ({ ...prev, notes: v }))}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Action Button */}
            <View style={{ marginTop: 12 }}>
              <TouchableOpacity
                style={{
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: saving ? colors.backgroundMuted : colors.primary,
                  alignItems: 'center',
                  shadowColor: saving ? 'transparent' : colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: saving ? 0 : 4,
                  opacity: saving ? 0.7 : 1,
                }}
                onPress={onSave}
                disabled={saving}
              >
                <Text style={{
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: 16,
                  letterSpacing: 0.3,
                }}>{saving ? '⏳ Saving...' : '✓ Save Changes'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}