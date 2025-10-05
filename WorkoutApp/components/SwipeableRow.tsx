import React, { useRef } from 'react';
import { Animated, View, Text, StyleSheet, Pressable } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { colors, spacing, borderRadius } from '../styles/theme';

type SwipeAction = {
  label: string;
  onPress: () => void;
  backgroundColor?: string;
  textColor?: string;
  icon?: React.ReactNode;
};

type Props = {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipeableOpen?: (direction: 'left' | 'right') => void;
};

export default function SwipeableRow({
  children,
  leftActions = [],
  rightActions = [],
  onSwipeableOpen,
}: Props) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderActions = (
    actions: SwipeAction[],
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    side: 'left' | 'right'
  ) => {
    if (actions.length === 0) return null;

    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: side === 'left' ? [-100, 0] : [100, 0],
    });

    return (
      <View style={styles.actionsContainer}>
        <Animated.View
          style={[
            styles.actions,
            {
              transform: [{ translateX: trans }],
            },
          ]}
        >
          {actions.map((action, index) => (
            <Pressable
              key={index}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: action.backgroundColor || colors.primary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => {
                action.onPress();
                swipeableRef.current?.close();
              }}
            >
              {action.icon}
              <Text
                style={[
                  styles.actionText,
                  { color: action.textColor || colors.background },
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </Animated.View>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      leftThreshold={30}
      rightThreshold={30}
      renderLeftActions={
        leftActions.length > 0
          ? (progress, dragX) => renderActions(leftActions, progress, dragX, 'left')
          : undefined
      }
      renderRightActions={
        rightActions.length > 0
          ? (progress, dragX) => renderActions(rightActions, progress, dragX, 'right')
          : undefined
      }
      onSwipeableOpen={(direction) => {
        onSwipeableOpen?.(direction as 'left' | 'right');
      }}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    minWidth: 80,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
});
