import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, Keyboard, Platform, ToastAndroid, Alert } from 'react-native';
import { colors } from '../styles/theme';
import styles from '../styles/daysStyles';
import ModalButtons from './ModalButtons';

type Exercise = { name: string; sets: string | number; reps: string | number; notes?: string };

type Props = {
  mode?: 'modal' | 'inline';
  onAdd: (ex: Exercise) => Promise<void> | void;
  adding?: boolean;
  addButtonText?: string;
};

const showValidationToast = (msg: string) => {
  if (Platform.OS === 'android' && ToastAndroid && ToastAndroid.show) {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('Validation', msg);
  }
};

export default function AddExercise({ mode = 'modal', onAdd, adding = false, addButtonText }: Props) {
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [notes, setNotes] = useState('');

  const reset = () => {
    setName('');
    setSets('');
    setReps('');
    setNotes('');
  };

  const handleAdd = async () => {
    if (!name.trim() || !sets || !reps) {
      showValidationToast('Exercise name, sets, and reps are required');
      return;
    }
    const ex = { name: name.trim(), sets, reps, notes };
    try {
      await onAdd(ex as Exercise);
      reset();
      if (mode === 'modal') setVisible(false);
    } catch (err) {
      // Let parent handle errors; no-op here
    }
  };

  if (mode === 'inline') {
    return (
      <View style={{ marginTop: 8 }}>
        <Text style={{ marginBottom: 4, fontWeight: '500' }}>Add Exercise:</Text>
        <TextInput placeholder="Name" style={[styles.input, styles.textInput, { marginBottom: 6 }]} value={name} onChangeText={setName} />
        <View style={{ flexDirection: 'row' }}>
          <TextInput placeholder="Sets" style={[styles.input, styles.textInput, { flex: 1, marginRight: 6 }]} value={sets} onChangeText={setSets} keyboardType="numeric" />
          <TextInput placeholder="Reps" style={[styles.input, styles.textInput, { flex: 1 }]} value={reps} onChangeText={setReps} keyboardType="numeric" />
        </View>
        <TextInput placeholder="Notes" style={[styles.input, styles.textInput, { marginTop: 6 }]} value={notes} onChangeText={setNotes} />
        <TouchableOpacity onPress={handleAdd} style={{ marginTop: 8 }}>
          <Text style={styles.addExerciseLink}>+ Add Exercise</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // modal mode
  return (
    <>
      <TouchableOpacity style={{ marginTop: 6 }} onPress={() => setVisible(true)}>
        <Text style={styles.addExerciseLink}>+ Add Exercise</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
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
                  reset();
                  setVisible(false);
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
                }}>{addButtonText || 'Add Exercise'}</Text>
                <Text style={{
                  fontSize: 14,
                  color: colors.textMuted,
                  letterSpacing: 0.2,
                }}>Define your exercise details</Text>
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
                  value={name}
                  onChangeText={v => setName(v)}
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
                    value={sets}
                    onChangeText={v => setSets(v)}
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
                    value={reps}
                    onChangeText={v => setReps(v)}
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
                  value={notes}
                  onChangeText={v => setNotes(v)}
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
                    backgroundColor: adding ? colors.backgroundMuted : colors.primary,
                    alignItems: 'center',
                    shadowColor: adding ? 'transparent' : colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: adding ? 0 : 4,
                    opacity: adding ? 0.7 : 1,
                  }}
                  onPress={handleAdd}
                  disabled={adding}
                >
                  <Text style={{
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: 16,
                    letterSpacing: 0.3,
                  }}>{adding ? '⏳ Adding...' : '✓ Add Exercise'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
