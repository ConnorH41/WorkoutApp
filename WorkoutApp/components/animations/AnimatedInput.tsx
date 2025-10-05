import React, { useRef, useState } from 'react';
import { TextInput, Animated, TextInputProps, ViewStyle } from 'react-native';

type Props = TextInputProps & {
  containerStyle?: ViewStyle;
};

export default function AnimatedInput({ containerStyle, style, ...props }: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = (e: any) => {
    setIsFocused(true);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1.01,
        tension: 50,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(borderAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
    props.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(borderAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
    props.onBlur?.(e);
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ccc', '#007AFF'],
  });

  const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

  return (
    <Animated.View
      style={[
        containerStyle,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <AnimatedTextInput
        {...props}
        style={[
          style,
          {
            borderColor,
          },
        ]}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </Animated.View>
  );
}
