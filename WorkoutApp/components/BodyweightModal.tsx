import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import ModalButtons from './ModalButtons';

type Props = {
  visible: boolean;
  bodyweight: string;
  isKg: boolean;
  submitting?: boolean;
  onClose: () => void;
  onChangeWeight: (v: string) => void;
  onToggleKg: (v: boolean) => void;
  onSave: () => void;
};

export default function BodyweightModal({ visible, bodyweight, isKg, submitting = false, onClose, onChangeWeight, onToggleKg, onSave }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 16, elevation: 5 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Enter Today's Bodyweight</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <TextInput
              style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 4 }}
              placeholder={isKg ? 'Weight (kg)' : 'Weight (lbs)'}
              value={bodyweight}
              onChangeText={onChangeWeight}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            <View style={{ marginLeft: 8, minWidth: 96, flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => onToggleKg(true)} style={{ paddingHorizontal: 10, paddingVertical: 8, backgroundColor: isKg ? '#007AFF' : '#f0f0f0', borderRadius: 4, marginRight: 8 }}>
                <Text style={{ color: isKg ? '#fff' : '#333' }}>kg</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onToggleKg(false)} style={{ paddingHorizontal: 10, paddingVertical: 8, backgroundColor: !isKg ? '#007AFF' : '#f0f0f0', borderRadius: 4 }}>
                <Text style={{ color: !isKg ? '#fff' : '#333' }}>lbs</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ModalButtons
            leftLabel="Cancel"
            rightLabel={submitting ? 'Logging...' : 'Save'}
            onLeftPress={onClose}
            onRightPress={onSave}
            leftColor="#e0e0e0"
            rightColor="#007AFF"
            leftTextColor="#000"
            rightTextColor="#fff"
            rightDisabled={submitting}
          />
        </View>
      </View>
    </Modal>
  );
}
