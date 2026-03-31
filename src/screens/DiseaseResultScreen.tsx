import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, borderRadius, shadows } from '../theme/spacing';
import { LanguageContext } from '../context/LanguageContext';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DiseaseResult'>;
};

export default function DiseaseResultScreen({ navigation }: Props) {
  const ctx = useContext(LanguageContext);
  const t = ctx?.t ?? ((k: string) => k);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primaryGreen} />
        <Text style={styles.loadingText}>{t('analyzingInfo')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('analysisResult')}</Text>
        <TouchableOpacity style={styles.voiceButton}>
          <Ionicons name="volume-medium" size={24} color={colors.primaryGreen} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.imagePlaceholder}>
          <Ionicons name="leaf" color={colors.white} size={64} style={{ opacity: 0.5 }} />
        </View>

        <View style={[styles.card, styles.primaryCard]}>
          <View style={styles.resultHeader}>
            <View>
              <Text style={styles.cropName}>Tomato</Text>
              <Text style={styles.diseaseName}>Early Blight</Text>
            </View>
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>94% {t('matchConfidence')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="shield" color={colors.warning} size={20} />
            <Text style={styles.cardTitle}>{t('whyHappened')}</Text>
          </View>
          <Text style={styles.cardText}>
            Early blight is caused by the fungus Alternaria solani. It spreads quickly in warm, humid weather.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="water" color={colors.softGreen} size={20} />
            <Text style={styles.cardTitle}>{t('organicTreatment')}</Text>
          </View>
          <Text style={styles.cardText}>
            • Remove the affected leaves immediately.{'\n'}
            • Spray copper-based organic fungicides early in the morning.{'\n'}
            • Improve air circulation around the plants.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="flask" color={colors.error} size={20} />
            <Text style={styles.cardTitle}>{t('chemicalTreatment')}</Text>
          </View>
          <Text style={styles.cardText}>
            • Apply Chlorothalonil or Mancozeb based fungicides.{'\n'}
            • Repeat application every 7 to 10 days if humid weather persists.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.lg,
    color: colors.primaryGreen,
    fontWeight: typography.weights.medium,
  },
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardBackground,
    ...shadows.soft,
    zIndex: 10,
  },
  backButton: { padding: spacing.xs },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  voiceButton: {
    padding: spacing.xs,
    backgroundColor: '#E8F5E9',
    borderRadius: borderRadius.round,
  },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: colors.softGreen,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.soft,
  },
  primaryCard: { borderLeftWidth: 4, borderLeftColor: colors.error },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cropName: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  diseaseName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.error,
  },
  confidenceBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  confidenceText: {
    color: colors.error,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.textPrimary,
  },
  cardText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: 24,
  },
});
