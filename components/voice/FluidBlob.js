import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const ORB_SIZE = 160;
const BAR_COUNT = 5;

// Palette per state
const THEMES = {
  idle: {
    gradient: ['#00E8A0', '#00B8D4'],
    glow: 'rgba(0,232,160,0.25)',
    barColor: '#00E8A0',
    ringColors: ['#00E8A0', '#00B8D4', '#006644'],
  },
  listening: {
    gradient: ['#FF4060', '#FF6040'],
    glow: 'rgba(255,64,96,0.30)',
    barColor: '#FF4060',
    ringColors: ['#FF4060', '#FF8060', '#AA2040'],
  },
  speaking: {
    gradient: ['#4080FF', '#60C0FF'],
    glow: 'rgba(64,128,255,0.25)',
    barColor: '#60C0FF',
    ringColors: ['#4080FF', '#60C0FF', '#2050CC'],
  },
  processing: {
    gradient: ['#FFB000', '#FFC840'],
    glow: 'rgba(255,176,0,0.25)',
    barColor: '#FFB000',
    ringColors: ['#FFB000', '#FFC840', '#CC8800'],
  },
  offline: {
    gradient: ['#444', '#555'],
    glow: 'rgba(80,80,80,0.15)',
    barColor: '#555',
    ringColors: ['#444', '#555', '#333'],
  },
};

export default function FluidBlob({ state = 'idle', amplitude = 0, onPressIn, onPressOut, onPress }) {
  const theme = THEMES[state] || THEMES.idle;

  // --- Animated values ---
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.5)).current;
  const ringRotation = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  // Waveform bars — each has its own height animation
  const barHeights = useMemo(
    () => Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.3)),
    []
  );

  // Breathing / idle pulse
  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.04,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.97,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    breathe.start();
    return () => breathe.stop();
  }, []);

  // Ring rotation
  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(ringRotation, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, []);

  // Glow pulse when active
  useEffect(() => {
    if (state === 'listening' || state === 'speaking') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 0.8, duration: 600, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      Animated.timing(glowOpacity, { toValue: 0.5, duration: 400, useNativeDriver: true }).start();
    }
  }, [state]);

  // Waveform bars — react to amplitude
  useEffect(() => {
    const isActive = state === 'listening' || state === 'speaking';
    barHeights.forEach((bh, i) => {
      if (isActive) {
        // Each bar gets a slightly different target to look organic
        const phase = Math.sin(Date.now() / 200 + i * 1.2);
        const target = 0.2 + amplitude * 0.8 + phase * 0.15;
        Animated.spring(bh, {
          toValue: Math.max(0.15, Math.min(1, target)),
          friction: 5,
          tension: 180,
          useNativeDriver: true,
        }).start();
      } else if (state === 'processing') {
        // Processing: sequential wave
        const loopBar = Animated.loop(
          Animated.sequence([
            Animated.delay(i * 120),
            Animated.timing(bh, { toValue: 0.8, duration: 300, easing: Easing.out(Easing.sin), useNativeDriver: true }),
            Animated.timing(bh, { toValue: 0.2, duration: 300, easing: Easing.in(Easing.sin), useNativeDriver: true }),
          ])
        );
        loopBar.start();
        return () => loopBar.stop();
      } else {
        // Idle: small subtle bars
        Animated.spring(bh, {
          toValue: 0.15 + i * 0.05,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }
    });
  }, [amplitude, state]);

  // Press feedback
  const handlePressIn = () => {
    Animated.spring(pressScale, { toValue: 0.92, friction: 6, tension: 200, useNativeDriver: true }).start();
    onPressIn?.();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }).start();
    onPressOut?.();
  };

  const ringDeg = ringRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View style={[styles.wrapper, {
          transform: [
            { scale: Animated.multiply(scaleAnim, pressScale) },
          ],
        }]}>

          {/* Outer glow */}
          <Animated.View style={[styles.glow, {
            backgroundColor: theme.glow,
            opacity: glowOpacity,
          }]} />

          {/* Rotating gradient ring */}
          <Animated.View style={[styles.ringWrapper, { transform: [{ rotate: ringDeg }] }]}>
            <LinearGradient
              colors={theme.ringColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ring}
            />
          </Animated.View>

          {/* Dark inner circle */}
          <View style={styles.innerCircle}>
            {/* Waveform bars */}
            <View style={styles.waveform}>
              {barHeights.map((bh, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.bar,
                    {
                      backgroundColor: theme.barColor,
                      transform: [{ scaleY: bh }],
                    },
                  ]}
                />
              ))}
            </View>
          </View>

        </Animated.View>
      </Pressable>
    </View>
  );
}

const RING_WIDTH = 3;
const INNER_SIZE = ORB_SIZE - RING_WIDTH * 2 - 8;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ORB_SIZE + 80,
    height: ORB_SIZE + 80,
  },
  wrapper: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: ORB_SIZE + 60,
    height: ORB_SIZE + 60,
    borderRadius: (ORB_SIZE + 60) / 2,
  },
  ringWrapper: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
  },
  ring: {
    width: '100%',
    height: '100%',
    borderRadius: ORB_SIZE / 2,
  },
  innerCircle: {
    width: INNER_SIZE,
    height: INNER_SIZE,
    borderRadius: INNER_SIZE / 2,
    backgroundColor: '#0A0F0C',
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle inner shadow effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 50,
  },
  bar: {
    width: 4,
    height: 50,
    borderRadius: 2,
  },
});
