import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Modal, ScrollView, Keyboard, Platform, ToastAndroid, Alert } from 'react-native';
import styles from '../styles/daysStyles';
import ModalButtons from './ModalButtons';

type Exercise = {
  id?: string;
  name: string;
  sets: string | number;
  reps: string | number;
  notes?: string;
};

type Props = {
  visible: boolean;
  exercise: Exercise | null;
  onClose: () => void;
  onSave: (exercise: Exercise) => Promise<void> | void;
  saving?: boolean;
};

const showValidationToast = (msg: string) => {
  if (Platform.OS === 'android' && ToastAndroid && ToastAndroid.show) {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('Validation', msg);
  }
};

export default function EditExerciseModal({ visible, exercise, onClose, onSave, saving = false }: Props) {
  const [name, setName] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [notes, setNotes] = useState('');

  // Update form when exercise prop changes
  useEffect(() => {
    if (exercise) {
      setName(exercise.name);
      setSets(String(exercise.sets));
      setReps(String(exercise.reps));
      setNotes(exercise.notes || '');
    } else {
      setName('');
      setSets('');
      setReps('');
      setNotes('');
    }
  }, [exercise]);

  const handleSave = async () => {
    if (!name.trim() || !sets || !reps) {
      showValidationToast('Exercise name, sets, and reps are required');
      return;
    }

    const updatedExercise = {
      ...exercise,
      name: name.trim(),
      sets,
      reps,
      notes,
    };

    try {
      await onSave(updatedExercise);
    } catch (err) {
      // Let parent handle errors
    }
  };

  const handleClose = () => {
    setName('');
    setSets('');
    setReps('');
    setNotes('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, width: '90%', maxWidth: 420, maxHeight: '90%' }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Edit Exercise</Text>
            
            <Text style={{ marginBottom: 4, fontWeight: '500' }}>Exercise Name:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <TextInput
                style={[styles.input, styles.textInput]}
                placeholder="e.g. Bench Press"
                value={name}
                onChangeText={setName}
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
                    onChangeText={setSets}
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
                    onChangeText={setReps}
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
              onChangeText={setNotes}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              multiline
              numberOfLines={3}
            />

            <View>
              <ModalButtons
                leftLabel="Cancel"
                rightLabel={saving ? "Saving..." : "Save"}
                onLeftPress={handleClose}
                onRightPress={handleSave}
                leftColor="#e0e0e0"
                rightColor="#007AFF"
                leftTextColor="#333"
                rightTextColor="#fff"
                rightDisabled={saving}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}