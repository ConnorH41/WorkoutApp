import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, Keyboard, Alert } from 'react-native';
import { colors } from '../styles/theme';
import splitStyles from '../styles/splitsStyles';
import styles from '../styles/daysStyles';
import ModalButtons from './ModalButtons';
import AddExercise from './AddExercise';
import PreviewExerciseEditor from './PreviewExerciseEditor';
import { ExerciseForm } from '../lib/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  tabIndex: number;
  setTabIndex: (n: number) => void;
  dayName: string;
  setDayName: (s: string) => void;
  exercises: ExerciseForm[];
  setExercises: (f: React.SetStateAction<ExerciseForm[]>) => void;
  onCreate: () => Promise<void> | void;
  creating?: boolean;
  editingDay?: any | null; // Optional: if provided, we're editing
};

export default function AddDayModal({ visible, onClose, tabIndex, setTabIndex, dayName, setDayName, exercises, setExercises, onCreate, creating, editingDay }: Props) {
  const isEditing = !!editingDay;

  const handleReset = () => {
    setDayName('');
    setExercises([]);
    setTabIndex(0);
  };

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
              onPress={() => {
                handleReset();
                onClose();
              }}
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
              }}>{isEditing ? 'Edit Day' : 'Add New Day'}</Text>
              <Text style={{
                fontSize: 14,
                color: colors.textMuted,
                letterSpacing: 0.2,
              }}>{isEditing ? 'Update your workout day' : 'Create a custom workout day'}</Text>
            </View>

            {/* Tabs */}
            <View style={{
              flexDirection: 'row',
              marginBottom: 24,
              backgroundColor: colors.backgroundMuted,
              borderRadius: 12,
              padding: 4,
              gap: 4,
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  borderRadius: 10,
                  backgroundColor: tabIndex === 0 ? colors.primary : 'transparent',
                  shadowColor: tabIndex === 0 ? colors.primary : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: tabIndex === 0 ? 3 : 0,
                }}
                onPress={() => setTabIndex(0)}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    color: tabIndex === 0 ? '#fff' : colors.text,
                    fontWeight: '700',
                    fontSize: 13,
                    textAlign: 'center',
                    letterSpacing: 0.3,
                  }}
                >
                  1. General
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  borderRadius: 10,
                  backgroundColor: tabIndex === 1 ? colors.primary : 'transparent',
                  shadowColor: tabIndex === 1 ? colors.primary : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: tabIndex === 1 ? 3 : 0,
                }}
                onPress={() => setTabIndex(1)}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    color: tabIndex === 1 ? '#fff' : colors.text,
                    fontWeight: '700',
                    fontSize: 13,
                    textAlign: 'center',
                    letterSpacing: 0.3,
                  }}
                >
                  2. Exercises
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
            {tabIndex === 0 && (
              <View>
                <Text style={{
                  marginBottom: 8,
                  fontWeight: '600',
                  fontSize: 14,
                  color: colors.text,
                  letterSpacing: 0.2,
                }}>Day Name:</Text>
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
                  placeholder="e.g. Upper A, Push Day"
                  placeholderTextColor={colors.textMuted}
                  value={dayName}
                  onChangeText={setDayName}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>
            )}

            {tabIndex === 1 && (
              <PreviewExerciseEditor exercises={exercises} setExercises={setExercises} />
            )}

            {/* Action Buttons */}
            <View style={{ marginTop: 28 }}>
              {tabIndex < 1 ? (
                <TouchableOpacity
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 4,
                  }}
                  onPress={() => setTabIndex(tabIndex + 1)}
                >
                  <Text style={{
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: 16,
                    letterSpacing: 0.3,
                  }}>Next →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: creating ? colors.backgroundMuted : colors.primary,
                    alignItems: 'center',
                    shadowColor: creating ? 'transparent' : colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: creating ? 0 : 4,
                    opacity: creating ? 0.7 : 1,
                  }}
                  onPress={onCreate}
                  disabled={creating}
                >
                  <Text style={{
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: 16,
                    letterSpacing: 0.3,
                  }}>{creating ? (isEditing ? '⏳ Updating...' : '⏳ Creating...') : (isEditing ? '✓ Update Day' : '✓ Create Day')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
