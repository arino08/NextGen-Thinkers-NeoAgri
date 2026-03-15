import { Platform } from 'react-native';

export const typography = {
  primary: Platform.select({ ios: 'System', android: 'Roboto' }), 
  secondary: Platform.select({ ios: 'System', android: 'Roboto' }), 
  message: Platform.select({ ios: 'System', android: 'Roboto' }), 
  
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 26, // Slightly larger headers
    xxl: 36,
  },
  
  weights: {
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
  }
};
