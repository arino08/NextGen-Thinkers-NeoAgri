import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, AppState } from 'react-native';
import { Stack, router } from 'expo-router';
import { registerGlobals } from 'react-native-webrtc';
import { AsyncStorage } from 'expo-sqlite/kv-store';
import * as Speech from 'expo-speech';
import { initDB } from '../db/offlineSync';
import { insertMarker, getAllMarkers } from '../db/markers';
import { syncPendingScans } from '../db/offlineSync';
import { hasFarmerProfile } from '../db/farmer';
import { voiceEventEmitter } from '../lib/voiceEventEmitter';

registerGlobals();

const SYNC_INTERVAL_MS = 30000; // 30 seconds

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

// Disease name to Hindi mapping for voice alerts
const DISEASE_HINDI = {
  'Bacterial Pustule': 'बैक्टीरियल पस्ट्यूल',
  'Frogeye Leaf Spot': 'फ्रॉगआई लीफ स्पॉट',
  'Rust': 'रस्ट',
  'Sudden Death Syndrome': 'सडन डेथ सिंड्रोम',
  'Target Leaf Spot': 'टारगेट लीफ स्पॉट',
  'Yellow Mosaic': 'यलो मोज़ेक',
};

export default function Layout() {
  const [dbReady, setDbReady] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const markerCountRef = useRef(0);
  const syncTimerRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        await initDB();

        const existing = await getAllMarkers();
        if (existing.length === 0) {
          for (const marker of DEMO_MARKERS) {
            await insertMarker(marker);
          }
          markerCountRef.current = DEMO_MARKERS.length;
        } else {
          markerCountRef.current = existing.length;
        }

        const token = await AsyncStorage.getItem('auth_token');
        const pinSetup = await hasFarmerProfile();

        if (!token || !pinSetup) {
          setNeedsAuth(true);
        }
      } catch (err) {
        console.error('DB init error:', err);
      }
      setDbReady(true);
    })();
  }, []);

  // Navigate to auth AFTER the Stack has mounted
  useEffect(() => {
    if (dbReady && needsAuth) {
      router.replace('/auth');
    }
  }, [dbReady, needsAuth]);

  // Background sync + voice alert for new drone results
  useEffect(() => {
    if (!dbReady) return;

    async function checkForNewMarkers() {
      try {
        await syncPendingScans();
        const markers = await getAllMarkers();
        const newCount = markers.length;
        const diff = newCount - markerCountRef.current;

        if (diff > 0) {
          // Find the newest markers (last `diff` entries)
          const newMarkers = markers.slice(-diff);
          const diseases = [...new Set(newMarkers.map(m => m.disease).filter(d => d && d !== 'Healthy'))];

          if (diseases.length > 0) {
            const hindiNames = diseases.map(d => DISEASE_HINDI[d] || d).join(', ');
            const msg = diseases.length === 1
              ? `ड्रोन रिजल्ट आया! आपके खेत में ${hindiNames} बीमारी मिली है। नेविगेट करने के लिए बोलें।`
              : `ड्रोन रिजल्ट आया! ${diseases.length} बीमारियाँ मिलीं: ${hindiNames}। विस्तार से जानने के लिए बोलें।`;

            Speech.speak(msg, { language: 'hi-IN', rate: 0.9 });
            voiceEventEmitter.emit('DRONE_ALERT', { newMarkers, diseases });
          }
        }
        markerCountRef.current = newCount;
      } catch (err) {
        // Silent fail — offline is expected
      }
    }

    syncTimerRef.current = setInterval(checkForNewMarkers, SYNC_INTERVAL_MS);

    // Also sync when app comes to foreground
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkForNewMarkers();
    });

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
      sub.remove();
    };
  }, [dbReady]);

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
