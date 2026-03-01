import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Easing,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH * 0.65;

export default function ProcessingScreen() {
  const router = useRouter();
  const { photoUri } = useLocalSearchParams<{ photoUri: string }>();

  const scanLineY = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const dotOpacity1 = useRef(new Animated.Value(0)).current;
  const dotOpacity2 = useRef(new Animated.Value(0)).current;
  const dotOpacity3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Scan line animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineY, {
          toValue: IMAGE_SIZE - 4,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineY, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse animation for the image border
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.03,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Loading dots animation
    const animateDots = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotOpacity1, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dotOpacity2, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dotOpacity3, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(400),
          Animated.parallel([
            Animated.timing(dotOpacity1, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(dotOpacity2, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(dotOpacity3, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    };
    animateDots();

    // Voice prompt
    const speechTimer = setTimeout(() => {
      Speech.speak('Analyzing your plant, please wait.', {
        language: 'en-IN',
        rate: 0.9,
      });
    }, 500);

    // Navigate to result after simulated processing
    const navTimer = setTimeout(() => {
      router.replace({
        pathname: '/result',
        params: { photoUri: photoUri },
      });
    }, 4000);

    return () => {
      clearTimeout(speechTimer);
      clearTimeout(navTimer);
      Speech.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Magnifying glass icon */}
        <Text style={styles.magnifyIcon}>🔬</Text>

        {/* Image with scan overlay */}
        <Animated.View
          style={[
            styles.imageContainer,
            { transform: [{ scale: pulseScale }] },
          ]}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Text style={styles.placeholderText}>🌿</Text>
            </View>
          )}

          {/* Scan line */}
          <Animated.View
            style={[
              styles.scanLine,
              { transform: [{ translateY: scanLineY }] },
            ]}
          />
        </Animated.View>

        {/* Status text */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>Analyzing Your Plant</Text>
          <View style={styles.dotsRow}>
            <Text style={styles.statusSubtext}>Please wait</Text>
            <Animated.Text style={[styles.dot, { opacity: dotOpacity1 }]}>
              .
            </Animated.Text>
            <Animated.Text style={[styles.dot, { opacity: dotOpacity2 }]}>
              .
            </Animated.Text>
            <Animated.Text style={[styles.dot, { opacity: dotOpacity3 }]}>
              .
            </Animated.Text>
          </View>
        </View>

        {/* Progress steps */}
        <View style={styles.steps}>
          <View style={styles.stepRow}>
            <Text style={styles.stepCheck}>✅</Text>
            <Text style={styles.stepText}>Image captured</Text>
          </View>
          <View style={styles.stepRow}>
            <Text style={styles.stepCheck}>✅</Text>
            <Text style={styles.stepText}>Leaf detected</Text>
          </View>
          <View style={styles.stepRow}>
            <Text style={styles.stepSpinner}>🔄</Text>
            <Text style={styles.stepTextActive}>Identifying disease...</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  magnifyIcon: {
    fontSize: 48,
    marginBottom: SPACING.lg,
  },
  imageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: COLORS.primary,
    ...SHADOWS.large,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.xl,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  placeholderText: {
    fontSize: 80,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.primaryLight,
    opacity: 0.8,
    ...SHADOWS.small,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  statusTitle: {
    ...TYPOGRAPHY.heading,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusSubtext: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  dot: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontWeight: '700',
    marginLeft: 2,
  },
  steps: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.small,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  stepCheck: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  stepSpinner: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  stepText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  stepTextActive: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
  },
});
