import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');

export default function LoadingScreen() {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const barWidth = useRef(new Animated.Value(0)).current;
  const dotOpacity1 = useRef(new Animated.Value(0.2)).current;
  const dotOpacity2 = useRef(new Animated.Value(0.2)).current;
  const dotOpacity3 = useRef(new Animated.Value(0.2)).current;
  const glowScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Entrance
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow breathe
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowScale, {
          toValue: 0.5,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    glow.start();

    // Loading bar
    const bar = Animated.loop(
      Animated.sequence([
        Animated.timing(barWidth, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(barWidth, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    );
    bar.start();

    // Dots cascade
    const dots = Animated.loop(
      Animated.stagger(250, [
        Animated.sequence([
          Animated.timing(dotOpacity1, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dotOpacity1, { toValue: 0.2, duration: 300, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dotOpacity2, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dotOpacity2, { toValue: 0.2, duration: 300, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dotOpacity3, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dotOpacity3, { toValue: 0.2, duration: 300, useNativeDriver: true }),
        ]),
      ])
    );
    dots.start();

    return () => {
      glow.stop();
      bar.stop();
      dots.stop();
    };
  }, []);

  const barWidthInterp = barWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeIn }]}>
      {/* Subtle radial glow behind logo */}
      <Animated.View style={[styles.glow, {
        transform: [{ scale: glowScale }],
        opacity: 0.6,
      }]} />

      {/* Logo */}
      <Animated.View style={[styles.logoArea, { transform: [{ scale: logoScale }] }]}>
        {/* Leaf icon — clean geometric */}
        <View style={styles.leafIcon}>
          <View style={styles.leafShape} />
          <View style={styles.leafStem} />
        </View>

        <Text style={styles.logoText}>NeoAgri</Text>
        <Text style={styles.tagline}>AI-Powered Crop Protection</Text>
      </Animated.View>

      {/* Loading indicator */}
      <View style={styles.loadingArea}>
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, { width: barWidthInterp }]} />
        </View>

        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, { opacity: dotOpacity1 }]} />
          <Animated.View style={[styles.dot, { opacity: dotOpacity2 }]} />
          <Animated.View style={[styles.dot, { opacity: dotOpacity3 }]} />
        </View>

        <Text style={styles.loadingText}>Connecting</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#060A08',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(0,200,150,0.06)',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 80,
  },
  leafIcon: {
    width: 48,
    height: 48,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leafShape: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 2,
    backgroundColor: '#00C896',
    transform: [{ rotate: '-45deg' }],
  },
  leafStem: {
    position: 'absolute',
    bottom: 6,
    width: 2,
    height: 18,
    backgroundColor: '#00C896',
    opacity: 0.6,
    borderRadius: 1,
  },
  logoText: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.2)',
    marginTop: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  loadingArea: {
    alignItems: 'center',
    position: 'absolute',
    bottom: 100,
  },
  barTrack: {
    width: 120,
    height: 2,
    backgroundColor: '#1A2A20',
    borderRadius: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  barFill: {
    height: '100%',
    backgroundColor: '#00C896',
    borderRadius: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00C896',
  },
  loadingText: {
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.15)',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
