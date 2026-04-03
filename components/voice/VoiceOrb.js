import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../../lib/voiceStyles';

export default function VoiceOrb({ onPress, state = 'idle' }) {
  const idlePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animation;
    if (state === 'idle') {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(idlePulse, {
            toValue: 1.05,
            duration: 1250,
            useNativeDriver: true,
          }),
          Animated.timing(idlePulse, {
            toValue: 1.0,
            duration: 1250,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      idlePulse.setValue(1);
    }
    
    return () => {
      if (animation) animation.stop();
    };
  }, [state]);

  return (
    <View style={styles.container}>
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        <Animated.View style={[styles.orb, { transform: [{ scale: idlePulse }] }]}>
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
