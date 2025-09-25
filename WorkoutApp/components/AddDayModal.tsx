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
};

export default function AddDayModal({ visible, onClose, tabIndex, setTabIndex, dayName, setDayName, exercises, setExercises, onCreate, creating }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <View style={{ backgroundColor: colors.background, padding: 16, borderRadius: 12, width: '90%', maxWidth: 420, maxHeight: '90%' }}>
          <View style={{ flexDirection: 'row', marginBottom: 20, backgroundColor: colors.muted, borderRadius: 8, padding: 4 }}>
            <TouchableOpacity style={[splitStyles.tabButton, { backgroundColor: tabIndex === 0 ? '#007AFF' : 'transparent' }]} onPress={() => setTabIndex(0)}>
              <Text style={{ color: tabIndex === 0 ? colors.background : colors.text, fontWeight: 'bold', fontSize: 12 }}>1. General</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[splitStyles.tabButton, { backgroundColor: tabIndex === 1 ? '#007AFF' : 'transparent' }]} onPress={() => setTabIndex(1)}>
              <Text style={{ color: tabIndex === 1 ? colors.background : colors.text, fontWeight: 'bold', fontSize: 12 }}>2. Exercises</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
            {tabIndex === 0 && (
              <>
                <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Add New Day</Text>
                <Text style={{ marginBottom: 4, fontWeight: '500' }}>Day Name:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <TextInput style={[styles.input, styles.textInput]} placeholder="e.g. Upper A, Push Day" value={dayName} onChangeText={setDayName} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
                </View>
              </>
            )}

            {tabIndex === 1 && (
              <>
                <PreviewExerciseEditor exercises={exercises} setExercises={setExercises} />
              </>
            )}

            <View style={{ marginTop: 12 }}>
              {tabIndex < 1 ? (
                <ModalButtons leftLabel="Cancel" rightLabel="Next" onLeftPress={() => { setDayName(''); setExercises([]); onClose(); setTabIndex(0); }} onRightPress={() => setTabIndex(tabIndex + 1)} leftColor={colors.muted} rightColor={colors.primary} leftTextColor={colors.text} rightTextColor={colors.background} />
              ) : (
                <ModalButtons leftLabel="Cancel" rightLabel={creating ? 'Creating...' : 'Create'} onLeftPress={() => { setDayName(''); setExercises([]); onClose(); setTabIndex(0); }} onRightPress={onCreate} leftColor={colors.muted} rightColor={colors.primary} leftTextColor={colors.text} rightTextColor={colors.background} rightDisabled={creating} />
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
