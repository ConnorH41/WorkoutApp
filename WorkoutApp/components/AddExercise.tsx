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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View style={{ backgroundColor: colors.background, padding: 16, borderRadius: 12, width: '90%', maxWidth: 420, maxHeight: '90%' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>{addButtonText || 'Add Exercise'}</Text>

              <Text style={{ marginBottom: 4, fontWeight: '500' }}>Exercise Name:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <TextInput
                  style={[styles.input, styles.textInput]}
                  placeholder="e.g. Bench Press"
                  value={name}
                  onChangeText={v => setName(v)}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>

              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ marginBottom: 4, fontWeight: '500' }}>Sets:</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 0 }}>
                    <TextInput
                      style={[styles.input, styles.textInput]}
                      placeholder="3"
                      value={sets}
                      onChangeText={v => setSets(v)}
                      keyboardType="numeric"
                      returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                    />
                  </View>
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={{ marginBottom: 4, fontWeight: '500' }}>Reps:</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 0 }}>
                    <TextInput
                      style={[styles.input, styles.textInput]}
                      placeholder="8-12"
                      value={reps}
                      onChangeText={v => setReps(v)}
                      keyboardType="numeric"
                      returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                    />
                  </View>
                </View>
              </View>

              <Text style={{ marginBottom: 4, fontWeight: '500' }}>Notes (optional):</Text>
              <TextInput
                style={[styles.input, styles.textInputMultiline, { marginBottom: 16 }]}
                placeholder="e.g. Focus on form, increase weight next week"
                value={notes}
                onChangeText={v => setNotes(v)}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                multiline
                numberOfLines={3}
              />

              <View>
                <ModalButtons
                  leftLabel="Cancel"
                  rightLabel={adding ? 'Adding...' : (addButtonText || 'Add Exercise')}
                  onLeftPress={() => { reset(); setVisible(false); }}
                  onRightPress={handleAdd}
                  leftColor={colors.textMuted}
                  rightColor={colors.primary}
                  leftTextColor={colors.text}
                  rightTextColor={colors.background}
                  rightDisabled={adding}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
