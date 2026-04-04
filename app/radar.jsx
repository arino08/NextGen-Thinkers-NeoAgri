import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, AppState, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCameraPermission, useCameraDevice, Camera } from 'react-native-vision-camera';
import { useIsFocused } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../lib/voiceStyles';
import { getOfflineMarkers } from '../db/offlineSync';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getBearing(lat1, lon1, lat2, lon2) {
  const fi1 = lat1 * Math.PI / 180;
  const fi2 = lat2 * Math.PI / 180;
  const deltaL = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(deltaL) * Math.cos(fi2);
  const x = Math.cos(fi1) * Math.sin(fi2) - Math.sin(fi1) * Math.cos(fi2) * Math.cos(deltaL);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// Normalize angle difference to [-180, 180]
function angleDiff(a, b) {
  let d = a - b;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

export default function RadarScreen() {
  const { markerId } = useLocalSearchParams();
  const router = useRouter();
  const isFocused = useIsFocused();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const [target, setTarget] = useState(null);
  const [distance, setDistance] = useState(null);
  const [bearing, setBearing] = useState(0);
  const [heading, setHeading] = useState(0);
  const [arrived, setArrived] = useState(false);
  const [appActive, setAppActive] = useState(true);

  // Animated values
  const arrowY = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const arrivedScale = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.4)).current;

  // Refs for cleanup
  const posSubRef = useRef(null);
  const headSubRef = useRef(null);

  // App state tracking
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
    });
    return () => sub.remove();
  }, []);

  // Request camera permission on mount
  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, []);

  // Floating arrow bob animation
  useEffect(() => {
    const bob = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowY, { toValue: -12, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(arrowY, { toValue: 12, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    bob.start();
    return () => bob.stop();
  }, []);

  // Pulse animation for waypoint ring
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.3, duration: 1000, easing: Easing.out(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1, duration: 1000, easing: Easing.in(Easing.sin), useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Glow animation
  useEffect(() => {
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.8, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
      ])
    );
    glow.start();
    return () => glow.stop();
  }, []);

  // Location + heading tracking
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !mounted) return;

      const markers = await getOfflineMarkers();
      const tgt = markers.find(m => String(m.capture_id) === String(markerId)) || markers[0];
      if (!mounted) return;
      setTarget(tgt);

      if (!tgt) return;

      posSubRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 500, distanceInterval: 1 },
        (loc) => {
          if (!mounted) return;
          const dist = getDistance(loc.coords.latitude, loc.coords.longitude, tgt.latitude, tgt.longitude);
          const brg = getBearing(loc.coords.latitude, loc.coords.longitude, tgt.latitude, tgt.longitude);
          setDistance(dist);
          setBearing(brg);
        }
      );

      headSubRef.current = await Location.watchHeadingAsync((head) => {
        if (!mounted) return;
        setHeading(head.trueHeading !== -1 ? head.trueHeading : head.magHeading);
      });
    })();

    return () => {
      mounted = false;
      if (posSubRef.current) { posSubRef.current.remove(); posSubRef.current = null; }
      if (headSubRef.current) { headSubRef.current.remove(); headSubRef.current = null; }
    };
  }, [markerId]);

  // Arrival detection
  useEffect(() => {
    if (distance !== null && distance < 0.02 && !arrived) {
      setArrived(true);
      Speech.speak("आप लक्ष्य पर पहुँच गए!", { language: 'hi-IN' });
      Animated.spring(arrivedScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
    }
  }, [distance, arrived]);

  // Calculate relative angle from phone heading to target bearing
  const relativeAngle = angleDiff(bearing, heading);
  // Map angle to horizontal position (±90° = edge of screen)
  const arrowX = Math.max(-1, Math.min(1, relativeAngle / 60)) * (SCREEN_W / 2 - 60);
  // Arrow opacity — dimmer when target is behind
  const isInFront = Math.abs(relativeAngle) < 90;
  // Arrow vertical position — lower when target is behind
  const verticalShift = isInFront ? 0 : 60;
  // Arrow rotation based on relative angle
  const arrowRotation = `${Math.max(-45, Math.min(45, relativeAngle * 0.5))}deg`;

  // Distance formatting
  const distText = distance !== null
    ? distance > 1
      ? `${distance.toFixed(1)} km`
      : `${Math.round(distance * 1000)} m`
    : '...';

  const distColor = distance !== null
    ? distance < 0.05 ? '#00FF88' : distance < 0.2 ? '#FFD700' : '#FF6B6B'
    : '#888';

  const cameraActive = isFocused && appActive && !arrived;

  return (
    <View style={styles.container}>
      {/* Camera background */}
      {device && hasPermission && (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={cameraActive}
        />
      )}

      {/* Dark vignette overlay */}
      <View style={styles.vignette} pointerEvents="none" />

      {/* Top HUD bar */}
      <View style={styles.hudTop}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← वापस</Text>
        </TouchableOpacity>

        <View style={styles.hudInfo}>
          <Text style={styles.hudLabel}>TARGET</Text>
          <Text style={styles.hudDisease}>{target?.disease || 'Loading...'}</Text>
        </View>

        <View style={styles.compassBox}>
          <Text style={styles.compassText}>{Math.round(heading)}°</Text>
        </View>
      </View>

      {/* Main AR content */}
      {arrived ? (
        /* Arrival celebration */
        <Animated.View style={[styles.arrivedContainer, { transform: [{ scale: arrivedScale }] }]}>
          <View style={styles.arrivedCircle}>
            <Text style={styles.arrivedEmoji}>✅</Text>
          </View>
          <Text style={styles.arrivedText}>लक्ष्य पर पहुँच गए!</Text>
          <Text style={styles.arrivedSub}>{target?.disease}</Text>
          <TouchableOpacity style={styles.arrivedBtn} onPress={() => router.back()}>
            <Text style={styles.arrivedBtnText}>वापस जाएं</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <>
          {/* 3D Arrow Waypoint */}
          <Animated.View
            style={[
              styles.arrowAnchor,
              {
                transform: [
                  { translateX: arrowX },
                  { translateY: Animated.add(arrowY, verticalShift) },
                ],
              },
            ]}
          >
            {/* Glow ring behind arrow */}
            <Animated.View style={[styles.glowRing, { opacity: glowOpacity, transform: [{ scale: pulseScale }] }]} />

            {/* 3D Arrow chevron */}
            <View style={[styles.arrowBody, { transform: [{ rotate: arrowRotation }] }]}>
              {/* Arrow head — chevron triangle */}
              <LinearGradient
                colors={isInFront ? ['#00FFB2', '#00C896', '#009966'] : ['#FF6B6B', '#CC4444', '#993333']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.arrowHead}
              >
                {/* Specular highlight */}
                <View style={styles.arrowSpecular} />
              </LinearGradient>

              {/* Arrow stem */}
              <LinearGradient
                colors={isInFront ? ['#00C89688', '#00C89622'] : ['#FF6B6B88', '#FF6B6B22']}
                style={styles.arrowStem}
              />

              {/* Side wings for 3D effect */}
              <View style={styles.wingLeft}>
                <LinearGradient
                  colors={isInFront ? ['#00E8A066', '#00C89600'] : ['#FF6B6B66', '#FF6B6B00']}
                  start={{ x: 1, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.wingGrad}
                />
              </View>
              <View style={styles.wingRight}>
                <LinearGradient
                  colors={isInFront ? ['#00E8A066', '#00C89600'] : ['#FF6B6B66', '#FF6B6B00']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.wingGrad}
                />
              </View>
            </View>

            {/* Distance label under arrow */}
            <View style={[styles.distBadge, { borderColor: distColor + '66' }]}>
              <Text style={[styles.distText, { color: distColor }]}>{distText}</Text>
            </View>
          </Animated.View>

          {/* Direction hint when target is behind */}
          {!isInFront && (
            <View style={styles.behindHint}>
              <Text style={styles.behindText}>
                {relativeAngle > 0 ? '↻ दाएं मुड़ें' : '↺ बाएं मुड़ें'}
              </Text>
            </View>
          )}

          {/* Bottom HUD */}
          <View style={styles.hudBottom}>
            {/* Distance bar */}
            <View style={styles.distBarOuter}>
              <View style={styles.distBarTrack}>
                <View
                  style={[
                    styles.distBarFill,
                    {
                      width: `${Math.max(5, Math.min(100, (1 - Math.min(distance || 1, 1)) * 100))}%`,
                      backgroundColor: distColor,
                    },
                  ]}
                />
              </View>
              <Text style={styles.distBarLabel}>
                {distance !== null
                  ? distance > 1
                    ? `${distance.toFixed(2)} किलोमीटर`
                    : `${Math.round(distance * 1000)} मीटर`
                  : 'GPS खोज रहा है...'}
              </Text>
            </View>

            {/* Compass strip */}
            <View style={styles.compassStrip}>
              <View style={styles.compassNotch} />
              {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map((dir, i) => {
                const dirAngle = i * 45;
                const diff = angleDiff(dirAngle, heading);
                if (Math.abs(diff) > 60) return null;
                const x = (diff / 60) * (SCREEN_W / 2 - 20);
                return (
                  <Text
                    key={dir}
                    style={[
                      styles.compassDir,
                      {
                        left: SCREEN_W / 2 + x - 12,
                        opacity: 1 - Math.abs(diff) / 80,
                        color: dir === 'N' ? '#FF4444' : '#aaa',
                      },
                    ]}
                  >
                    {dir}
                  </Text>
                );
              })}
              {/* Target bearing indicator on compass */}
              {Math.abs(relativeAngle) <= 60 && (
                <View
                  style={[
                    styles.bearingDot,
                    { left: SCREEN_W / 2 + (relativeAngle / 60) * (SCREEN_W / 2 - 20) - 5 },
                  ]}
                />
              )}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const ARROW_W = 70;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 30,
    borderColor: 'rgba(0,0,0,0.4)',
    borderRadius: 0,
    zIndex: 1,
  },

  // ─── Top HUD ───
  hudTop: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  backBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  hudInfo: {
    alignItems: 'center',
  },
  hudLabel: {
    color: '#666',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 3,
  },
  hudDisease: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  compassBox: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  compassText: {
    color: COLORS.orbTeal,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // ─── 3D Arrow ───
  arrowAnchor: {
    position: 'absolute',
    top: SCREEN_H * 0.35,
    left: SCREEN_W / 2 - ARROW_W / 2,
    width: ARROW_W,
    alignItems: 'center',
    zIndex: 5,
  },
  glowRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#00C896',
    top: -25,
    left: (ARROW_W - 120) / 2,
  },
  arrowBody: {
    alignItems: 'center',
    width: ARROW_W,
  },
  arrowHead: {
    width: 56,
    height: 56,
    borderRadius: 6,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  arrowSpecular: {
    width: 24,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.35)',
    transform: [{ rotate: '-45deg' }],
    marginBottom: 6,
  },
  arrowStem: {
    width: 8,
    height: 50,
    borderRadius: 4,
    marginTop: -8,
  },
  wingLeft: {
    position: 'absolute',
    top: 20,
    left: -5,
    width: 28,
    height: 45,
    transform: [{ skewY: '-20deg' }],
    overflow: 'hidden',
    borderRadius: 4,
  },
  wingRight: {
    position: 'absolute',
    top: 20,
    right: -5,
    width: 28,
    height: 45,
    transform: [{ skewY: '20deg' }],
    overflow: 'hidden',
    borderRadius: 4,
  },
  wingGrad: {
    flex: 1,
  },

  // ─── Distance badge ───
  distBadge: {
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  distText: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  // ─── Behind hint ───
  behindHint: {
    position: 'absolute',
    top: SCREEN_H * 0.5,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,80,80,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,80,80,0.3)',
    zIndex: 5,
  },
  behindText: {
    color: '#FF6B6B',
    fontSize: 18,
    fontWeight: '700',
  },

  // ─── Bottom HUD ───
  hudBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingHorizontal: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingTop: 14,
  },
  distBarOuter: {
    marginBottom: 12,
  },
  distBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  distBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  distBarLabel: {
    color: '#aaa',
    fontSize: 13,
    textAlign: 'center',
  },

  // ─── Compass strip ───
  compassStrip: {
    height: 30,
    position: 'relative',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    marginTop: 4,
  },
  compassNotch: {
    position: 'absolute',
    top: 0,
    left: SCREEN_W / 2 - 20 - 1,
    width: 2,
    height: 10,
    backgroundColor: '#fff',
  },
  compassDir: {
    position: 'absolute',
    top: 12,
    fontSize: 11,
    fontWeight: '700',
    width: 24,
    textAlign: 'center',
  },
  bearingDot: {
    position: 'absolute',
    top: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.orbTeal,
    shadowColor: COLORS.orbTeal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },

  // ─── Arrived ───
  arrivedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  arrivedCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0,200,150,0.2)',
    borderWidth: 3,
    borderColor: COLORS.orbTeal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  arrivedEmoji: {
    fontSize: 50,
  },
  arrivedText: {
    color: COLORS.orbTeal,
    fontSize: 28,
    fontWeight: '800',
  },
  arrivedSub: {
    color: '#aaa',
    fontSize: 16,
    marginTop: 8,
  },
  arrivedBtn: {
    marginTop: 30,
    backgroundColor: COLORS.orbTeal,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  arrivedBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
