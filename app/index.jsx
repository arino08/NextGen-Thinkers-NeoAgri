import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Animated, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import FluidBlob from '../components/voice/FluidBlob';
import StatusBanner from '../components/voice/StatusBanner';
import TranscriptFeed from '../components/voice/TranscriptFeed';
import DiseaseCard from '../components/voice/DiseaseCard';
import LoadingScreen from '../components/voice/LoadingScreen';
import DemoMenu from '../components/voice/DemoMenu';
import { COLORS, FONTS } from '../lib/voiceStyles';

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
  const [showLoading, setShowLoading] = useState(true);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const fadeOut = useState(new Animated.Value(1))[0];

  // Auto-connect on mount
  useEffect(() => {
    startSession();
  }, []);

  // Fade out loading once connected
  useEffect(() => {
    if (sessionActive && showLoading) {
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setShowLoading(false));
    }
  }, [sessionActive, showLoading]);

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

  const handleDemoTool = async (toolName) => {
    if (TOOL_HANDLERS[toolName]) {
      const result = await TOOL_HANDLERS[toolName]({});
      console.log(`[Demo] ${toolName}:`, result);
    }
  };

  const blobState = sessionActive ? status : 'idle';
  const statusLabel = {
    idle: 'Hold to speak',
    listening: 'Listening...',
    processing: 'Thinking...',
    speaking: 'Speaking...',
    connecting: 'Connecting...',
    offline: 'Offline',
  }[status] || '';

  return (
    <SafeAreaView style={styles.container}>
      {/* Loading overlay */}
      {showLoading && (
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: fadeOut, zIndex: 100 }]}>
          <LoadingScreen />
        </Animated.View>
      )}

      <StatusBanner status={status} />

      {/* Demo button — top right */}
      {sessionActive && (
        <TouchableOpacity
          style={styles.demoButton}
          onPress={() => setShowDemoMenu(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.demoButtonText}>🧪</Text>
        </TouchableOpacity>
      )}

      {/* Transcript area */}
      <View style={styles.transcriptContainer}>
        <TranscriptFeed
          history={history}
          transcript={transcript}
          agentTranscript={agentTranscript}
        />
      </View>

      {/* Blob area */}
      <View style={styles.blobContainer}>
        <FluidBlob
          state={blobState}
          amplitude={amplitude}
          onPress={() => {}}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        />
        <Text style={styles.statusLabel}>{sessionActive ? statusLabel : ''}</Text>
      </View>

      {diseaseResult && (
        <DiseaseCard
          disease={diseaseResult}
          onDismiss={() => setDiseaseResult(null)}
        />
      )}

      {/* Demo menu modal */}
      <DemoMenu
        visible={showDemoMenu}
        onClose={() => setShowDemoMenu(false)}
        onRunTool={handleDemoTool}
      />
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
    paddingBottom: 10,
  },
  blobContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 30,
  },
  statusLabel: {
    ...FONTS.hindiSmall,
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  demoButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    borderWidth: 1,
    borderColor: '#333',
  },
  demoButtonText: {
    fontSize: 20,
  },
});
