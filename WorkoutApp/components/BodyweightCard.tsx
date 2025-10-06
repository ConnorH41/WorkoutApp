import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import styles from '../styles/todayStyles';

interface BodyweightCardProps {
  bodyweight: string;
  isKg: boolean;
  submitting: boolean;
  recordId: string | null;
  onChangeWeight: (v: string) => void;
  onToggleKg: (v: boolean) => void;
  onSave: () => void;
}

export default function BodyweightCard({ bodyweight, isKg, submitting, recordId, onChangeWeight, onToggleKg, onSave }: BodyweightCardProps) {
  return (
    <View style={[styles.exerciseBox, { marginBottom: 16, marginHorizontal: 16 }]}>  
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={styles.exerciseTitle}>Bodyweight</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 40 }}>
        <TouchableOpacity
          onPress={onSave}
          style={[styles.checkbox, recordId ? styles.checkboxChecked : null, { height: 40, width: 40, borderRadius: 8 }]}
          disabled={submitting}
          accessibilityLabel="Log bodyweight"
        >
          {recordId ? <Text style={styles.checkboxText}>✓</Text> : null}
        </TouchableOpacity>
        <TextInput
          style={[styles.input, styles.inputWeight, recordId ? styles.inputDisabled : null]}
          placeholder={isKg ? 'Weight (kg)' : 'Weight (lbs)'}
          value={bodyweight}
          onChangeText={onChangeWeight}
          keyboardType="numeric"
          editable={!recordId}
        />
        <View style={[styles.unitSwitchContainer, { marginLeft: 0 }]}> 
          <TouchableOpacity
            style={[styles.unitToggleBtn, isKg ? styles.unitToggleBtnActive : null]}
            onPress={() => onToggleKg(true)}
            activeOpacity={0.9}
          >
            <Text style={[styles.unitToggleText, isKg ? styles.unitToggleTextActive : null]}>kg</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unitToggleBtn, !isKg ? styles.unitToggleBtnActive : null]}
            onPress={() => onToggleKg(false)}
            activeOpacity={0.9}
          >
            <Text style={[styles.unitToggleText, !isKg ? styles.unitToggleTextActive : null]}>lbs</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
