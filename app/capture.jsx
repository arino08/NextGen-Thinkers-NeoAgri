import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, AppState } from 'react-native';
import { useCameraPermission, useCameraDevice, Camera, useFrameProcessor } from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { useRouter } from 'expo-router';

import { Worklets } from 'react-native-worklets-core';
import { COLORS, FONTS } from '../lib/voiceStyles';
import { saveScan } from '../db/offlineSync';
import { voiceEventEmitter } from '../lib/voiceEventEmitter';
import DiseaseCard from '../components/voice/DiseaseCard';
import diseaseLabels from '../models/disease_labels.json';
import { useIsFocused } from '@react-navigation/native';

export default function CaptureScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const router = useRouter();
  const cameraRef = useRef(null);
  const { resize } = useResizePlugin();
  const isFocused = useIsFocused();
  const [appActive, setAppActive] = useState(true);

  const [diseaseResult, setDiseaseResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [captured, setCaptured] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
    });
    return () => sub.remove();
  }, []);

  const model = useTensorflowModel(require('../models/soyabean_model_v2.tflite'));

  const handleDetection = useCallback((labelIndex, confidence) => {
    if (!captured || diseaseResult) return; // only process once per capture
    const label = diseaseLabels[String(labelIndex)];
    if (!label) return;

    const captureId = `capture-${Date.now()}-${labelIndex}`;
    saveScan({
      capture_id: captureId,
      disease: label.name,
      label_index: labelIndex,
      confidence,
      timestamp: new Date().toISOString()
    });

    const result = {
      name: label.name,
      name_hi: label.name_hi,
      severity: label.severity,
      severity_hi: label.severity_hi,
      cure: label.cure,
      cure_hi: label.cure_hi,
      confidence
    };

    setDiseaseResult(result);
    setAnalyzing(false);
    voiceEventEmitter.emit('DISEASE_RESULT', result);

    // Speak result in Hindi
    const msg = labelIndex === 2
      ? 'फसल स्वस्थ है, कोई बीमारी नहीं मिली।'
      : `${label.name_hi} बीमारी मिली। गंभीरता ${label.severity_hi}। ${label.cure_hi}`;
    Speech.speak(msg, { language: 'hi-IN' });
  }, [captured, diseaseResult]);

  const handleDetectionJS = Worklets.createRunOnJS(handleDetection);

  // Frame processor: runs on next frame after capture button pressed
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
    if (maxVal > 0.3) {
      handleDetectionJS(maxIdx, maxVal);
    }
  }, [model, resize, handleDetectionJS]);

  const handleRetake = () => {
    setDiseaseResult(null);
    setCaptured(false);
    setAnalyzing(false);
  };

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionText}>फोटो लेने के लिए कैमरे की अनुमति चाहिए</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>अनुमति दें</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionText}>कैमरा नहीं मिला</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused && appActive && !diseaseResult}
        photo={true}
        frameProcessor={captured && !diseaseResult ? frameProcessor : undefined}
      />

      {/* Viewfinder overlay */}
      {!diseaseResult && !analyzing && (
        <View style={styles.viewfinder}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
        </View>
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← वापस</Text>
      </TouchableOpacity>

      {/* Instructions */}
      {!captured && (
        <View style={styles.instructionBox}>
          <Text style={styles.instructionText}>पत्ते को फ्रेम में रखें और बटन दबाएं</Text>
        </View>
      )}

      {/* Capture button */}
      {!captured && (
        <View style={styles.captureArea}>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={() => { setCaptured(true); setAnalyzing(true); }}
            activeOpacity={0.7}
          >
            <View style={styles.captureInner} />
          </TouchableOpacity>
        </View>
      )}

      {/* Analyzing spinner */}
      {analyzing && (
        <View style={styles.analyzingOverlay}>
          <ActivityIndicator size="large" color={COLORS.orbTeal} />
          <Text style={styles.analyzingText}>विश्लेषण हो रहा है...</Text>
        </View>
      )}

      {/* Disease result */}
      {diseaseResult && (
        <>
          <DiseaseCard
            disease={diseaseResult}
            onDismiss={handleRetake}
          />
          <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
            <Text style={styles.retakeText}>दोबारा फोटो लें</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const CORNER_SIZE = 30;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
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
  viewfinder: {
    position: 'absolute',
    top: '25%',
    left: '15%',
    width: '70%',
    height: '35%',
  },
  cornerTL: {
    position: 'absolute', top: 0, left: 0,
    width: CORNER_SIZE, height: CORNER_SIZE,
    borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH,
    borderColor: COLORS.orbTeal,
  },
  cornerTR: {
    position: 'absolute', top: 0, right: 0,
    width: CORNER_SIZE, height: CORNER_SIZE,
    borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH,
    borderColor: COLORS.orbTeal,
  },
  cornerBL: {
    position: 'absolute', bottom: 0, left: 0,
    width: CORNER_SIZE, height: CORNER_SIZE,
    borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH,
    borderColor: COLORS.orbTeal,
  },
  cornerBR: {
    position: 'absolute', bottom: 0, right: 0,
    width: CORNER_SIZE, height: CORNER_SIZE,
    borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH,
    borderColor: COLORS.orbTeal,
  },
  instructionBox: {
    position: 'absolute',
    top: '18%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  instructionText: {
    ...FONTS.hindiBody,
    color: '#fff',
    fontSize: 16,
  },
  captureArea: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  analyzingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzingText: {
    ...FONTS.hindiBody,
    color: '#fff',
    marginTop: 16,
  },
  retakeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: COLORS.orbTeal,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retakeText: {
    ...FONTS.hindiBody,
    fontWeight: '600',
    color: '#000',
    fontSize: 14,
  },
});
