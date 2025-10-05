import { StyleSheet } from 'react-native';
import { colors, fonts, spacing, borderRadius, shadows } from './theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: fonts.size.xxxl,
    fontWeight: fonts.weight.bold,
    lineHeight: fonts.size.xxxl * fonts.lineHeight.tight,
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: colors.surface,
    fontWeight: fonts.weight.bold,
    fontSize: fonts.size.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 4,
    flex: 1,
    marginRight: 8,
  },
  dayBox: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
    backgroundColor: '#fafafa',
  },
  dayName: {
    fontSize: fonts.size.lg,
    fontWeight: fonts.weight.bold,
    lineHeight: fonts.size.lg * fonts.lineHeight.tight,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  exerciseCountBadge: {
    backgroundColor: '#e6f0ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: fonts.size.xs,
    fontWeight: fonts.weight.semibold,
    color: colors.text,
  },
  dayActions: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 10,
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: fonts.size.sm,
    fontWeight: fonts.weight.bold,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
  },
  primaryBtnText: {
    color: '#fff',
  },
  dangerBtn: {
    backgroundColor: colors.danger,
    borderWidth: 0,
  },
  dangerBtnText: {
    color: '#fff',
  },
  exerciseSection: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  exerciseTitle: {
    fontSize: fonts.size.md,
    fontWeight: fonts.weight.bold,
    lineHeight: fonts.size.md * fonts.lineHeight.normal,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  exerciseBox: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  exerciseName: {
    fontSize: fonts.size.md,
    fontWeight: fonts.weight.bold,
    lineHeight: fonts.size.md * fonts.lineHeight.normal,
    color: colors.text,
    marginBottom: 2,
  },
  exerciseDetails: {
    fontSize: fonts.size.sm,
    color: colors.textMuted,
    lineHeight: fonts.size.sm * fonts.lineHeight.normal,
    marginBottom: spacing.xs,
  },
  exerciseNotes: {
    fontSize: fonts.size.sm,
    color: colors.textMuted,
    lineHeight: fonts.size.sm * fonts.lineHeight.normal,
    marginBottom: spacing.xs,
    fontStyle: 'italic',
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 8,
    padding: 6,
    borderRadius: 20,
  },
  deleteText: {
    color: colors.danger,
    fontWeight: fonts.weight.semibold,
    fontSize: fonts.size.sm,
  },
  deleteTextSmall: {
    color: colors.danger,
    fontWeight: fonts.weight.semibold,
    fontSize: fonts.size.xs,
    marginRight: spacing.sm,
  },
  addExerciseLink: {
    color: colors.primary,
    fontWeight: fonts.weight.bold,
    fontSize: fonts.size.md,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  textInput: {
    height: 40,
    fontSize: fonts.size.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    textAlignVertical: 'center',
  },
  textInputMultiline: {
    minHeight: 60,
    fontSize: fonts.size.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    textAlignVertical: 'top',
  },
});

export default styles;
