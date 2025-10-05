export const colors = {
  primary: '#C62828',
  primaryLight: '#E57373',
  primaryDark: '#8E0000',
  accent: '#FF5722',
  accentLight: '#FF8A65',
  background: '#FAFAFA',
  backgroundMuted: '#F5F5F5',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#212121',
  textMuted: '#757575',
  textLight: '#9E9E9E',
  success: '#4CAF50',
  successLight: '#81C784',
  warning: '#FF9800',
  warningLight: '#FFB74D',
  danger: '#F44336',
  dangerLight: '#E57373',
  border: '#E0E0E0',
  borderLight: '#EEEEEE',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
};


export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 999,
};

export const fonts = {
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    huge: 32,
  },
  weight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};
