import { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  LANGUAGES,
} from '../constants/theme';

export default function LanguageScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      Speech.speak('Welcome to NeoAgri. Tap your language.', {
        language: 'en-IN',
        rate: 0.9,
        pitch: 1.0,
      });
    }, 800);

    return () => {
      clearTimeout(timer);
      Speech.stop();
    };
  }, []);

  const selectLanguage = async (langCode: string) => {
    await AsyncStorage.setItem('selectedLanguage', langCode);
    Speech.stop();
    router.replace('/camera');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>🌱</Text>
          <Text style={styles.title}>NeoAgri</Text>
          <Text style={styles.subtitle}>Choose your language</Text>
          <Text style={styles.subtitleHi}>अपनी भाषा चुनें</Text>
        </View>

        <View style={styles.grid}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={styles.langCard}
              onPress={() => selectLanguage(lang.code)}
              activeOpacity={0.7}
            >
              <Text style={styles.langNative}>{lang.nativeName}</Text>
              <Text style={styles.langEnglish}>{lang.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>🔊 Tap any language to continue</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  logo: {
    fontSize: 56,
    marginBottom: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.hero,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  subtitleHi: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  langCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.primary,
    ...SHADOWS.small,
  },
  langNative: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  langEnglish: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  footerText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
});
