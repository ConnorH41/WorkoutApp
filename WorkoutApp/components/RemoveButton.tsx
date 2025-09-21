import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

type Props = {
  onPress: () => void;
  label?: string;
  style?: any;
  textStyle?: any;
  accessibilityLabel?: string;
};

export default function RemoveButton({ onPress, label = 'Delete', style, textStyle, accessibilityLabel }: Props) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.container, style]} accessibilityLabel={accessibilityLabel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Text style={[styles.text, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  text: {
    color: '#ff3b30',
    fontWeight: '600',
    fontSize: 12,
  },
});
