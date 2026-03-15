import React, { useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { LanguageContext } from '../context/LanguageContext';

export default function SplashScreen({ navigation }) {
  const { t } = useContext(LanguageContext);

  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const timer = setTimeout(() => {
      navigation.replace('Language');
    }, 2600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={['#B3E5FC', '#E8F5E9']}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }, { translateY: floatAnim }],
          },
        ]}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="leaf-outline" size={56} color={colors.primaryGreen} />
        </View>

        <Text style={styles.title}>{t('appTitle')}</Text>
        <Text style={styles.subtitle}>Smart Farming Assistant</Text>
      </Animated.View>

      <View style={styles.bottomDecoration}>
        <Ionicons name="sunny-outline" size={28} color="#FBC02D" />
        <Ionicons name="water-outline" size={26} color="#42A5F5" />
        <Ionicons name="flower-outline" size={26} color={colors.primaryGreen} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoContainer: {
    alignItems: 'center',
  },

  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },

  title: {
    fontFamily: typography.primary,
    fontSize: 40,
    fontWeight: '700',
    color: '#2E7D32',
    letterSpacing: 1.2,
  },

  subtitle: {
    fontFamily: typography.secondary,
    fontSize: 18,
    marginTop: 8,
    color: '#4E5D52',
  },

  bottomDecoration: {
    position: 'absolute',
    bottom: 80,
    flexDirection: 'row',
    gap: 20,
    opacity: 0.6,
  },
});