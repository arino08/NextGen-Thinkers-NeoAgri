import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../constants/theme';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'success' | 'warning';
}

export default function Card({
  title,
  children,
  style,
  variant = 'default',
}: CardProps) {
  const borderColor =
    variant === 'success'
      ? COLORS.success
      : variant === 'warning'
      ? COLORS.warning
      : COLORS.border;

  return (
    <View style={[styles.card, { borderLeftColor: borderColor }, style]}>
      {title && <Text style={styles.title}>{title}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    ...SHADOWS.medium,
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
});
