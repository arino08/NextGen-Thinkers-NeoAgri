import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../constants/theme';

interface BigButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'accent' | 'white';
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'normal' | 'large';
}

export default function BigButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  style,
  textStyle,
  size = 'normal',
}: BigButtonProps) {
  const bgColor =
    variant === 'primary'
      ? COLORS.primary
      : variant === 'accent'
      ? COLORS.accent
      : COLORS.background;

  const txtColor =
    variant === 'white' ? COLORS.text : COLORS.textLight;

  const shadowStyle =
    variant === 'primary'
      ? SHADOWS.button3D
      : SHADOWS.medium;

  const bottomBorder =
    variant === 'primary'
      ? COLORS.primaryDark
      : variant === 'accent'
      ? COLORS.accentDark
      : COLORS.border;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.button,
        size === 'large' && styles.buttonLarge,
        { backgroundColor: bgColor, borderBottomColor: bottomBorder },
        shadowStyle,
        style,
      ]}
    >
      <View style={styles.content}>
        {icon && <View style={styles.iconWrap}>{icon}</View>}
        <Text
          style={[
            size === 'large' ? styles.textLarge : styles.text,
            { color: txtColor },
            textStyle,
          ]}
        >
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  buttonLarge: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    minHeight: 72,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    marginRight: SPACING.sm,
  },
  text: {
    ...TYPOGRAPHY.bodyBold,
    textAlign: 'center',
  },
  textLarge: {
    ...TYPOGRAPHY.heading,
    textAlign: 'center',
  },
});
