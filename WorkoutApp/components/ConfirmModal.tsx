import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AnimatedModal from './animations/AnimatedModal';
import ModalButtons from './ModalButtons';
import { colors } from '../styles/theme';

type Props = {
  visible: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmColor?: string;
  cancelColor?: string;
};

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  confirmColor = colors.primary,
  cancelColor = colors.backgroundMuted,
}: Props) {
  return (
    <AnimatedModal visible={visible} onClose={onCancel}>
      <View style={styles.container}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <View style={{ marginTop: 12 }}>
          <ModalButtons
            leftLabel={cancelLabel}
            rightLabel={confirmLabel}
            onLeftPress={onCancel}
            onRightPress={onConfirm}
            leftColor={cancelColor}
            rightColor={confirmColor}
            leftTextColor={colors.text}
            rightTextColor={colors.background}
          />
        </View>
      </View>
    </AnimatedModal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: colors.text,
  },
  message: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
  },
});
