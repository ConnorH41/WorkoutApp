import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { colors, spacing } from '../styles/theme';

type Props = {
  todayWorkout: any | null;
  isRestDay: boolean;
  completing?: boolean;
  resting?: boolean;
  onConfirmComplete: () => void;
  onUnmarkComplete?: () => void;
  onConfirmRestToggle: () => void;
};

export default function WorkoutControls({ todayWorkout, isRestDay, completing = false, resting = false, onConfirmComplete, onUnmarkComplete, onConfirmRestToggle }: Props) {
  return (
    <View>
      {todayWorkout && !isRestDay && (
        <TouchableOpacity onPress={todayWorkout && todayWorkout.completed ? (onUnmarkComplete || onConfirmComplete) : onConfirmComplete} disabled={completing} style={{ backgroundColor: colors.primary, padding: 12, borderRadius: 8, alignItems: 'center', marginTop: spacing.md }}>
          <Text style={{ color: colors.background, fontWeight: '700' }}>{completing ? 'Completing...' : (todayWorkout && todayWorkout.completed ? 'Unmark Workout as Complete' : 'Mark Workout Complete')}</Text>
        </TouchableOpacity>
      )}

      {todayWorkout && !isRestDay && (
        <TouchableOpacity onPress={onConfirmRestToggle} disabled={resting} style={{ marginTop: 8, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, padding: 10, borderRadius: 8, alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{resting ? 'Logging...' : 'Mark as Rest Day'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
