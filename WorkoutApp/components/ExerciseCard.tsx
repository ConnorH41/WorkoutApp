import Badge from './Badge';
import React from 'react';
import { useTheme } from '../lib/ThemeContext';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import appStyles from '../styles/appStyles';
import ScaleInView from './animations/ScaleInView';
import EditPencil from './EditPencil';
import RemoveButton from './RemoveButton';
import { colors } from '../styles/theme';

type SetRow = { setNumber: number; reps: string; weight: string; completed?: boolean; logId?: string | null };

export default function ExerciseCard(props: {
  item: any;
  sets: SetRow[];
  name: string;
  editing: boolean;
  notes: string;
  readonlyMode?: boolean;
  onToggleEdit: () => void;
  onChangeName: (v: string) => void;
  onChangeSet: (index: number, field: 'reps' | 'weight', value: string) => void;
  onToggleCompleted: (index: number) => void;
  onAddSet: () => void;
  onRemoveSet: (index: number) => void;
  onChangeNotes: (v: string) => void;
  onRemoveExercise: () => void;
  IconFeather?: any;
}) {
  const { item, sets, name, editing, notes, readonlyMode, onToggleEdit, onChangeName, onChangeSet, onToggleCompleted, onAddSet, onRemoveSet, onChangeNotes, onRemoveExercise, IconFeather } = props;
  const { theme } = useTheme();

  return (
    <ScaleInView style={{
      ...styles.exerciseBox,
      borderColor: theme.border,
      backgroundColor: theme.card,
      shadowColor: theme.shadow,
    }}>
      {!(String(item.id).startsWith('tmp')) && (
        <Badge
          text={`${item.sets}×${item.reps}`}
          backgroundColor={theme.primaryLight}
          color={theme.text}
          size="sm"
          position="absolute"
          right={10}
          top={8}
        />
      )}
      <View style={styles.titleRow}>
        {!editing ? (
          <>
            <Text style={styles.exerciseTitle}>{name || item.name}</Text>
            <EditPencil onPress={onToggleEdit} />
          </>
        ) : (
          <TextInput value={name || item.name} onChangeText={onChangeName} style={styles.exerciseTitleInput} autoFocus onBlur={onToggleEdit} />
        )}
      </View>

      {sets.map((s, idx) => (
        <View key={`${item.id}-set-${idx}`} style={styles.setRow}>
          <Pressable style={({ pressed }) => [styles.checkbox, s.completed ? styles.checkboxChecked : null, readonlyMode ? styles.checkboxDisabled : null, pressed ? styles.checkboxPressed : null]} onPress={() => { if (!readonlyMode) onToggleCompleted(idx); }} android_ripple={{ color: '#cfe9ff' }} accessibilityRole="button" accessibilityLabel={`Toggle set ${s.setNumber} completed`} hitSlop={8}>
            <Text style={styles.checkboxText}>{s.completed ? '✓' : ''}</Text>
          </Pressable>
          <Text style={styles.setLabel}>{`Set ${s.setNumber}`}</Text>
          <TextInput editable={!s.completed && !readonlyMode} style={[styles.input, styles.inputWeight, (s.completed || readonlyMode) ? styles.inputDisabled : null]} placeholder="Weight" keyboardType="numeric" value={s.weight} onChangeText={(v) => onChangeSet(idx, 'weight', v)} />
          <TextInput editable={!s.completed && !readonlyMode} style={[styles.input, styles.inputReps, (s.completed || readonlyMode) ? styles.inputDisabled : null]} placeholder="Reps" keyboardType="numeric" value={s.reps} onChangeText={(v) => onChangeSet(idx, 'reps', v)} />
          <Pressable onPress={() => { if (!readonlyMode) onRemoveSet(idx); }} style={({ pressed }) => [styles.removeBtn, pressed ? styles.removeBtnPressed : null]} android_ripple={{ color: '#ffdddd' }} accessibilityRole="button" accessibilityLabel={`Remove set ${s.setNumber}`} hitSlop={8}>
            <Text style={styles.removeBtnText}>-</Text>
          </Pressable>
        </View>
      ))}

      <Pressable onPress={() => { if (!readonlyMode) onAddSet(); }} style={({ pressed }) => [styles.addSetLink, pressed ? styles.addSetLinkPressed : null]} android_ripple={{ color: '#e6f0ff' }} accessibilityRole="button" accessibilityLabel={`Add set to ${name || item.name}`} hitSlop={8}>
        <Text style={styles.addSetText}>+ Add Set</Text>
      </Pressable>

  <TextInput style={[styles.input, styles.notesInput, readonlyMode ? styles.inputDisabled : null]} placeholder="Notes (optional)" value={notes || ''} onChangeText={(v)=> { if (!readonlyMode) onChangeNotes(v); }} multiline numberOfLines={3} editable={!readonlyMode} />

      <RemoveButton onPress={() => { if (!readonlyMode) onRemoveExercise(); }} label="Remove" accessibilityLabel={`Remove ${name || item.name}`} style={{ position: 'absolute', right: 10, bottom: 10 }} />
    </ScaleInView>
  );
}

const styles = StyleSheet.create({
  exerciseBox: {
  borderWidth: 1,
  borderRadius: 12,
  padding: 16,
  paddingBottom: 40,
  marginBottom: 16,
  marginHorizontal: 16,
  backgroundColor: '#fff', // fallback, overridden by theme
  shadowColor: '#000', // fallback, overridden by theme
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.12,
  shadowRadius: 6,
  elevation: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  exerciseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 0,
  },
  exerciseTitleInput: {
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 8,
    borderRadius: 6,
    flex: 1,
  },
  editPencilPressable: { marginLeft: 8, borderRadius: 16, overflow: 'hidden' },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 44,
  },
  setLabel: { width: 64, fontWeight: '600', marginRight: 8, height: 40, lineHeight: 40 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 4, flex: 1, marginRight: 8, marginBottom: 8 },
  inputWeight: { width: 100, marginRight: 8, height: 40, paddingVertical: 6, textAlignVertical: 'center' },
  inputReps: { width: 80, marginRight: 8, height: 40, paddingVertical: 6, textAlignVertical: 'center' },
  addSetLink: { marginBottom: 8 },
  addSetLinkPressed: { opacity: 0.8 },
  addSetText: { color: colors.primary, fontWeight: '700' },
  notesInput: { marginTop: 8 },
  removeBtn: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 6, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: -8, borderRadius: 8 },
  removeBtnPressed: { opacity: 0.8 },
  removeBtnText: { color: '#ff3b30', fontWeight: '700', fontSize: 18 },
  goalBadge: { position: 'absolute', right: 10, top: 8, backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  goalBadgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  checkbox: { width: 36, height: 36, borderRadius: 6, borderWidth: 1, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxDisabled: { backgroundColor: '#f2f2f2', borderColor: '#ddd' },
  checkboxPressed: { opacity: 0.85 },
  checkboxText: { color: '#fff', fontWeight: '700' },
  inputDisabled: { backgroundColor: '#f2f2f2', color: '#999' },
  removeExerciseAbsolute: { position: 'absolute', right: 10, bottom: 10, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, backgroundColor: 'transparent' },
  removeExerciseText: { color: '#ff3b30', fontWeight: '600', fontSize: 12 },
});
