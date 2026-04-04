import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS, FONTS } from '../../lib/voiceStyles';

export default function LoadingScreen() {
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Logo pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Dots animation
    const dots = Animated.loop(
      Animated.timing(dotAnim, {
        toValue: 3,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    dots.start();

    return () => {
      pulse.stop();
      dots.stop();
    };
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeIn }]}>
      {/* Glow background */}
      <View style={styles.glowOuter} />
      <View style={styles.glowInner} />

      {/* Logo */}
      <Animated.View style={[styles.logoContainer, { opacity: pulseAnim }]}>
        <Text style={styles.logoEmoji}>🌱</Text>
        <Text style={styles.logoText}>NeoAgri</Text>
        <Text style={styles.logoSubtext}>AI Voice Agent</Text>
      </Animated.View>

      {/* Loading bar */}
      <View style={styles.loadingContainer}>
        <View style={styles.loadingBar}>
          <Animated.View style={[styles.loadingBarFill, {
            opacity: pulseAnim,
          }]} />
        </View>
        <Text style={styles.loadingText}>Connecting to AI agent...</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  glowOuter: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(0, 200, 150, 0.05)',
  },
  glowInner: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 200, 150, 0.08)',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.orbTeal,
    letterSpacing: 2,
  },
  logoSubtext: {
    ...FONTS.hindiSmall,
    color: '#666',
    marginTop: 8,
    fontSize: 15,
    letterSpacing: 1,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingBar: {
    width: 200,
    height: 3,
    backgroundColor: '#1a2a20',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  loadingBarFill: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.orbTeal,
    borderRadius: 2,
  },
  loadingText: {
    ...FONTS.hindiSmall,
    color: '#555',
    fontSize: 13,
  },
});
