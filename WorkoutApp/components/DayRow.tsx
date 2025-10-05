import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import styles from '../styles/daysStyles';
import SwipeableRow from './SwipeableRow';
import EditPencil from './EditPencil';
import RemoveButton from './RemoveButton';
import ExpandableView from './animations/ExpandableView';
import { Day } from '../lib/types';
import { colors } from '../styles/theme';

type Props = {
  day: Day;
  isSelected: boolean;
  onPress: () => void;
  exerciseCount?: number;
  onEditDay: (id: string, name: string) => void;
  onDeleteDay: (id: string) => void;
  expandedContent?: React.ReactNode;
  enableSwipe?: boolean;
};

export default function DayRow({ day, isSelected, onPress, exerciseCount = 0, onEditDay, onDeleteDay, expandedContent, enableSwipe = true }: Props) {
  const content = (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.dayBox}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.dayName}>{day.name}</Text>
          <EditPencil onPress={() => onEditDay(day.id, day.name)} accessibilityLabel={`Edit ${day.name}`} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.exerciseCountBadge}>
            <Text style={styles.badgeText}>{exerciseCount} {exerciseCount === 1 ? 'Exercise' : 'Exercises'}</Text>
          </View>
        </View>
      </View>
      <View style={styles.dayActions}>
        <RemoveButton onPress={() => onDeleteDay(day.id)} label="Delete" accessibilityLabel={`Delete ${day.name}`} />
      </View>
      <ExpandableView expanded={isSelected}>
        {expandedContent}
      </ExpandableView>
    </TouchableOpacity>
  );

  if (!enableSwipe) {
    return content;
  }

  return (
    <SwipeableRow
      rightActions={[
        {
          label: 'Edit',
          onPress: () => onEditDay(day.id, day.name),
          backgroundColor: colors.primary,
          textColor: colors.background,
        },
        {
          label: 'Delete',
          onPress: () => onDeleteDay(day.id),
          backgroundColor: colors.danger,
          textColor: colors.background,
        },
      ]}
    >
      {content}
    </SwipeableRow>
  );
}
