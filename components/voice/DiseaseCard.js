import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, PanResponder, TouchableWithoutFeedback } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONTS } from '../../lib/voiceStyles';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const severityColor = {
  'अधिक': COLORS.severityHigh,
  'मध्यम': COLORS.severityMedium,
  'कोई नहीं': COLORS.severityNone,
};

export default function DiseaseCard({ disease, onDismiss }) {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (disease) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 8,
      }).start();
    }
  }, [disease, slideAnim]);

  const dismissCard = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 1.5) {
          dismissCard();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!disease) return null;

  return (
    <>
      <TouchableWithoutFeedback onPress={dismissCard}>
        <View style={StyleSheet.absoluteFillObject} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[styles.card, { transform: [{ translateY: slideAnim }] }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.handle} />

        <Text style={styles.title}>{disease.name_hi}</Text>

        <View style={[styles.badge, { backgroundColor: severityColor[disease.severity_hi] || COLORS.severityMedium }]}>
          <Text style={styles.badgeText}>{disease.severity_hi}</Text>
        </View>

        <Text style={styles.cureText}>{disease.cure_hi}</Text>

        <Text style={styles.confidenceText}>Confidence: {Math.round(disease.confidence * 100)}%</Text>

        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.8}
          onPress={() => {
            dismissCard();
            router.push('/radar');
          }}
        >
          <Text style={styles.buttonText}>नेविगेट करें →</Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBg,
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    zIndex: 100,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    ...FONTS.hindiHero,
    marginBottom: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  badgeText: {
    ...FONTS.label,
    color: '#fff',
  },
  cureText: {
    ...FONTS.hindiBody,
    marginBottom: 16,
  },
  confidenceText: {
    ...FONTS.hindiSmall,
    marginBottom: 24,
  },
  button: {
    backgroundColor: COLORS.orbTeal,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    ...FONTS.hindiBody,
    fontWeight: '600',
    color: '#000',
  }
});
