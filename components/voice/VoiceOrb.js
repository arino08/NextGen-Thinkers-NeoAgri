import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../../lib/voiceStyles';

export default function VoiceOrb({ onPress, state = 'idle', amplitude = 0 }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  const ripple3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation;
    if (state === 'idle') {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 1250,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.0,
            duration: 1250,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else if (state !== 'listening') {
      scaleAnim.setValue(1);
    }
    
    return () => {
      if (animation) animation.stop();
    };
  }, [state, scaleAnim]);

  useEffect(() => {
    if (state === 'listening') {
      Animated.spring(scaleAnim, {
        toValue: 1.0 + (amplitude * 0.4),
        useNativeDriver: true,
        bounciness: 20,
        speed: 12,
      }).start();
    }
  }, [state, amplitude, scaleAnim]);

  useEffect(() => {
    if (state === 'speaking') {
      const startRipple = (anim, delay) => {
        anim.setValue(0);
        Animated.sequence([
          Animated.delay(delay),
          Animated.loop(
            Animated.timing(anim, {
              toValue: 1,
              duration: 1600,
              useNativeDriver: true,
            })
          )
        ]).start();
      };

      startRipple(ripple1, 0);
      startRipple(ripple2, 400);
      startRipple(ripple3, 800);
    } else {
      ripple1.stopAnimation();
      ripple2.stopAnimation();
      ripple3.stopAnimation();
      ripple1.setValue(0);
      ripple2.setValue(0);
      ripple3.setValue(0);
    }
  }, [state, ripple1, ripple2, ripple3]);

  const renderRipple = (anim) => {
    const scale = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2],
    });
    const opacity = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 0],
    });
    return (
      <Animated.View
        style={[
          styles.ripple,
          {
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
    );
  };

  return (
    <View style={styles.container}>
      {state === 'speaking' && renderRipple(ripple1)}
      {state === 'speaking' && renderRipple(ripple2)}
      {state === 'speaking' && renderRipple(ripple3)}
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        <Animated.View style={[
          styles.orb, 
          { transform: [{ scale: scaleAnim }], backgroundColor: state === 'speaking' ? COLORS.orbBlue : COLORS.orbTeal }
        ]}>
          <Text style={styles.icon}>🎤</Text>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.orbBlue,
  },
  orb: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.orbTeal,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.orbTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  icon: {
    fontSize: 64,
  },
});
