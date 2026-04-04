import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, AppState } from 'react-native';
import { useCameraPermission, useCameraDevice, Camera, useFrameProcessor } from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { Worklets } from 'react-native-worklets-core';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { COLORS, FONTS } from '../lib/voiceStyles';
import { useRouter } from 'expo-router';

import { saveScan } from '../db/offlineSync';
import { voiceEventEmitter } from '../lib/voiceEventEmitter';
import DiseaseCard from '../components/voice/DiseaseCard';
import diseaseLabels from '../models/disease_labels.json';

const SEVERITY_COLORS = {
  high: '#FF4D4D',
  medium: '#FFA500',
  none: '#00C896',
};
import { useIsFocused } from '@react-navigation/native';

export default function LiveCameraScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const router = useRouter();
  const isFocused = useIsFocused();
  const [appActive, setAppActive] = useState(true);
  const [diseaseResult, setDiseaseResult] = useState(null);
  const [liveDetection, setLiveDetection] = useState(null);
  const { resize } = useResizePlugin();
  const lastDetectionTime = useRef(0);
  const lastSpeechTime = useRef(0);
  const lastSpokenDisease = useRef('');
  const lastSaveTime = useRef(0);

  // Track app state to deactivate camera in background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
    });
    return () => sub.remove();
  }, []);

  // Animated values for the bounding box overlay
  const boxOpacity = useRef(new Animated.Value(0)).current;
  const boxScale = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const handler = (data) => setDiseaseResult(data);
    voiceEventEmitter.on('DISEASE_RESULT', handler);
    return () => voiceEventEmitter.off('DISEASE_RESULT', handler);
  }, []);

  // Pulse animation for the detection box
  useEffect(() => {
    if (liveDetection) {
      // Fade in + scale
      Animated.parallel([
        Animated.timing(boxOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(boxScale, { toValue: 1, friction: 8, useNativeDriver: true }),
      ]).start();

      // Continuous pulse
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();

      // Clear detection after 3 seconds of no new detection
      const timeout = setTimeout(() => {
        Animated.timing(boxOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
          setLiveDetection(null);
        });
        pulse.stop();
      }, 3000);

      return () => {
        clearTimeout(timeout);
        pulse.stop();
      };
    } else {
      boxOpacity.setValue(0);
      boxScale.setValue(0.95);
    }
  }, [liveDetection]);

  const model = useTensorflowModel(require('../models/soyabean_model_v2.tflite'));

  const handleDetection = useCallback((labelIndex, confidence) => {
    try {
      const now = Date.now();
      // Throttle overlay: at most once per 1.5 seconds
      if (now - lastDetectionTime.current < 1500) return;
      lastDetectionTime.current = now;

      const label = diseaseLabels[String(labelIndex)];
      if (!label) return;

      // Always update the live overlay (including for healthy)
      setLiveDetection({
        name: label.name,
        name_hi: label.name_hi,
        severity: label.severity,
        severity_hi: label.severity_hi,
        confidence,
        isHealthy: labelIndex === 2,
      });

      if (labelIndex !== 2) {
        // Save at most once per 10 seconds to avoid DB spam
        if (now - lastSaveTime.current > 10000) {
          lastSaveTime.current = now;
          const captureId = `scan-${Date.now()}-${labelIndex}`;
          saveScan({
            capture_id: captureId,
            disease: label.name,
            label_index: labelIndex,
            confidence,
            timestamp: new Date().toISOString()
          });
        }

        voiceEventEmitter.emit('DISEASE_RESULT', {
          name: label.name,
          name_hi: label.name_hi,
          severity: label.severity,
          severity_hi: label.severity_hi,
          cure: label.cure,
          cure_hi: label.cure_hi,
          confidence
        });

        // Speak only on high confidence, 5s cooldown, and different disease than last spoken
        const isDifferentDisease = label.name !== lastSpokenDisease.current;
        const cooldownElapsed = now - lastSpeechTime.current > 5000;
        if (confidence > 0.75 && cooldownElapsed && isDifferentDisease) {
          lastSpeechTime.current = now;
          lastSpokenDisease.current = label.name;
          Speech.speak(`${label.name_hi} बीमारी मिली`, { language: 'hi-IN' });
        }
      }
    } catch (err) {
      console.error('Detection error:', err);
    }
  }, []);

  const handleDetectionJS = Worklets.createRunOnJS(handleDetection);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (model.state !== 'loaded') return;
    const resized = resize(frame, { scale: { width: 224, height: 224 }, pixelFormat: 'rgb', dataType: 'float32' });
    const output = model.model.runSync([resized]);
    const scores = output[0];
    let maxIdx = 0;
    let maxVal = scores[0];
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] > maxVal) { maxVal = scores[i]; maxIdx = i; }
    }
    if (maxVal > 0.45) {
      handleDetectionJS(maxIdx, maxVal);
    }
  }, [model, resize, handleDetectionJS]);

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionText}>फसल को स्कैन करने के लिए कैमरे की अनुमति चाहिए</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>अनुमति दें</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (device == null) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionText}>कैमरा नहीं मिला</Text>
      </SafeAreaView>
    );
  }

  const detectionColor = liveDetection
    ? liveDetection.isHealthy
      ? SEVERITY_COLORS.none
      : SEVERITY_COLORS[liveDetection.severity === 'High' ? 'high' : 'medium']
    : COLORS.orbTeal;

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused && appActive}
        frameProcessor={frameProcessor}
      />

      {/* Scanning indicator — top bar */}
      <View style={styles.topBar}>
        <View style={styles.scanIndicator}>
          <View style={[styles.scanDot, { backgroundColor: liveDetection ? detectionColor : COLORS.orbTeal }]} />
          <Text style={styles.scanText}>
            {liveDetection ? (liveDetection.isHealthy ? 'स्वस्थ फसल' : 'बीमारी मिली!') : 'स्कैन हो रहा है...'}
          </Text>
        </View>
      </View>

      {/* Disease detection bounding box overlay */}
      {liveDetection && !liveDetection.isHealthy && (
        <Animated.View
          style={[
            styles.boundingBox,
            {
              borderColor: detectionColor,
              opacity: boxOpacity,
              transform: [{ scale: boxScale }],
            },
          ]}
        >
          {/* Corner accents */}
          <View style={[styles.cornerTL, { borderColor: detectionColor }]} />
          <View style={[styles.cornerTR, { borderColor: detectionColor }]} />
          <View style={[styles.cornerBL, { borderColor: detectionColor }]} />
          <View style={[styles.cornerBR, { borderColor: detectionColor }]} />

          {/* Pulsing background */}
          <Animated.View style={[styles.boxGlow, { backgroundColor: detectionColor, opacity: pulseOpacity }]} />

          {/* Label */}
          <View style={[styles.detectionLabel, { backgroundColor: detectionColor }]}>
            <Text style={styles.detectionLabelText}>
              {liveDetection.name_hi} — {Math.round(liveDetection.confidence * 100)}%
            </Text>
          </View>

          {/* Severity badge */}
          <View style={[styles.severityBadge, { backgroundColor: detectionColor + '33' }]}>
            <Text style={[styles.severityText, { color: detectionColor }]}>
              {liveDetection.severity_hi}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Healthy overlay */}
      {liveDetection && liveDetection.isHealthy && (
        <Animated.View style={[styles.healthyOverlay, { opacity: boxOpacity }]}>
          <View style={[styles.healthyBadge]}>
            <Text style={styles.healthyText}>स्वस्थ ✓</Text>
            <Text style={styles.healthyConfidence}>{Math.round(liveDetection.confidence * 100)}%</Text>
          </View>
        </Animated.View>
      )}

      {/* Scanning crosshair */}
      {!liveDetection && (
        <View style={styles.crosshair}>
          <View style={[styles.crosshairLine, styles.crosshairH]} />
          <View style={[styles.crosshairLine, styles.crosshairV]} />
        </View>
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← वापस</Text>
      </TouchableOpacity>

      {diseaseResult && (
        <DiseaseCard
          disease={diseaseResult}
          onDismiss={() => setDiseaseResult(null)}
        />
      )}
    </View>
  );
}

const CORNER_SIZE = 28;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgBlack,
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  scanIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  scanDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scanText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  boundingBox: {
    position: 'absolute',
    top: '22%',
    left: '10%',
    width: '80%',
    height: '40%',
    borderWidth: 2,
    borderRadius: 12,
    overflow: 'visible',
  },
  boxGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
  },
  cornerTL: {
    position: 'absolute', top: -2, left: -2,
    width: CORNER_SIZE, height: CORNER_SIZE,
    borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    position: 'absolute', top: -2, right: -2,
    width: CORNER_SIZE, height: CORNER_SIZE,
    borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    position: 'absolute', bottom: -2, left: -2,
    width: CORNER_SIZE, height: CORNER_SIZE,
    borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    position: 'absolute', bottom: -2, right: -2,
    width: CORNER_SIZE, height: CORNER_SIZE,
    borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: 12,
  },
  detectionLabel: {
    position: 'absolute',
    top: -14,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  detectionLabelText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  severityBadge: {
    position: 'absolute',
    bottom: -14,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 10,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  healthyOverlay: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
  },
  healthyBadge: {
    backgroundColor: 'rgba(0, 200, 150, 0.2)',
    borderWidth: 2,
    borderColor: SEVERITY_COLORS.none,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  healthyText: {
    color: SEVERITY_COLORS.none,
    fontSize: 22,
    fontWeight: '700',
  },
  healthyConfidence: {
    color: SEVERITY_COLORS.none,
    fontSize: 14,
    opacity: 0.8,
    marginTop: 2,
  },
  crosshair: {
    position: 'absolute',
    top: '42%',
    alignSelf: 'center',
    width: 40,
    height: 40,
  },
  crosshairLine: {
    position: 'absolute',
    backgroundColor: 'rgba(0,200,150,0.5)',
  },
  crosshairH: {
    top: 19,
    left: 0,
    right: 0,
    height: 2,
  },
  crosshairV: {
    left: 19,
    top: 0,
    bottom: 0,
    width: 2,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 20,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '500',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  permissionText: {
    ...FONTS.hindiBody,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: COLORS.orbTeal,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  permissionButtonText: {
    ...FONTS.hindiBody,
    fontWeight: '600',
    color: '#000',
  },
});
