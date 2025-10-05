import React from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '../styles/theme';
import Button from './Button';

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
        <Button
          label={completing ? 'Completing...' : (todayWorkout && todayWorkout.completed ? 'Unmark Workout as Complete' : 'Mark Workout Complete')}
          onPress={todayWorkout && todayWorkout.completed ? (onUnmarkComplete || onConfirmComplete) : onConfirmComplete}
          variant="primary"
          disabled={completing}
          loading={completing}
          style={styles.completeButton}
          fullWidth
        />
      )}

      {todayWorkout && !isRestDay && (
        <Button
          label={resting ? 'Logging...' : 'Mark as Rest Day'}
          onPress={onConfirmRestToggle}
          variant="secondary"
          disabled={resting}
          loading={resting}
          style={styles.restButton}
          fullWidth
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  completeButton: {
    marginTop: spacing.md,
  },
  restButton: {
    marginTop: spacing.sm,
  },
});
