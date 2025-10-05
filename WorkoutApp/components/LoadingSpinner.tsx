import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, fonts } from '../styles/theme';

type Props = {
  size?: 'small' | 'large';
  message?: string;
  color?: string;
  style?: ViewStyle;
  fullScreen?: boolean;
};

export default function LoadingSpinner({
  size = 'large',
  message,
  color = colors.primary,
  style,
  fullScreen = false,
}: Props) {
  const content = (
    <View style={[styles.container, fullScreen && styles.fullScreen, style]}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );

  return content;
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  message: {
    marginTop: spacing.md,
    fontSize: fonts.size.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
