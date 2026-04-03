import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONTS } from '../../lib/voiceStyles';

export default function DiseaseCard({ disease }) {
  if (!disease) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{disease.name_hi}</Text>
      
      <View style={[styles.badge, { backgroundColor: COLORS.severityHigh }]}>
        <Text style={styles.badgeText}>{disease.severity_hi}</Text>
      </View>
      
      <Text style={styles.cureText}>{disease.cure_hi}</Text>
      
      <Text style={styles.confidenceText}>Confidence: {Math.round(disease.confidence * 100)}%</Text>
      
      <TouchableOpacity style={styles.button} activeOpacity={0.8}>
        <Text style={styles.buttonText}>नेविगेट करें →</Text>
      </TouchableOpacity>
    </View>
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
