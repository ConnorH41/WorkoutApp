import React from 'react';
import { Modal, View, Text, TextInput, Keyboard, ScrollView } from 'react-native';
import styles from '../styles/daysStyles';
import ModalButtons from './ModalButtons';

type Props = {
  visible: boolean;
  onClose: () => void;
  name: string;
  setName: (s: string) => void;
  onSave: () => void;
};

export default function EditDayModal({ visible, onClose, name, setName, onSave }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, width: '90%', maxWidth: 420, maxHeight: '90%' }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Edit Day</Text>
            <Text style={{ marginBottom: 4, fontWeight: '500' }}>Day Name:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <TextInput style={[styles.input, styles.textInput]} placeholder="e.g. Upper A, Push Day" value={name} onChangeText={setName} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
            </View>
            <View>
              <ModalButtons leftLabel="Cancel" rightLabel="Save" onLeftPress={onClose} onRightPress={onSave} leftColor="#e0e0e0" rightColor="#007AFF" leftTextColor="#333" rightTextColor="#fff" />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
