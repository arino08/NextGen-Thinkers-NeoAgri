import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import VoiceOrb from '../components/voice/VoiceOrb';
import StatusBanner from '../components/voice/StatusBanner';
import TranscriptFeed from '../components/voice/TranscriptFeed';
import DiseaseCard from '../components/voice/DiseaseCard';
import { COLORS } from '../lib/voiceStyles';

import { useVoiceSession } from '../lib/useVoiceSession';
import { TOOL_HANDLERS } from '../lib/VoiceAgentTools';
import { voiceEventEmitter } from '../lib/voiceEventEmitter';

export default function Index() {
  const {
    status,
    transcript,
    agentTranscript,
    history,
    amplitude,
    sessionActive,
    startSession,
    startRecording,
    stopRecording,
  } = useVoiceSession(TOOL_HANDLERS);

  const [diseaseResult, setDiseaseResult] = useState(null);

  useEffect(() => {
    const handler = ({ screen, params }) => router.push({ pathname: `/${screen}`, params });
    voiceEventEmitter.on('NAVIGATE', handler);
    return () => voiceEventEmitter.off('NAVIGATE', handler);
  }, []);

  useEffect(() => {
    const handler = (data) => setDiseaseResult(data);
    voiceEventEmitter.on('DISEASE_RESULT', handler);
    return () => voiceEventEmitter.off('DISEASE_RESULT', handler);
  }, []);

  const handleOrbPress = () => {
    if (!sessionActive) {
      // First tap: connect the session
      if (status === 'idle' || status === 'offline') {
        startSession();
      } else if (status === 'connecting') {
        // Ignore taps while handshake is in progress.
        return;
      }
    }
    // When session is active, press-and-hold handles recording
  };

  const handlePressIn = () => {
    if (sessionActive && (status === 'idle' || status === 'speaking')) {
      startRecording();
    }
  };

  const handlePressOut = () => {
    if (sessionActive && status === 'listening') {
      stopRecording();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBanner status={status} />

      <View style={styles.transcriptContainer}>
        <TranscriptFeed
          history={history}
          transcript={transcript}
          agentTranscript={agentTranscript}
        />
      </View>

      <View style={styles.orbContainer}>
        <VoiceOrb
          onPress={handleOrbPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          state={sessionActive ? status : (status === 'connecting' ? 'connecting' : 'idle')}
          amplitude={amplitude}
        />
      </View>

      {diseaseResult && (
        <DiseaseCard
          disease={diseaseResult}
          onDismiss={() => setDiseaseResult(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transcriptContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 280,
    marginBottom: 30,
  },
});
