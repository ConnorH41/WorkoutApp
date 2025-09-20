import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';

type Props = {
  todayWorkout: any | null;
  isRestDay: boolean;
  completing?: boolean;
  resting?: boolean;
  onConfirmComplete: () => void;
  onConfirmRestToggle: () => void;
};

export default function WorkoutControls({ todayWorkout, isRestDay, completing = false, resting = false, onConfirmComplete, onConfirmRestToggle }: Props) {
  return (
    <View>
      {todayWorkout && !isRestDay && (
        <TouchableOpacity onPress={onConfirmComplete} disabled={completing} style={{ backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{completing ? 'Completing...' : 'Mark Workout Complete'}</Text>
        </TouchableOpacity>
      )}

      {todayWorkout && (
        <TouchableOpacity onPress={onConfirmRestToggle} disabled={resting} style={{ marginTop: 8, backgroundColor: isRestDay ? '#007AFF' : '#fff', borderWidth: isRestDay ? 0 : 1, borderColor: '#ccc', padding: 10, borderRadius: 8, alignItems: 'center' }}>
          <Text style={{ color: isRestDay ? '#fff' : '#333', fontWeight: '700' }}>{resting ? 'Logging...' : (isRestDay ? 'Unmark as Rest Day' : 'Mark as Rest Day')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
