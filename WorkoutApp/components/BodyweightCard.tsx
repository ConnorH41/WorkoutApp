import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import styles from '../styles/todayStyles';
import { colors } from '../styles/theme';

interface BodyweightCardProps {
  bodyweight: string;
  isKg: boolean;
  submitting: boolean;
  recordId: string | null;
  onChangeWeight: (v: string) => void;
  onSave: () => void;
}

const ELEMENT_HEIGHT = 40;

export default function BodyweightCard({ bodyweight, isKg, submitting, recordId, onChangeWeight, onSave }: BodyweightCardProps) {
  return (
    <View style={[styles.exerciseBox, { marginBottom: 16, marginHorizontal: 16 }]}>  
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={styles.exerciseTitle}>Bodyweight</Text>
      </View>
      
      {/* Main content row with all elements aligned */}
      <View style={localStyles.contentRow}>
        {/* Checkbox */}
        <TouchableOpacity
          onPress={onSave}
          style={[
            localStyles.checkbox,
            recordId ? styles.checkboxChecked : null,
          ]}
          disabled={submitting}
          accessibilityLabel="Log bodyweight"
        >
          {recordId ? <Text style={styles.checkboxText}>✓</Text> : null}
        </TouchableOpacity>

        {/* TextInput */}
        <TextInput
          style={[
            localStyles.textInput,
            recordId ? styles.inputDisabled : null,
          ]}
          placeholder={isKg ? 'Weight (kg)' : 'Weight (lb)'}
          value={bodyweight}
          onChangeText={onChangeWeight}
          keyboardType="numeric"
          editable={!recordId}
        />

        {/* Unit label */}
        <View style={localStyles.unitLabel}>
          <Text style={localStyles.unitLabelText}>{isKg ? 'kg' : 'lb'}</Text>
        </View>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: ELEMENT_HEIGHT,
    height: ELEMENT_HEIGHT,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.backgroundMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: ELEMENT_HEIGHT,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlignVertical: 'center',
    color: '#000',
  },
  unitLabel: {
    height: ELEMENT_HEIGHT,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 48,
  },
  unitLabelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
