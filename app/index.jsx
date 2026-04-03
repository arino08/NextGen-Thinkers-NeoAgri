import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import VoiceOrb from '../components/voice/VoiceOrb';
import StatusBanner from '../components/voice/StatusBanner';
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

const STATES = ['idle', 'connecting', 'listening', 'speaking', 'offline'];

export default function Index() {
  const [currentStateIndex, setCurrentStateIndex] = useState(0);
  const [amplitude, setAmplitude] = useState(0);

  const currentState = STATES[currentStateIndex];

  useEffect(() => {
    let interval;
    if (currentState === 'listening') {
      interval = setInterval(() => {
        setAmplitude(Math.random());
      }, 100);
    } else {
      setAmplitude(0);
    }
    return () => clearInterval(interval);
  }, [currentState]);

  const cycleState = () => {
    setCurrentStateIndex((prev) => (prev + 1) % STATES.length);
  };

  return (
    <View style={styles.container}>
      <StatusBanner status={currentState} />
      <VoiceOrb 
        onPress={cycleState} 
        state={currentState} 
        amplitude={amplitude} 
      />
      
      <TouchableOpacity style={styles.debugButton} onPress={cycleState}>
        <Text style={styles.debugText}>Current State: {currentState} (Tap to change)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugButton: {
    marginTop: 40,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  debugText: {
    color: '#fff',
    fontSize: 14,
  }
});
