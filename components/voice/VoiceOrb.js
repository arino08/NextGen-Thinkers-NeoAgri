import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../lib/voiceStyles';

export default function VoiceOrb({ onPress }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.orb}>
        <Text style={styles.icon}>🎤</Text>
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
