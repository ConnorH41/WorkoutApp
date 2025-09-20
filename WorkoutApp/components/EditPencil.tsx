import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';

let IconFeather: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Feather: _Feather } = require('@expo/vector-icons');
  IconFeather = _Feather;
} catch (e) {
  IconFeather = null;
}

type Props = {
  onPress: () => void;
  size?: number;
  color?: string;
  accessibilityLabel?: string;
  style?: any;
};

export default function EditPencil({ onPress, size = 14, color = '#666', accessibilityLabel, style }: Props) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityLabel={accessibilityLabel} style={[styles.container, style]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      {IconFeather ? <IconFeather name="edit-2" size={size} color={color} /> : <Text style={styles.fallback}>✎</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    fontSize: 14,
  },
});
