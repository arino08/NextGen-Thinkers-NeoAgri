import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import VoiceOrb from '../components/voice/VoiceOrb';
import StatusBanner from '../components/voice/StatusBanner';
import TranscriptFeed from '../components/voice/TranscriptFeed';
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

  // Mock data for Phase 3 testing
  const mockHistory = [
    { role: 'user', text: 'नमस्कार, सोयाबीन में कीड़े लग गए हैं' },
    { role: 'ai', text: 'मैं समझ गया। कृपया मुझे पत्तों की एक फोटो दिखाएँ।' },
  ];
  
  const currentTranscript = currentState === 'listening' ? 'मैं आपको फोटो...' : '';

  return (
    <View style={styles.container}>
      <StatusBanner status={currentState} />
      
      <View style={styles.transcriptContainer}>
        <TranscriptFeed history={mockHistory} transcript={currentTranscript} />
      </View>

      <View style={styles.orbContainer}>
        <VoiceOrb 
          onPress={cycleState} 
          state={currentState} 
          amplitude={amplitude} 
        />
      </View>
      
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
  },
  transcriptContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    paddingBottom: 20,
    paddingTop: 120,
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 240,
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
