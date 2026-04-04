import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing, Pressable } from 'react-native';

const NUM_LAYERS = 5;
const BASE_SIZE = 200;

// Gorgeous gradient-like colors for the blob layers
const LAYER_COLORS = [
  'rgba(0, 200, 150, 0.55)',   // teal core
  'rgba(0, 180, 220, 0.35)',   // cyan mid
  'rgba(100, 80, 255, 0.25)',  // purple accent
  'rgba(0, 255, 180, 0.20)',   // mint outer
  'rgba(0, 120, 255, 0.15)',   // blue haze
];

const LISTENING_COLORS = [
  'rgba(255, 60, 60, 0.60)',   // red core
  'rgba(255, 100, 50, 0.35)',  // orange mid
  'rgba(255, 40, 100, 0.25)',  // magenta accent
  'rgba(255, 80, 80, 0.20)',   // red outer
  'rgba(200, 30, 80, 0.15)',   // dark pink haze
];

const SPEAKING_COLORS = [
  'rgba(80, 140, 255, 0.55)',  // blue core
  'rgba(100, 200, 255, 0.35)', // light blue
  'rgba(60, 100, 255, 0.25)',  // indigo accent
  'rgba(120, 220, 255, 0.20)', // sky outer
  'rgba(40, 80, 200, 0.15)',   // deep blue haze
];

const PROCESSING_COLORS = [
  'rgba(255, 180, 0, 0.55)',   // amber core
  'rgba(255, 200, 50, 0.35)',  // gold mid
  'rgba(255, 150, 0, 0.25)',   // orange accent
  'rgba(255, 220, 80, 0.20)',  // yellow outer
  'rgba(200, 120, 0, 0.15)',   // dark amber haze
];

function getColors(state) {
  switch (state) {
    case 'listening': return LISTENING_COLORS;
    case 'speaking': return SPEAKING_COLORS;
    case 'processing': return PROCESSING_COLORS;
    default: return LAYER_COLORS;
  }
}

export default function FluidBlob({ state = 'idle', amplitude = 0, onPressIn, onPressOut, onPress }) {
  // Each layer has its own morph animations
  const layers = useMemo(() =>
    Array.from({ length: NUM_LAYERS }, (_, i) => ({
      scaleX: new Animated.Value(1),
      scaleY: new Animated.Value(1),
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      rotate: new Animated.Value(0),
    }))
  , []);

  const pulseScale = useRef(new Animated.Value(1)).current;

  // Continuous fluid morphing animation
  useEffect(() => {
    const animations = layers.map((layer, i) => {
      const speed = 2000 + i * 600;
      const offset = i * 0.15;

      const morphX = Animated.loop(
        Animated.sequence([
          Animated.timing(layer.scaleX, {
            toValue: 1.1 + offset,
            duration: speed,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(layer.scaleX, {
            toValue: 0.9 - offset * 0.5,
            duration: speed * 1.2,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      const morphY = Animated.loop(
        Animated.sequence([
          Animated.timing(layer.scaleY, {
            toValue: 0.9 - offset * 0.5,
            duration: speed * 0.9,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(layer.scaleY, {
            toValue: 1.12 + offset,
            duration: speed * 1.1,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      const drift = Animated.loop(
        Animated.sequence([
          Animated.timing(layer.translateX, {
            toValue: 8 + i * 3,
            duration: speed * 1.5,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(layer.translateX, {
            toValue: -(8 + i * 3),
            duration: speed * 1.3,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      const driftY = Animated.loop(
        Animated.sequence([
          Animated.timing(layer.translateY, {
            toValue: -(6 + i * 2),
            duration: speed * 1.2,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(layer.translateY, {
            toValue: 6 + i * 2,
            duration: speed * 1.4,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      const spin = Animated.loop(
        Animated.timing(layer.rotate, {
          toValue: 1,
          duration: 8000 + i * 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      return [morphX, morphY, drift, driftY, spin];
    });

    animations.forEach(group => group.forEach(a => a.start()));

    return () => {
      animations.forEach(group => group.forEach(a => a.stop()));
    };
  }, []);

  // Amplitude pulse
  useEffect(() => {
    Animated.spring(pulseScale, {
      toValue: 1 + amplitude * 0.4,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [amplitude]);

  const colors = getColors(state);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.pressable}
      >
        <Animated.View style={[styles.blobWrapper, { transform: [{ scale: pulseScale }] }]}>
          {layers.map((layer, i) => {
            const size = BASE_SIZE + i * 20;
            const rotate = layer.rotate.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', i % 2 === 0 ? '360deg' : '-360deg'],
            });

            return (
              <Animated.View
                key={i}
                style={[
                  styles.blobLayer,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: colors[i] || colors[0],
                    transform: [
                      { scaleX: layer.scaleX },
                      { scaleY: layer.scaleY },
                      { translateX: layer.translateX },
                      { translateY: layer.translateY },
                      { rotate },
                    ],
                  },
                ]}
              />
            );
          })}
          {/* Bright center glow */}
          <View style={[styles.centerGlow, {
            backgroundColor: state === 'listening' ? 'rgba(255,80,80,0.4)' :
                             state === 'speaking' ? 'rgba(80,160,255,0.4)' :
                             state === 'processing' ? 'rgba(255,180,0,0.4)' :
                             'rgba(0,200,150,0.4)',
          }]} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: BASE_SIZE + NUM_LAYERS * 20 + 40,
    height: BASE_SIZE + NUM_LAYERS * 20 + 40,
  },
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  blobWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: BASE_SIZE + NUM_LAYERS * 20,
    height: BASE_SIZE + NUM_LAYERS * 20,
  },
  blobLayer: {
    position: 'absolute',
  },
  centerGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
});
