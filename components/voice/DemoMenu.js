import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONTS } from '../../lib/voiceStyles';

const DEMO_FEATURES = [
  {
    id: 'capture',
    icon: '📸',
    title: 'Capture Photo',
    subtitle: 'Take a photo to detect disease',
    route: '/capture',
  },
  {
    id: 'live_camera',
    icon: '📷',
    title: 'Live AI Camera',
    subtitle: 'Real-time continuous detection',
    route: '/live',
  },
  {
    id: 'radar',
    icon: '🧭',
    title: 'AR Navigation',
    subtitle: 'Navigate to disease markers',
    route: '/radar',
    params: { markerId: 'demo-marker-001' },
  },
  {
    id: 'drone_booking',
    icon: '🛸',
    title: 'Book Drone Scan',
    subtitle: 'Request aerial crop scanning',
    action: 'book_drone_scan',
  },
  {
    id: 'booking_history',
    icon: '📋',
    title: 'Booking History',
    subtitle: 'Previous drone service bookings',
    action: 'get_booking_history',
  },
  {
    id: 'scan_markers',
    icon: '📍',
    title: 'Scan Nearby Markers',
    subtitle: 'View drone-detected disease data',
    action: 'scan_nearby_markers',
  },
  {
    id: 'report',
    icon: '📊',
    title: 'App Status',
    subtitle: 'Cached markers & pending syncs',
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
          <Text style={styles.title}>🧪 Demo Mode</Text>
          <Text style={styles.subtitle}>Tap to test features manually</Text>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {DEMO_FEATURES.map((feature) => (
              <TouchableOpacity
                key={feature.id}
                style={styles.featureCard}
                activeOpacity={0.7}
                onPress={() => handleFeature(feature)}
              >
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#111714',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    ...FONTS.hindiSmall,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  list: {
    flexGrow: 0,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2420',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a3a30',
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 14,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  featureSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  arrow: {
    fontSize: 24,
    color: COLORS.orbTeal,
    fontWeight: '300',
  },
  closeButton: {
    backgroundColor: '#1a2420',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2a3a30',
  },
  closeText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '500',
  },
});
