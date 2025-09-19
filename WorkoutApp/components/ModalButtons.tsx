import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  leftLabel: string;
  rightLabel: string;
  onLeftPress: () => void;
  onRightPress: () => void | Promise<void>;
  leftDisabled?: boolean;
  rightDisabled?: boolean;
  leftColor?: string;
  rightColor?: string;
  leftTextColor?: string;
  rightTextColor?: string;
};

export default function ModalButtons({
  leftLabel,
  rightLabel,
  onLeftPress,
  onRightPress,
  leftDisabled,
  rightDisabled,
  leftColor = '#e0e0e0',
  rightColor = '#007AFF',
  leftTextColor = '#000',
  rightTextColor = '#fff',
}: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: leftColor, marginRight: 8 }]}
        onPress={onLeftPress}
        disabled={leftDisabled}
        activeOpacity={0.9}
      >
        <Text style={[styles.leftText, { color: leftTextColor }]}>{leftLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: rightColor }]}
        onPress={onRightPress as any}
        disabled={rightDisabled}
        activeOpacity={0.9}
      >
        <Text style={[styles.rightText, { color: rightTextColor }]}>{rightLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  leftText: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  rightText: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
