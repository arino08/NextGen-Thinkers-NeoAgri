import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import VoiceOrb from '../components/voice/VoiceOrb';
import StatusBanner from '../components/voice/StatusBanner';
import TranscriptFeed from '../components/voice/TranscriptFeed';
import DiseaseCard from '../components/voice/DiseaseCard';
import { COLORS } from '../lib/voiceStyles';

// Agent 1 & 2 Imports
import { useVoiceSession } from '../lib/useVoiceSession';
import { TOOL_HANDLERS } from '../lib/VoiceAgentTools';
import { voiceEventEmitter } from '../lib/voiceEventEmitter';

export default function Index() {
  const { 
    status, 
    transcript, 
    history, 
    amplitude, 
    startSession, 
    stopSession 
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

  const toggleSession = () => {
    if (status === 'idle' || status === 'offline') {
      startSession();
    } else {
      stopSession();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBanner status={status} />
      
      <View style={styles.transcriptContainer}>
        <TranscriptFeed history={history} transcript={transcript} />
      </View>

      <View style={styles.orbContainer}>
        <VoiceOrb 
          onPress={toggleSession} 
          state={status} 
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
    height: 240,
    marginBottom: 40,
  },
});
