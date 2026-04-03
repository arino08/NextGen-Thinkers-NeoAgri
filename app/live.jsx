import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useCameraPermission, useCameraDevice, Camera, useFrameProcessor } from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { runOnJS } from 'react-native-worklets-core';
import { resize } from 'react-native-vision-camera-resize-plugin';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../lib/voiceStyles';

function handleDetection(labelIndex, confidence) {
  // implemented in 6.3
  console.log('Detection:', labelIndex, confidence);
}

export default function LiveCameraScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const model = useTensorflowModel(require('../models/neoagri_app_model.tflite'));

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (model.state !== 'loaded') return;
    const resized = resize(frame, { scale: { width: 224, height: 224 }, pixelFormat: 'rgb', dataType: 'float32' });
    const output = model.model.runSync([resized]);
    const scores = output[0];
    const maxIdx = scores.indexOf(Math.max(...scores));
    if (scores[maxIdx] > 0.75) {
      runOnJS(handleDetection)(maxIdx, scores[maxIdx]);
    }
  }, [model]);

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
        fps={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
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
