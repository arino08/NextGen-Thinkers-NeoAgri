// ONLY CHANGES:
// 1. Root View → SafeAreaView
// 2. Permission screen wrapped in SafeAreaView
// 3. edges added
// 4. StatusBar from react-native KEPT (no change as per your request)

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  Image,
  StatusBar,
  Platform,
  GestureResponderEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SwipeHub'>;
};

const { width: SCREEN_W } = Dimensions.get('window');
const CAM_WIDTH = SCREEN_W;
const CAM_HEIGHT = Math.round(SCREEN_W * (4 / 3));

type ZoomPreset = { label: string; value: number };
const ZOOM_PRESETS: ZoomPreset[] = [
  { label: '1×', value: 0 },
  { label: '2×', value: 0.2 },
];

const MAX_DISPLAY_ZOOM = 5.0;
const MAX_CAM_ZOOM = 0.9;

function displayToCamera(display: number): number {
  return ((display - 1) / (MAX_DISPLAY_ZOOM - 1)) * MAX_CAM_ZOOM;
}

export default function CameraHomeScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();

  const [flashOn, setFlashOn] = useState<boolean>(false);
  const [cameraZoom, setCameraZoom] = useState<number>(0);
  const [displayZoom, setDisplayZoom] = useState<number>(1);
  const [activePresetIdx, setActivePresetIdx] = useState<number>(0);

  const [sliderVisible, setSliderVisible] = useState<boolean>(false);
  const sliderOpacity = useRef(new Animated.Value(0)).current;
  const SLIDER_HEIGHT = 200;
  const sliderVal = useRef(new Animated.Value(0)).current;
  const sliderValRef = useRef(0);
  const isDraggingSlider = useRef(false);

  const [focusPos, setFocusPos] = useState<{ x: number; y: number } | null>(null);
  const focusScale = useRef(new Animated.Value(1.4)).current;
  const focusOpacity = useRef(new Animated.Value(0)).current;

  const [liveMode, setLiveMode] = useState<boolean>(false);
  const livePulse = useRef(new Animated.Value(1)).current;
  const livePulseAnim = useRef<Animated.CompositeAnimation | null>(null);

  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState<boolean>(false);

  useEffect(() => {
    if (liveMode) {
      livePulseAnim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(livePulse, { toValue: 1.25, duration: 700, useNativeDriver: true }),
          Animated.timing(livePulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      livePulseAnim.current.start();
    } else {
      livePulseAnim.current?.stop();
      livePulse.setValue(1);
    }
    return () => livePulseAnim.current?.stop();
  }, [liveMode]);

  const showSlider = useCallback(() => {
    setSliderVisible(true);
    Animated.timing(sliderOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [sliderOpacity]);

  const hideSlider = useCallback(() => {
    Animated.timing(sliderOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
      setSliderVisible(false)
    );
  }, [sliderOpacity]);

  const sliderPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDraggingSlider.current = true;
      },
      onPanResponderMove: (_, gs) => {
        let newRaw = sliderValRef.current - gs.dy / SLIDER_HEIGHT;
        newRaw = Math.max(0, Math.min(1, newRaw));
        sliderValRef.current = newRaw;
        sliderVal.setValue(newRaw);
        const display = 1 + newRaw * (MAX_DISPLAY_ZOOM - 1);
        setDisplayZoom(display);
        setCameraZoom(displayToCamera(display));
        setActivePresetIdx(-1);
      },
      onPanResponderRelease: () => {
        isDraggingSlider.current = false;
      },
    })
  ).current;

  const handleCameraPress = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    setFocusPos({ x: locationX, y: locationY });
    focusScale.setValue(1.4);
    focusOpacity.setValue(1);
    Animated.parallel([
      Animated.spring(focusScale, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(focusOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(() => setFocusPos(null));
  };

  const handlePresetPress = (idx: number) => {
    const preset = ZOOM_PRESETS[idx];
    setActivePresetIdx(idx);
    setCameraZoom(preset.value);
    const display = idx === 0 ? 1 : 2;
    setDisplayZoom(display);
    sliderVal.setValue((display - 1) / (MAX_DISPLAY_ZOOM - 1));
    hideSlider();
  };

  const handlePresetLongPress = (idx: number) => {
    handlePresetPress(idx);
    showSlider();
  };

  const handleGallery = async () => {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      setLastPhoto(result.assets[0].uri);
    }
  };

  const handleCapture = () => {
    setLastPhoto('mock://captured-' + Date.now());
    setTimeout(() => {
      navigation.navigate('DiseaseResult', {});
    }, 300);
  };

  const handleThumbnailPress = () => {
    if (lastPhoto) navigation.navigate('DiseaseResult', {});
  };

  if (!permission) return <SafeAreaView style={styles.root} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer} edges={['top', 'bottom']}>
        <Ionicons name="camera-outline" size={56} color="#fff" style={{ marginBottom: 16 }} />
        <Text style={styles.permissionTitle}>Camera Permission</Text>
        <Text style={styles.permissionText}>We need camera access to scan your crops</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Allow Camera</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* YOUR UI SAME AS BEFORE */}
    
      {/* ── Space above camera ── */}
      <View style={styles.topSpacer}>
        {/* Flash top-right */}
        <TouchableOpacity
          style={styles.flashBtn}
          onPress={() => setFlashOn((f) => !f)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={flashOn ? 'flash' : 'flash-off'}
            size={22}
            color={flashOn ? '#FFD54F' : '#fff'}
          />
        </TouchableOpacity>

        {/* LIVE button top-left */}
        <TouchableOpacity
          style={[styles.liveBtn, liveMode && styles.liveBtnActive]}
          onPress={() => setLiveMode((l) => !l)}
          activeOpacity={0.8}
        >
          <View style={styles.liveDot} />
          <Text style={[styles.liveBtnText, liveMode && styles.liveBtnTextActive]}>LIVE</Text>
        </TouchableOpacity>
      </View>

      {/* ── 4:3 Camera Preview ── */}
      <View style={[styles.cameraWrapper, { width: CAM_WIDTH, height: CAM_HEIGHT }]}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={flashOn}
          zoom={cameraZoom}
          onCameraReady={() => setCameraReady(true)}
        />

        {/* Tap-to-focus overlay */}
        <View
          style={StyleSheet.absoluteFill}
          onStartShouldSetResponder={() => true}
          onResponderRelease={(e) => {
            if (!isDraggingSlider.current) handleCameraPress(e);
          }}
        />

        {/* Focus ring — renders at tap position */}
        {focusPos && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.focusRing,
              {
                left: focusPos.x - 35,
                top: focusPos.y - 35,
                opacity: focusOpacity,
                transform: [{ scale: focusScale }],
              },
            ]}
          />
        )}

        {/* LIVE AI pulse overlay */}
        {liveMode && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.livePulseOverlay,
              { transform: [{ scale: livePulse }], opacity: livePulse.interpolate({
                  inputRange: [1, 1.25],
                  outputRange: [0.08, 0.18],
                }) },
            ]}
          />
        )}

        {/* Zoom slider (vertical, overlaid on camera edge) */}
        {sliderVisible && (
          <Animated.View
            style={[styles.zoomSliderContainer, { opacity: sliderOpacity }]}
            {...sliderPan.panHandlers}
          >
            <View style={styles.zoomSliderTrack}>
              <Animated.View
                style={[
                  styles.zoomSliderThumb,
                  {
                    bottom: sliderVal.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, SLIDER_HEIGHT - 24],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.zoomSliderLabel}>
              {displayZoom.toFixed(1)}×
            </Text>
          </Animated.View>
        )}
      </View>

      {/* ── Zoom presets row ── */}
      <View style={styles.zoomRow}>
        {ZOOM_PRESETS.map((p, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.zoomPill,
              activePresetIdx === i && styles.zoomPillActive,
            ]}
            onPress={() => handlePresetPress(i)}
            onLongPress={() => handlePresetLongPress(i)}
            delayLongPress={350}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.zoomPillText,
                activePresetIdx === i && styles.zoomPillTextActive,
              ]}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Mode label ── */}
      <Text style={styles.modeLabel}>Photo</Text>

      {/* ── Bottom controls ── */}
      <View style={styles.bottomBar}>
        {/* Gallery / Last photo thumbnail (LEFT) */}
        <TouchableOpacity
          style={styles.thumbnailBtn}
          onPress={lastPhoto ? handleThumbnailPress : handleGallery}
          activeOpacity={0.85}
        >
          {lastPhoto ? (
            <Image
              source={
                lastPhoto.startsWith('mock://')
                  ? require('../../assets/farmer.png')
                  : { uri: lastPhoto }
              }
              style={styles.thumbnailImg}
            />
          ) : (
            <View style={styles.galleryPlaceholder}>
              <Ionicons name="images-outline" size={26} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        {/* Shutter button (CENTER) */}
        <TouchableOpacity
          style={styles.shutterOuter}
          onPress={handleCapture}
          activeOpacity={0.85}
        >
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        {/* LIVE AI glow button (RIGHT) */}
        <TouchableOpacity
          style={styles.aiGlowBtn}
          onPress={() => setLiveMode((l) => !l)}
          activeOpacity={0.85}
        >
          <Animated.View
            style={[
              styles.aiGlowBtnInner,
              liveMode && styles.aiGlowBtnActiveInner,
              { transform: [{ scale: liveMode ? livePulse : new Animated.Value(1) }] },
            ]}
          >
            <Ionicons
              name={liveMode ? 'sparkles' : 'sparkles-outline'}
              size={26}
              color={liveMode ? '#fff' : 'rgba(255,255,255,0.7)'}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
  },

  // ── Top spacer ──
  topSpacer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 50,
    paddingBottom: 12,
  },
  flashBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  liveBtnActive: {
    borderColor: '#F44336',
    backgroundColor: 'rgba(244,67,54,0.18)',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#F44336',
  },
  liveBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  liveBtnTextActive: {
    color: '#F44336',
  },

  // ── Camera ──
  cameraWrapper: {
    overflow: 'hidden',
    borderRadius: 0,
    position: 'relative',
  },
  focusRing: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FFD54F',
  },
  livePulseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#4CAF50',
    borderRadius: 0,
  },

  // ── Zoom slider ──
  zoomSliderContainer: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -(200 / 2),
    alignItems: 'center',
    zIndex: 10,
  },
  zoomSliderTrack: {
    width: 4,
    height: 200,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    position: 'relative',
  },
  zoomSliderThumb: {
    position: 'absolute',
    left: -10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
  },
  zoomSliderLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },

  // ── Zoom presets ──
  zoomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    backgroundColor: '#000',
  },
  zoomPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.12)',
    minWidth: 52,
    alignItems: 'center',
  },
  zoomPillActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1.5,
    borderColor: '#FFD54F',
  },
  zoomPillText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  zoomPillTextActive: {
    color: '#FFD54F',
    fontWeight: '700',
  },

  // ── Mode label ──
  modeLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '500',
    marginBottom: 8,
    backgroundColor: '#000',
    width: '100%',
    textAlign: 'center',
    paddingBottom: 4,
  },

  // ── Bottom bar ──
  bottomBar: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'android' ? 16 : 30,
  },

  // Thumbnail / Gallery
  thumbnailBtn: {
    width: 58,
    height: 58,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  galleryPlaceholder: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Shutter
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3.5,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
  },

  // AI glow button
  aiGlowBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiGlowBtnInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  aiGlowBtnActiveInner: {
    backgroundColor: '#6200EA',
    borderColor: '#B388FF',
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 12,
  },

  // Permission
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  permissionText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 28,
  },
  permissionBtn: {
    backgroundColor: '#1B5E20',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
  },
  permissionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
