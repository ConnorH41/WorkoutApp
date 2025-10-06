import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../styles/theme';

interface BadgeProps {
	text: string;
	style?: ViewStyle;
	textStyle?: TextStyle;
	backgroundColor?: string;
	color?: string;
	size?: 'sm' | 'md' | 'lg';
	position?: 'absolute' | 'relative';
	right?: number;
	top?: number;
}

const sizeMap = {
		sm: { paddingVertical: 6, paddingHorizontal: 8, fontSize: 12 },
		md: { paddingVertical: 8, paddingHorizontal: 12, fontSize: 14 },
		lg: { paddingVertical: 10, paddingHorizontal: 16, fontSize: 16 },
};

const Badge: React.FC<BadgeProps> = ({
	text,
	style,
	textStyle,
	backgroundColor = colors.primary,
	color = colors.surface,
	size = 'sm',
	position = 'relative',
	right,
	top,
}) => {
	const sizeStyles = sizeMap[size];
	return (
		<View
			style={[
				{
					backgroundColor,
					borderRadius: 12,
					position,
					right,
					top,
					...sizeStyles,
				},
				style,
			]}
		>
			<Text
				style={[
					{
						color,
						fontWeight: '700',
						fontSize: sizeStyles.fontSize,
					},
					textStyle,
				]}
			>
				{text}
			</Text>
		</View>
	);
};

export default Badge;
