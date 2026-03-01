import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOX_SIZE = SCREEN_WIDTH * 0.7;

export default function CameraScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      if (photo) {
        router.push({
          pathname: '/processing',
          params: { photoUri: photo.uri },
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  const handleVoice = () => {
    Alert.alert(
      '🎙️ Coming Soon',
      'Voice input will be available in the next update. For now, please use the camera to scan your plant leaf.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionEmoji}>📷</Text>
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionText}>
          NeoAgri needs your camera to scan plant leaves and detect diseases.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      >
        {/* Top instruction bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarBg}>
            <Text style={styles.instructionText}>
              🌿 Place the leaf inside the box
            </Text>
          </View>
        </View>

        {/* Bounding box overlay */}
        <View style={styles.overlayCenter}>
          <View style={styles.boundingBox}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomControls}>
          {/* Settings placeholder for balance */}
          <View style={styles.sideButton}>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => router.push('/language')}
            >
              <Text style={styles.settingsIcon}>🌐</Text>
            </TouchableOpacity>
            <Text style={styles.sideLabel}>Language</Text>
          </View>

          {/* Shutter button */}
          <View style={styles.shutterContainer}>
            <TouchableOpacity
              style={[
                styles.shutterButton,
                capturing && styles.shutterDisabled,
              ]}
              onPress={handleCapture}
              activeOpacity={0.7}
              disabled={capturing}
            >
              <View style={styles.shutterInner}>
                <Text style={styles.shutterIcon}>🔍</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.shutterLabel}>SCAN</Text>
          </View>

          {/* Voice button */}
          <View style={styles.sideButton}>
            <TouchableOpacity
              style={styles.voiceBtn}
              onPress={handleVoice}
              activeOpacity={0.7}
            >
              <Text style={styles.voiceIcon}>🎙️</Text>
            </TouchableOpacity>
            <Text style={styles.sideLabel}>Voice</Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  // Permission screens
  permissionContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  permissionEmoji: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  permissionTitle: {
    ...TYPOGRAPHY.heading,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  permissionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.primaryDark,
    ...SHADOWS.button3D,
  },
  permissionButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textLight,
  },
  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    zIndex: 10,
  },
  topBarBg: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  instructionText: {
    ...TYPOGRAPHY.body,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  // Bounding box
  overlayCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boundingBox: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.6)',
    borderStyle: 'dashed',
    borderRadius: RADIUS.lg,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: COLORS.primaryLight,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: RADIUS.lg,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: RADIUS.lg,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: RADIUS.lg,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: RADIUS.lg,
  },
  // Bottom controls
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: Platform.OS === 'android' ? 32 : 48,
    paddingHorizontal: SPACING.lg,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingTop: SPACING.lg,
  },
  // Shutter
  shutterContainer: {
    alignItems: 'center',
  },
  shutterButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    ...SHADOWS.large,
  },
  shutterDisabled: {
    opacity: 0.5,
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  shutterIcon: {
    fontSize: 28,
  },
  shutterLabel: {
    ...TYPOGRAPHY.label,
    color: '#FFFFFF',
    marginTop: SPACING.xs,
    fontWeight: '700',
  },
  // Side buttons
  sideButton: {
    alignItems: 'center',
    minWidth: 64,
  },
  settingsBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  settingsIcon: {
    fontSize: 24,
  },
  voiceBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    ...SHADOWS.medium,
  },
  voiceIcon: {
    fontSize: 24,
  },
  sideLabel: {
    ...TYPOGRAPHY.label,
    color: '#FFFFFF',
    marginTop: SPACING.xs,
    fontSize: 12,
  },
});
