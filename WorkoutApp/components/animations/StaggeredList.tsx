import React from 'react';
import { View, ViewStyle } from 'react-native';
import FadeInView from './FadeInView';

type Props = {
  children: React.ReactNode[];
  staggerDelay?: number;
  style?: ViewStyle;
};

export default function StaggeredList({ children, staggerDelay = 50, style }: Props) {
  return (
    <View style={style}>
      {React.Children.map(children, (child, index) => (
        <FadeInView key={index} delay={index * staggerDelay}>
          {child}
        </FadeInView>
      ))}
    </View>
  );
}
