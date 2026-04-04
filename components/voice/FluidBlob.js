import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const ORB_SIZE = 180;
const NUM_RINGS = 4;

const STATE_THEMES = {
  idle: {
    core: ['#00E8A0', '#00B8D4', '#0088FF'],
    rings: ['rgba(0,232,160,0.25)', 'rgba(0,184,212,0.15)', 'rgba(0,136,255,0.10)', 'rgba(0,232,160,0.05)'],
    glow: 'rgba(0,200,150,0.35)',
    innerGlow: 'rgba(255,255,255,0.25)',
  },
  listening: {
    core: ['#FF4060', '#FF6040', '#FF2080'],
    rings: ['rgba(255,64,96,0.30)', 'rgba(255,96,64,0.20)', 'rgba(255,32,128,0.12)', 'rgba(255,64,96,0.06)'],
    glow: 'rgba(255,60,80,0.4)',
    innerGlow: 'rgba(255,255,255,0.3)',
  },
  speaking: {
    core: ['#4080FF', '#60C0FF', '#2060FF'],
    rings: ['rgba(64,128,255,0.25)', 'rgba(96,192,255,0.18)', 'rgba(32,96,255,0.10)', 'rgba(64,128,255,0.05)'],
    glow: 'rgba(80,140,255,0.35)',
    innerGlow: 'rgba(255,255,255,0.25)',
  },
  processing: {
    core: ['#FFB000', '#FFC840', '#FF8800'],
    rings: ['rgba(255,176,0,0.25)', 'rgba(255,200,64,0.18)', 'rgba(255,136,0,0.10)', 'rgba(255,176,0,0.05)'],
    glow: 'rgba(255,180,0,0.35)',
    innerGlow: 'rgba(255,255,255,0.25)',
  },
  offline: {
    core: ['#555555', '#666666', '#444444'],
    rings: ['rgba(100,100,100,0.15)', 'rgba(80,80,80,0.10)', 'rgba(60,60,60,0.08)', 'rgba(50,50,50,0.04)'],
    glow: 'rgba(100,100,100,0.2)',
    innerGlow: 'rgba(255,255,255,0.1)',
  },
};

export default function FluidBlob({ state = 'idle', amplitude = 0, onPressIn, onPressOut, onPress }) {
  const theme = STATE_THEMES[state] || STATE_THEMES.idle;

  // Core orb breathing animation
  const breathe = useRef(new Animated.Value(1)).current;
  // Ring pulse animations
  const ringScales = useMemo(() => Array.from({ length: NUM_RINGS }, () => new Animated.Value(1)), []);
  const ringOpacities = useMemo(() => Array.from({ length: NUM_RINGS }, () => new Animated.Value(1)), []);
  // 3D rotation for depth
  const rotateY = useRef(new Animated.Value(0)).current;
  const rotateX = useRef(new Animated.Value(0)).current;
  // Amplitude response
  const ampScale = useRef(new Animated.Value(1)).current;
  // Spinning halo
  const haloRotate = useRef(new Animated.Value(0)).current;

  // Continuous breathing
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1.06,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0.94,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  // Subtle 3D tilt loop
  useEffect(() => {
    const tiltY = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateY, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(rotateY, { toValue: -1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const tiltX = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateX, { toValue: -0.5, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(rotateX, { toValue: 0.5, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    tiltY.start();
    tiltX.start();
    return () => { tiltY.stop(); tiltX.stop(); };
  }, []);

  // Spinning halo
  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(haloRotate, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, []);

  // Ring ripple — pulses outward when listening/speaking
  useEffect(() => {
    if (state === 'listening' || state === 'speaking') {
      const ripple = Animated.loop(
        Animated.stagger(200, ringScales.map((s, i) =>
          Animated.parallel([
            Animated.sequence([
              Animated.timing(s, { toValue: 1 + (i + 1) * 0.12, duration: 800, easing: Easing.out(Easing.sin), useNativeDriver: true }),
              Animated.timing(s, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ]),
            Animated.sequence([
              Animated.timing(ringOpacities[i], { toValue: 0.3, duration: 800, useNativeDriver: true }),
              Animated.timing(ringOpacities[i], { toValue: 1, duration: 800, useNativeDriver: true }),
            ]),
          ])
        ))
      );
      ripple.start();
      return () => ripple.stop();
    } else {
      ringScales.forEach(s => Animated.spring(s, { toValue: 1, useNativeDriver: true }).start());
      ringOpacities.forEach(o => Animated.timing(o, { toValue: 1, duration: 300, useNativeDriver: true }).start());
    }
  }, [state]);

  // Amplitude response
  useEffect(() => {
    Animated.spring(ampScale, {
      toValue: 1 + amplitude * 0.35,
      friction: 4,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [amplitude]);

  const tiltYDeg = rotateY.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] });
  const tiltXDeg = rotateX.interpolate({ inputRange: [-0.5, 0.5], outputRange: ['-5deg', '5deg'] });
  const haloDeg = haloRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.container}>
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={styles.pressable}>
        <Animated.View style={[styles.scene, {
          transform: [
            { perspective: 800 },
            { rotateY: tiltYDeg },
            { rotateX: tiltXDeg },
            { scale: Animated.multiply(breathe, ampScale) },
          ],
        }]}>

          {/* Outer glow haze */}
          <View style={[styles.outerGlow, { backgroundColor: theme.glow }]} />

          {/* Concentric rings */}
          {ringScales.map((scale, i) => {
            const ringSize = ORB_SIZE + (i + 1) * 36;
            return (
              <Animated.View
                key={`ring-${i}`}
                style={[styles.ring, {
                  width: ringSize,
                  height: ringSize,
                  borderRadius: ringSize / 2,
                  borderColor: theme.rings[i],
                  borderWidth: 1.5 - i * 0.2,
                  transform: [{ scale }],
                  opacity: ringOpacities[i],
                }]}
              />
            );
          })}

          {/* Spinning arc halo */}
          <Animated.View style={[styles.haloTrack, { transform: [{ rotate: haloDeg }] }]}>
            <View style={[styles.haloArc, { backgroundColor: theme.rings[0] }]} />
          </Animated.View>

          {/* Main orb with gradient */}
          <View style={styles.orbShadow}>
            <LinearGradient
              colors={theme.core}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={styles.orb}
            >
              {/* Specular highlight — 3D glass effect */}
              <View style={styles.specular} />

              {/* Inner glow */}
              <View style={[styles.innerGlow, { backgroundColor: theme.innerGlow }]} />
            </LinearGradient>
          </View>

        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ORB_SIZE + NUM_RINGS * 36 + 60,
    height: ORB_SIZE + NUM_RINGS * 36 + 60,
  },
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  scene: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ORB_SIZE + NUM_RINGS * 36 + 20,
    height: ORB_SIZE + NUM_RINGS * 36 + 20,
  },
  outerGlow: {
    position: 'absolute',
    width: ORB_SIZE + 100,
    height: ORB_SIZE + 100,
    borderRadius: (ORB_SIZE + 100) / 2,
    opacity: 0.5,
  },
  ring: {
    position: 'absolute',
  },
  haloTrack: {
    position: 'absolute',
    width: ORB_SIZE + 50,
    height: ORB_SIZE + 50,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  haloArc: {
    width: 24,
    height: 6,
    borderRadius: 3,
    opacity: 0.8,
  },
  orbShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  specular: {
    width: ORB_SIZE * 0.6,
    height: ORB_SIZE * 0.35,
    borderRadius: ORB_SIZE * 0.3,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginTop: ORB_SIZE * 0.1,
    transform: [{ scaleX: 1.2 }],
  },
  innerGlow: {
    position: 'absolute',
    bottom: ORB_SIZE * 0.15,
    width: ORB_SIZE * 0.4,
    height: ORB_SIZE * 0.2,
    borderRadius: ORB_SIZE * 0.2,
    opacity: 0.5,
  },
});
