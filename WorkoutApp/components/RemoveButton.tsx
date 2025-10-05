import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../styles/theme';

type Props = {
  onPress: () => void;
  label?: string;
  style?: any;
  textStyle?: any;
  accessibilityLabel?: string;
};

export default function RemoveButton({ onPress, label = 'Delete', style, textStyle, accessibilityLabel }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
        style,
      ]}
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {({ pressed }) => (
        <Text style={[
          styles.text,
          pressed && styles.textPressed,
          textStyle,
        ]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'transparent',
    height: 36,
    minWidth: 68,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scale: 1 }],
  },
  containerPressed: {
    backgroundColor: colors.dangerLight,
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  text: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 12,
  },
  textPressed: {
    color: colors.background,
    fontWeight: '700',
  },
});
