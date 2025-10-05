import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, shadows } from '../styles/theme';

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
  leftColor = colors.muted,
  rightColor = colors.primary,
  leftTextColor = colors.text,
  rightTextColor = colors.background,
}: Props) {
  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: leftColor, marginRight: 8 },
          pressed && styles.buttonPressed,
          leftDisabled && styles.buttonDisabled,
        ]}
        onPress={onLeftPress}
        disabled={leftDisabled}
      >
        {({ pressed }) => (
          <Text style={[
            styles.leftText,
            { color: leftTextColor },
            pressed && styles.textPressed,
            leftDisabled && styles.textDisabled,
          ]}>
            {leftLabel}
          </Text>
        )}
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: rightColor },
          pressed && styles.buttonPressed,
          !pressed && shadows.sm,
          rightDisabled && styles.buttonDisabled,
        ]}
        onPress={onRightPress as any}
        disabled={rightDisabled}
      >
        {({ pressed }) => (
          <Text style={[
            styles.rightText,
            { color: rightTextColor },
            pressed && styles.textPressed,
            rightDisabled && styles.textDisabled,
          ]}>
            {rightLabel}
          </Text>
        )}
      </Pressable>
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
    transform: [{ scale: 1 }],
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  leftText: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  rightText: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  textPressed: {
    opacity: 0.9,
  },
  textDisabled: {
    opacity: 0.6,
  },
});
