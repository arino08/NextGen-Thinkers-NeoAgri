import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../../lib/voiceStyles';

export default function VoiceOrb({ onPress, onPressIn, onPressOut, state = 'idle', amplitude = 0 }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim1 = useRef(new Animated.Value(0)).current;
  const spinAnim2 = useRef(new Animated.Value(0)).current;
  const spinAnim3 = useRef(new Animated.Value(0)).current;
  const holdScale = useRef(new Animated.Value(1)).current;
  const rotateSpinner = useRef(new Animated.Value(0)).current;

  // Fluid continuous rotation of 3 overlapping gradients
  useEffect(() => {
    const startSpin = (anim, duration, toValue) => {
      Animated.loop(
        Animated.timing(anim, {
          toValue,
          duration,
          useNativeDriver: true,
        })
      ).start();
    };
    startSpin(spinAnim1, 8000, 1);
    startSpin(spinAnim2, 12000, -1);
    startSpin(spinAnim3, 10000, 1);

    return () => {
      spinAnim1.stopAnimation();
      spinAnim2.stopAnimation();
      spinAnim3.stopAnimation();
    };
  }, [spinAnim1, spinAnim2, spinAnim3]);

  // Idle / Connecting / Processing breathing
  useEffect(() => {
    let animation;
    if (state === 'idle' || state === 'connecting' || state === 'processing') {
      const speed = state === 'idle' ? 2000 : 1000;
      const toScale = state === 'idle' ? 1.05 : 1.15;
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: toScale,
            duration: speed,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: speed,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => { if (animation) animation.stop(); };
  }, [state, pulseAnim]);

  // Listening / Speaking scale mapped to amplitude or strong pulse
  useEffect(() => {
    if (state === 'listening') {
      Animated.spring(scaleAnim, {
        toValue: 1.0 + (amplitude * 0.8),
        useNativeDriver: true,
        bounciness: 25,
        speed: 16,
      }).start();
    } else if (state === 'speaking') {
        const speakingAmplitude = Math.max(0.1, amplitude);
        Animated.spring(scaleAnim, {
            toValue: 1.05 + (speakingAmplitude * 0.6),
            useNativeDriver: true,
            bounciness: 15,
            speed: 20,
        }).start();
    } else {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  }, [state, amplitude, scaleAnim]);

  // Connecting spinner ring
  useEffect(() => {
    if (state === 'connecting' || state === 'processing') {
      rotateSpinner.setValue(0);
      Animated.loop(
        Animated.timing(rotateSpinner, {
          toValue: 1,
          duration: state === 'processing' ? 1500 : 800,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateSpinner.stopAnimation();
    }
  }, [state, rotateSpinner]);

  const spin1 = spinAnim1.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-360deg', '0deg', '360deg'] });
  const spin2 = spinAnim2.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-360deg', '0deg', '360deg'] });
  const spin3 = spinAnim3.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-360deg', '0deg', '360deg'] });
  const spinArc = rotateSpinner.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // Siri-like fluid gradients depending on state
  const getGradients = () => {
    switch (state) {
      case 'listening': return ['#ff3b3b', '#ff6b6b', '#ff8e8e'];
      case 'speaking': return ['#3b87ff', '#6ba1ff', '#8ebaff'];
      case 'processing': return ['#ff9f3b', '#ffb76b', '#ffcc8e'];
      case 'connecting': return ['#3b87ff', '#ff9f3b', '#ff3b3b'];
      case 'offline': return ['#888888', '#aaaaaa', '#cccccc'];
      case 'idle':
      default:
        return ['#2ebf91', '#8360c3', '#2ebf91'];
    }
  };

  const colors = getGradients();

  const icon = state === 'listening' ? '🔴' : '🎤';
  const labelText = {
    offline: 'Offline',
    idle: 'Hold to speak',
    connecting: 'Connecting...',
    listening: 'Recording...',
    processing: 'Thinking...',
    speaking: 'Speaking...',
  }[state] || '';

  const handlePressIn = () => {
    if (onPressIn) {
      Animated.spring(holdScale, {
        toValue: 0.85,
        useNativeDriver: true,
        bounciness: 15,
      }).start();
      onPressIn();
    }
  };

  const handlePressOut = () => {
    if (onPressOut) {
      Animated.spring(holdScale, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 15,
      }).start();
      onPressOut();
    }
  };

  return (
    <View style={styles.container}>
      {(state === 'connecting' || state === 'processing') && (
        <Animated.View style={[styles.spinnerArc, { transform: [{ rotate: spinArc }] }]} />
      )}

      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={[
          styles.orbBase,
          { transform: [{ scale: Animated.multiply(scaleAnim, Animated.multiply(pulseAnim, holdScale)) }] }
        ]}>
          <Animated.View style={[styles.layer, { transform: [{ rotate: spin1 }] }]}>
             <LinearGradient colors={[colors[0], 'transparent']} style={styles.gradientFill} start={{x:0, y:0}} end={{x:1, y:1}} />
          </Animated.View>
          <Animated.View style={[styles.layer, { transform: [{ rotate: spin2 }] }]}>
             <LinearGradient colors={['transparent', colors[1]]} style={styles.gradientFill} start={{x:0, y:1}} end={{x:1, y:0}} />
          </Animated.View>
          <Animated.View style={[styles.layer, { transform: [{ rotate: spin3 }] }]}>
             <LinearGradient colors={[colors[2], 'transparent']} style={styles.gradientFill} start={{x:1, y:0}} end={{x:0, y:1}} opacity={0.6}/>
          </Animated.View>

          <View style={styles.innerGlass}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
        </Animated.View>
      </Pressable>
      {labelText ? <Text style={styles.label}>{labelText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...FONTS.hindiSmall,
    marginTop: 24,
    color: '#888',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 1,
  },
  spinnerArc: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 3,
    borderColor: 'rgba(150, 150, 150, 0.2)',
    borderTopColor: COLORS.orbAmber,
    top: -15, // center around 180 orb
  },
  orbBase: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a', // dark base to make gradients pop
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
    overflow: 'hidden',
  },
  layer: {
    position: 'absolute',
    width: '140%', // larger than base so it rotates without clipping edges
    height: '140%',
    borderRadius: 180,
    opacity: 0.8,
  },
  gradientFill: {
    flex: 1,
    borderRadius: 180,
  },
  innerGlass: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)', // glassy effect
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  icon: {
    fontSize: 36,
  }
});
