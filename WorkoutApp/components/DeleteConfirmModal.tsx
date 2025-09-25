import React from 'react';
import { Modal, View, Text, ScrollView } from 'react-native';
import ModalButtons from './ModalButtons';
import { colors } from '../styles/theme';

type Props = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  targetType?: 'day' | 'exercise' | 'preview' | null;
};

export default function DeleteConfirmModal({ visible, onCancel, onConfirm, targetType }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View style={{ backgroundColor: colors.background, padding: 16, borderRadius: 12, width: '90%', maxWidth: 420 }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Delete {targetType === 'day' ? 'Day' : 'Exercise'}?</Text>
            <Text style={{ marginBottom: 16 }}>Are you sure you want to permanently delete this {targetType === 'day' ? 'day' : 'exercise'}? This action cannot be undone.</Text>
            <View>
              <ModalButtons leftLabel="Cancel" rightLabel="Delete" onLeftPress={onCancel} onRightPress={onConfirm} leftColor={colors.muted} rightColor={colors.danger} leftTextColor={colors.text} rightTextColor={colors.background} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
