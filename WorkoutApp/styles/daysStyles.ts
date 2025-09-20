import { StyleSheet } from 'react-native';
import { colors } from './theme';

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
    fontSize: 28,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
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
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  exerciseCountBadge: {
    backgroundColor: '#e6f0ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
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
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
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
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  exerciseDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  exerciseNotes: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
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
    fontWeight: '600',
  },
  deleteTextSmall: {
    color: colors.danger,
    fontWeight: '600',
    marginRight: 8,
  },
  addExerciseLink: {
    color: colors.primary,
    fontWeight: '700',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  textInput: {
    height: 40,
    fontSize: 16,
    paddingHorizontal: 8,
    paddingVertical: 8,
    textAlignVertical: 'center',
  },
  textInputMultiline: {
    minHeight: 60,
    fontSize: 16,
    paddingHorizontal: 8,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
});

export default styles;
