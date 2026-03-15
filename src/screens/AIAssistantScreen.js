import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, borderRadius, shadows } from '../theme/spacing';
import { LanguageContext } from '../context/LanguageContext';

export default function AIAssistantScreen() {
  const { t } = useContext(LanguageContext);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Mock conversation
  const messages = [
    { id: 1, type: 'ai', text: 'Hello! I am your NeoAgri farming assistant. How can I help you today?' },
    { id: 2, type: 'user', text: 'My tomato plants have yellow spots.' },
    { id: 3, type: 'ai', text: 'Yellow spots on tomato leaves can indicate several issues, such as early blight, septoria leaf spot, or nutrient deficiency. Would you like to enable the camera so I can take a look?' },
  ];

  const handleMicPress = () => {
    setIsListening(!isListening);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="sparkles" color={colors.primaryGreen} size={24} />
          <Text style={styles.headerTitle}>{t('assistantTitle')}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.cameraToggle, cameraEnabled && styles.cameraToggleActive]}
          onPress={() => setCameraEnabled(!cameraEnabled)}
        >
          <Ionicons name={cameraEnabled ? "camera" : "camera-outline"} color={cameraEnabled ? colors.white : colors.textSecondary} size={20} />
        </TouchableOpacity>
      </View>

      {/* Mock Camera View (if enabled) */}
      {cameraEnabled && (
        <View style={styles.liveCameraPlaceholder}>
          <Text style={styles.liveCameraText}>{t('liveCameraActive')}</Text>
        </View>
      )}

      {/* Chat Area */}
      <ScrollView contentContainerStyle={styles.chatContainer}>
        {messages.map((msg) => (
          <View key={msg.id} style={[styles.messageBubble, msg.type === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={[styles.messageText, msg.type === 'user' ? styles.userText : styles.aiText]}>
              {msg.text}
            </Text>
            {msg.type === 'ai' && (
              <TouchableOpacity style={styles.readAloudButton}>
                <Ionicons name="volume-medium" size={16} color={colors.primaryGreen} />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Microphone Control Bottom Area */}
      <View style={styles.bottomArea}>
        {isListening && (
          <View style={styles.waveformContainer}>
            <View style={[styles.waveBar, { height: 16 }]} />
            <View style={[styles.waveBar, { height: 24 }]} />
            <View style={[styles.waveBar, { height: 32 }]} />
            <View style={[styles.waveBar, { height: 24 }]} />
            <View style={[styles.waveBar, { height: 16 }]} />
          </View>
        )}
        <Text style={styles.statusText}>
          {isListening ? t('listening') : t('tapToSpeak')}
        </Text>
        
        <TouchableOpacity 
          style={[styles.micButton, isListening && styles.micButtonActive]}
          onPress={handleMicPress}
        >
          <Ionicons name="mic" color={colors.white} size={36} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardBackground,
    ...shadows.soft,
    zIndex: 10,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontFamily: typography.primary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primaryGreen,
  },
  cameraToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraToggleActive: {
    backgroundColor: colors.primaryGreen,
  },
  liveCameraPlaceholder: {
    height: 150,
    backgroundColor: '#1E3120',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveCameraText: {
    color: colors.white,
    fontFamily: typography.secondary,
    opacity: 0.8,
  },
  chatContainer: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.soft,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primaryGreen,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.cardBackground,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontFamily: typography.message, // Uses Aptos fallback
    fontSize: typography.sizes.md,
    lineHeight: 24,
  },
  userText: {
    color: colors.white,
  },
  aiText: {
    color: colors.textPrimary,
  },
  readAloudButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-end',
    padding: spacing.xs,
    backgroundColor: '#F5F5F5',
    borderRadius: borderRadius.round,
  },
  bottomArea: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: colors.background,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.md,
    height: 32,
  },
  waveBar: {
    width: 4,
    backgroundColor: colors.primaryGreen,
    borderRadius: 2,
  },
  statusText: {
    fontFamily: typography.secondary,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
  },
  micButtonActive: {
    backgroundColor: colors.error,
  }
});
