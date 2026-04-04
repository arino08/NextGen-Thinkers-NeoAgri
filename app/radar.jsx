import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { COLORS, FONTS } from '../lib/voiceStyles';
import { getOfflineMarkers } from '../db/offlineSync';

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getBearing(lat1, lon1, lat2, lon2) {
  const fi1 = lat1 * Math.PI / 180;
  const fi2 = lat2 * Math.PI / 180;
  const deltaL = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(deltaL) * Math.cos(fi2);
  const x = Math.cos(fi1) * Math.sin(fi2) - Math.sin(fi1) * Math.cos(fi2) * Math.cos(deltaL);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export default function RadarScreen() {
  const { markerId } = useLocalSearchParams();
  const router = useRouter();
  const [target, setTarget] = useState(null);
  const [distance, setDistance] = useState(null);
  const [bearing, setBearing] = useState(0);
  const [heading, setHeading] = useState(0);
  const [arrived, setArrived] = useState(false);
  
  const arrowRotation = useRef(new Animated.Value(0)).current;

  // Add dummy SVG icon for the arrow (since we can't use complex deps right now)
  const ArrowIcon = () => (
    <Text style={{ fontSize: 100, color: COLORS.orbTeal, textAlign: 'center' }}>↑</Text>
  );

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const markers = await getOfflineMarkers();
      const tgt = markers.find(m => String(m.capture_id) === String(markerId)) || markers[0];
      setTarget(tgt);

      const posSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 1 },
        (loc) => {
          if (!tgt) return;
          const dist = getDistance(loc.coords.latitude, loc.coords.longitude, tgt.latitude, tgt.longitude);
          const brg = getBearing(loc.coords.latitude, loc.coords.longitude, tgt.latitude, tgt.longitude);
          setDistance(dist);
          setBearing(brg);
        }
      );

      const headSub = await Location.watchHeadingAsync((head) => {
        setHeading(head.trueHeading !== -1 ? head.trueHeading : head.magHeading);
      });

      return () => {
        posSub.remove();
        headSub.remove();
      };
    })();
  }, [markerId]);

  useEffect(() => {
    // 7.2 Arrival logic
    if (distance !== null && distance < 0.05 && !arrived) {
      setArrived(true);
      Speech.speak("आप लक्ष्य पर पहुँच गए!", { language: 'hi-IN' });
    }
  }, [distance, arrived]);

  useEffect(() => {
    let finalRotation = bearing - heading;
    if (finalRotation < 0) finalRotation += 360;

    Animated.spring(arrowRotation, {
      toValue: finalRotation,
      friction: 5,
      useNativeDriver: true
    }).start();
  }, [bearing, heading]);

  const spin = arrowRotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Cancel</Text>
      </TouchableOpacity>

      {arrived ? (
        <View style={styles.arrivedBox}>
          <Text style={{fontSize: 80}}>✅</Text>
          <Text style={styles.arrivedText}>आप पहुँच गए!</Text>
        </View>
      ) : (
        <>
          <Animated.View style={[styles.arrowContainer, { transform: [{ rotate: spin }] }]}>
            <ArrowIcon />
          </Animated.View>
          
          {distance !== null ? (
            <Text style={styles.distanceText}>
              {distance.toFixed(2)} किलोमीटर दूर
            </Text>
          ) : (
            <Text style={styles.distanceText}>GPS खोज रहा है...</Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
  },
  backText: {
    color: COLORS.white,
    fontFamily: FONTS.hindiBody?.fontFamily || 'System',
    fontSize: 16,
  },
  arrowContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  distanceText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  arrivedBox: {
    alignItems: 'center',
  },
  arrivedText: {
    color: COLORS.severityNone,
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 20,
  }
});
