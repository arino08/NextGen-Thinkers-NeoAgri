import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { registerGlobals } from 'react-native-webrtc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initDB } from '../db/offlineSync';
import { insertMarker, getAllMarkers } from '../db/markers';
import { hasFarmerProfile } from '../db/farmer';

registerGlobals();

const DEMO_MARKERS = [
  {
    capture_id: 'demo-marker-001',
    latitude: 23.2156,
    longitude: 77.4565,
    disease: 'Rust',
    confidence: 0.92,
    timestamp: new Date().toISOString(),
    synced: 1,
  },
  {
    capture_id: 'demo-marker-002',
    latitude: 23.2170,
    longitude: 77.4580,
    disease: 'Frogeye Leaf Spot',
    confidence: 0.85,
    timestamp: new Date().toISOString(),
    synced: 1,
  },
  {
    capture_id: 'demo-marker-003',
    latitude: 23.2140,
    longitude: 77.4550,
    disease: 'Yellow Mosaic',
    confidence: 0.78,
    timestamp: new Date().toISOString(),
    synced: 1,
  },
];

export default function Layout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await initDB();

        // Seed demo markers if DB is empty
        const existing = await getAllMarkers();
        if (existing.length === 0) {
          for (const marker of DEMO_MARKERS) {
            await insertMarker(marker);
          }
        }

        // Auth check: need both a stored token AND a PIN set up
        const token = await AsyncStorage.getItem('auth_token');
        const pinSetup = await hasFarmerProfile();

        if (!token || !pinSetup) {
          // Will redirect after dbReady renders the Stack
          setDbReady(true);
          router.replace('/auth');
          return;
        }
      } catch (err) {
        console.error('DB init error:', err);
      }
      setDbReady(true);
    })();
  }, []);

  if (!dbReady) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashText}>NeoAgri लोड हो रहा है...</Text>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#080C0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashText: {
    color: '#00C896',
    fontSize: 20,
    fontWeight: '600',
  },
});
