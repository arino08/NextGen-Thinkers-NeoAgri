import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import VoiceOrb from '../components/voice/VoiceOrb';
import { COLORS } from '../lib/voiceStyles';

// Mock Agent 1 implementation
const mockSession = {
  status: 'idle',
  transcript: '',
  history: [],
  isListening: false,
  amplitude: 0,
  startSession: () => {},
  stopSession: () => {},
  speak: () => {}
};

export default function Index() {
  return (
    <View style={styles.container}>
      <VoiceOrb onPress={() => console.log('Orb Pressed')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
