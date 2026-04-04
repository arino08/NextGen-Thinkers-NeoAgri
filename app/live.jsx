import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useCameraPermission, useCameraDevice, Camera, useFrameProcessor } from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { Worklets } from 'react-native-worklets-core';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../lib/voiceStyles';
import { useRouter } from 'expo-router';

// Agent 2 Integration
import { saveScan } from '../db/offlineSync';
import { voiceEventEmitter } from '../lib/voiceEventEmitter';
import DiseaseCard from '../components/voice/DiseaseCard';

export default function LiveCameraScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const router = useRouter();
  const [diseaseResult, setDiseaseResult] = useState(null);
  const { resize } = useResizePlugin();

  useEffect(() => {
    const handler = (data) => setDiseaseResult(data);
    voiceEventEmitter.on('DISEASE_RESULT', handler);
    return () => voiceEventEmitter.off('DISEASE_RESULT', handler);
  }, []);

  const model = useTensorflowModel(require('../models/soyabean_model_v2.tflite'));

  const handleDetection = useCallback((labelIndex, confidence) => {
    try {
      const labels = require('../models/disease_labels.json');
      const label = labels[String(labelIndex)];
      if (label && labelIndex !== 2) {
        const captureId = `scan-${Date.now()}-${labelIndex}`;
        saveScan({
          capture_id: captureId,
          disease: label.name,
          label_index: labelIndex,
          confidence,
          timestamp: new Date().toISOString()
        });

        voiceEventEmitter.emit('DISEASE_RESULT', {
            name: label.name,
            name_hi: label.name_hi,
            severity: label.severity,
            severity_hi: label.severity_hi,
            cure: label.cure,
            cure_hi: label.cure_hi,
            confidence
        });
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
    const maxIdx = scores.indexOf(Math.max(...scores));
    if (scores[maxIdx] > 0.5) {
      handleDetectionJS(maxIdx, scores[maxIdx]);
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

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
      />
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Cancel</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgBlack,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFF',
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
  textPlaceholder: {
    ...FONTS.hindiBody,
    textAlign: 'center',
    marginTop: 100,
  }
});
