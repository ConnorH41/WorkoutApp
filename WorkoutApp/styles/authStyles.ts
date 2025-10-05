import { StyleSheet } from 'react-native';
import { colors, fonts, spacing, borderRadius } from './theme';

export default StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
    alignItems: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    fontSize: fonts.size.md,
    color: colors.text,
  },
  error: {
    color: colors.danger,
    fontSize: fonts.size.sm,
    marginBottom: spacing.sm,
  },
});
