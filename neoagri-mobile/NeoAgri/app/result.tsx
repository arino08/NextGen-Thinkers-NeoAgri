import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import Card from '../components/Card';
import BigButton from '../components/BigButton';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  MOCK_RESULT,
} from '../constants/theme';

type LangKey = keyof typeof MOCK_RESULT;

export default function ResultScreen() {
  const router = useRouter();
  const { photoUri } = useLocalSearchParams<{ photoUri: string }>();
  const [lang, setLang] = useState<LangKey>('en');
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('selectedLanguage').then((savedLang) => {
      if (savedLang && (savedLang in MOCK_RESULT)) {
        setLang(savedLang as LangKey);
      }
    });
  }, []);

  const result = MOCK_RESULT[lang] || MOCK_RESULT.en;

  useEffect(() => {
    const timer = setTimeout(() => {
      speakResult();
    }, 1000);

    return () => {
      clearTimeout(timer);
      Speech.stop();
    };
  }, [lang]);

  const speakResult = () => {
    const speechLang =
      lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN';

    const text = `${result.disease}. ${result.remedy}. ${result.dosage}. ${result.instructions}`;

    setIsSpeaking(true);
    Speech.speak(text, {
      language: speechLang,
      rate: 0.85,
      pitch: 1.0,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const handleScanAgain = () => {
    Speech.stop();
    router.replace('/camera');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>📋</Text>
          <Text style={styles.headerTitle}>
            {lang === 'hi' ? 'निदान रिपोर्ट' : lang === 'mr' ? 'निदान अहवाल' : 'Diagnosis Report'}
          </Text>
        </View>

        {/* Diagnosis Card */}
        <Card title={lang === 'hi' ? '🔍 रोग की पहचान' : lang === 'mr' ? '🔍 रोगाची ओळख' : '🔍 Disease Identified'} variant="warning">
          <View style={styles.diagnosisContent}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.leafImage} />
            ) : (
              <View style={[styles.leafImage, styles.placeholderImage]}>
                <Text style={styles.placeholderEmoji}>🍂</Text>
              </View>
            )}
            <View style={styles.diagnosisInfo}>
              <Text style={styles.diseaseName}>{result.disease}</Text>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>
                  {result.confidence}%{' '}
                  {lang === 'hi' ? 'सटीकता' : lang === 'mr' ? 'अचूकता' : 'Confidence'}
                </Text>
              </View>
              <View style={styles.severityBadge}>
                <Text style={styles.severityText}>
                  ⚠️ {result.severity}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Remedy Card */}
        <Card
          title={
            lang === 'hi'
              ? '💊 उपचार'
              : lang === 'mr'
              ? '💊 उपचार'
              : '💊 Recommended Treatment'
          }
          variant="success"
        >
          <View style={styles.remedySection}>
            <View style={styles.remedyHeader}>
              <Text style={styles.remedyIcon}>🧪</Text>
              <Text style={styles.remedyName}>{result.remedy}</Text>
            </View>

            <View style={styles.dosageBox}>
              <Text style={styles.dosageLabel}>
                {lang === 'hi' ? 'खुराक:' : lang === 'mr' ? 'मात्रा:' : 'Dosage:'}
              </Text>
              <Text style={styles.dosageValue}>{result.dosage}</Text>
            </View>

            <View style={styles.instructionBox}>
              <Text style={styles.instructionLabel}>
                {lang === 'hi' ? 'निर्देश:' : lang === 'mr' ? 'सूचना:' : 'Instructions:'}
              </Text>
              <Text style={styles.instructionValue}>{result.instructions}</Text>
            </View>

            <View style={styles.preventionBox}>
              <Text style={styles.preventionLabel}>
                {lang === 'hi' ? '🛡️ रोकथाम:' : lang === 'mr' ? '🛡️ प्रतिबंध:' : '🛡️ Prevention:'}
              </Text>
              <Text style={styles.preventionValue}>{result.prevention}</Text>
            </View>
          </View>
        </Card>

        {/* Audio Card */}
        <Card title={lang === 'hi' ? '🔊 ऑडियो' : lang === 'mr' ? '🔊 ऑडिओ' : '🔊 Listen'}>
          <TouchableOpacity
            style={[
              styles.audioButton,
              isSpeaking && styles.audioButtonActive,
            ]}
            onPress={speakResult}
            activeOpacity={0.7}
          >
            <Text style={styles.audioButtonIcon}>
              {isSpeaking ? '🔊' : '▶️'}
            </Text>
            <Text style={styles.audioButtonText}>
              {isSpeaking
                ? lang === 'hi'
                  ? 'सुन रहे हैं...'
                  : lang === 'mr'
                  ? 'ऐकत आहे...'
                  : 'Playing...'
                : lang === 'hi'
                ? 'ऑडियो सुनें'
                : lang === 'mr'
                ? 'ऑडिओ ऐका'
                : 'Play Audio'}
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Scan Again */}
        <View style={styles.bottomAction}>
          <BigButton
            title={
              lang === 'hi'
                ? '📷 फिर से स्कैन करें'
                : lang === 'mr'
                ? '📷 पुन्हा स्कॅन करा'
                : '📷 Scan Again'
            }
            onPress={handleScanAgain}
            variant="primary"
            size="large"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  headerIcon: {
    fontSize: 28,
    marginRight: SPACING.sm,
  },
  headerTitle: {
    ...TYPOGRAPHY.heading,
    color: COLORS.text,
  },
  // Diagnosis card
  diagnosisContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  leafImage: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  placeholderImage: {
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 40,
  },
  diagnosisInfo: {
    flex: 1,
  },
  diseaseName: {
    ...TYPOGRAPHY.heading,
    color: COLORS.danger,
    marginBottom: SPACING.sm,
  },
  confidenceBadge: {
    backgroundColor: '#E8F5E9',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    marginBottom: SPACING.xs,
  },
  confidenceText: {
    ...TYPOGRAPHY.label,
    color: COLORS.success,
    fontWeight: '700',
  },
  severityBadge: {
    backgroundColor: '#FFF3E0',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  severityText: {
    ...TYPOGRAPHY.label,
    color: COLORS.warning,
    fontWeight: '600',
  },
  // Remedy
  remedySection: {
    gap: SPACING.md,
  },
  remedyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  remedyIcon: {
    fontSize: 28,
    marginRight: SPACING.sm,
  },
  remedyName: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.primaryDark,
    flex: 1,
  },
  dosageBox: {
    backgroundColor: COLORS.surfaceWarm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  dosageLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  dosageValue: {
    ...TYPOGRAPHY.heading,
    color: COLORS.text,
  },
  instructionBox: {
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
  },
  instructionLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  instructionValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  preventionBox: {
    padding: SPACING.md,
    backgroundColor: '#E3F2FD',
    borderRadius: RADIUS.md,
  },
  preventionLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  preventionValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  // Audio
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.accentDark,
    ...SHADOWS.medium,
  },
  audioButtonActive: {
    backgroundColor: COLORS.primary,
    borderBottomColor: COLORS.primaryDark,
  },
  audioButtonIcon: {
    fontSize: 32,
    marginRight: SPACING.sm,
  },
  audioButtonText: {
    ...TYPOGRAPHY.heading,
    color: COLORS.textLight,
  },
  // Bottom
  bottomAction: {
    marginTop: SPACING.lg,
  },
});
