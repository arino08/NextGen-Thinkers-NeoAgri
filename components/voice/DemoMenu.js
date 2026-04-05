import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONTS } from '../../lib/voiceStyles';

const DEMO_FEATURES = [
  {
    id: 'capture',
    title: 'फोटो कैप्चर',
    subtitle: 'बीमारी पहचानने के लिए फोटो लें',
    route: '/capture',
  },
  {
    id: 'live_camera',
    title: 'लाइव कैमरा',
    subtitle: 'रियल-टाइम बीमारी स्कैनिंग',
    route: '/live',
  },
  {
    id: 'radar',
    title: 'AR नेविगेशन',
    subtitle: 'बीमारी मार्कर तक पहुँचें',
    route: '/radar',
    params: { markerId: 'demo-marker-001' },
  },
  {
    id: 'drone_booking',
    title: 'ड्रोन बुक करें',
    subtitle: 'फसल स्कैनिंग के लिए ड्रोन बुक करें',
    action: 'book_drone_scan',
  },
  {
    id: 'booking_history',
    title: 'बुकिंग इतिहास',
    subtitle: 'पिछली ड्रोन बुकिंग देखें',
    action: 'get_booking_history',
  },
  {
    id: 'scan_markers',
    title: 'नज़दीकी मार्कर',
    subtitle: 'ड्रोन द्वारा पहचाने गए रोग',
    action: 'scan_nearby_markers',
  },
  {
    id: 'stats',
    title: 'प्रभाव रिपोर्ट',
    subtitle: 'बचत और बीमारी आँकड़े',
    route: '/stats',
  },
  {
    id: 'report',
    title: 'ऐप स्थिति',
    subtitle: 'कैश्ड मार्कर और सिंक स्थिति',
    action: 'report_status',
  },
];

export default function DemoMenu({ visible, onClose, onRunTool }) {
  const router = useRouter();

  const handleFeature = (feature) => {
    onClose();
    if (feature.route) {
      setTimeout(() => {
        router.push({ pathname: feature.route, params: feature.params || {} });
      }, 300);
    } else if (feature.action && onRunTool) {
      onRunTool(feature.action);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>सुविधाएँ</Text>
          <Text style={styles.subtitle}>सीधे एक्सेस करें</Text>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {DEMO_FEATURES.map((feature) => (
              <TouchableOpacity
                key={feature.id}
                style={styles.featureCard}
                activeOpacity={0.7}
                onPress={() => handleFeature(feature)}
              >
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>बंद करें</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0D110F',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  handle: {
    width: 32,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    ...FONTS.hindiSmall,
    color: '#555',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 20,
    fontSize: 12,
  },
  list: {
    flexGrow: 0,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  featureSubtitle: {
    fontSize: 11,
    color: '#666',
    marginTop: 1,
  },
  arrow: {
    fontSize: 20,
    color: '#444',
    fontWeight: '300',
  },
  closeButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  closeText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '500',
  },
});
