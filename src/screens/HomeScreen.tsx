import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  ScrollView,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  interpolate,
  Easing,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

const { width: W, height: H } = Dimensions.get('window');

// ─── Orb State Machine ─────────────────────────────────────────────────────
// 'idle'       → slow breathing green orb
// 'listening'  → expands, reacts to volume, vibrant teal/green
// 'thinking'   → orbital spin, amber glow
// 'speaking'   → pulses in time with voice response
const ORB_STATES = { IDLE: 'idle', LISTENING: 'listening', THINKING: 'thinking', SPEAKING: 'speaking' };

// ─── Mock Voice Conversation ────────────────────────────────────────────────
const GREET_HI = 'Namaste! Main NeoAgri hoon. Apni fasal ki koi samasya batayein.';
const GREET_EN = 'Hello! I am NeoAgri. Tell me about your crop concern.';

const MOCK_RESPONSES = {
  disease: {
    hi: 'Aapki fasal mein early blight ki samasya ho sakti hai. Main abhi camera mode kholne ki koshish karta hoon.',
    en: 'Your crop may have early blight. Let me open the camera to scan it.',
  },
  drone: {
    hi: 'Drone data sync ho raha hai. Aapke khet mein 3 infected zones hain.',
    en: 'Syncing drone data. Found 3 infected zones in your field.',
  },
  history: {
    hi: 'Pichhle hafte ki scan history dikha raha hoon.',
    en: 'Showing last week\'s scan history.',
  },
  default: {
    hi: 'Mujhe samajh nahi aaya. Kripya dobara bolein.',
    en: 'I did not understand. Please try again.',
  },
};

function detectIntent(text) {
  const lower = (text || '').toLowerCase();
  if (lower.includes('बीमारी') || lower.includes('disease') || lower.includes('beemari') || lower.includes('fasal'))
    return 'disease';
  if (lower.includes('drone') || lower.includes('ड्रोन') || lower.includes('radar'))
    return 'drone';
  if (lower.includes('history') || lower.includes('इतिहास') || lower.includes('scan'))
    return 'history';
  return 'default';
}

// ─── Wave Ring Component ────────────────────────────────────────────────────
function WaveRing({ delay, orbState, color }) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(opacity);

    if (orbState === ORB_STATES.IDLE) {
      scale.value = withDelay(delay, withRepeat(
        withSequence(
          withSpring(1.18, { damping: 12, stiffness: 40 }),
          withSpring(0.95, { damping: 12, stiffness: 40 })
        ), -1, true
      ));
      opacity.value = withDelay(delay, withRepeat(
        withSequence(
          withTiming(0.18, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.05, { duration: 2200, easing: Easing.inOut(Easing.sin) })
        ), -1, true
      ));
    } else if (orbState === ORB_STATES.LISTENING) {
      scale.value = withDelay(delay, withRepeat(
        withSequence(
          withSpring(1.5 + Math.random() * 0.4, { damping: 8, stiffness: 60 }),
          withSpring(1.0, { damping: 8, stiffness: 60 })
        ), -1, true
      ));
      opacity.value = withDelay(delay, withRepeat(
        withSequence(
          withTiming(0.35, { duration: 700 }),
          withTiming(0.1, { duration: 700 })
        ), -1, true
      ));
    } else if (orbState === ORB_STATES.THINKING) {
      scale.value = withRepeat(
        withTiming(1.8, { duration: 1200 + delay * 0.5, easing: Easing.out(Easing.exp) }),
        -1
      );
      opacity.value = withRepeat(
        withTiming(0, { duration: 1200 + delay * 0.5, easing: Easing.out(Easing.quad) }),
        -1
      );
    } else if (orbState === ORB_STATES.SPEAKING) {
      scale.value = withDelay(delay, withRepeat(
        withSequence(
          withSpring(1.3, { damping: 6, stiffness: 80 }),
          withSpring(0.9, { damping: 6, stiffness: 80 })
        ), -1, true
      ));
      opacity.value = withDelay(delay, withRepeat(
        withSequence(
          withTiming(0.28, { duration: 500 }),
          withTiming(0.06, { duration: 500 })
        ), -1, true
      ));
    }
  }, [orbState]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.waveRing, { borderColor: color }, animStyle]}
    />
  );
}

// ─── Core Orb ───────────────────────────────────────────────────────────────
function PulseOrb({ orbState, onPress }) {
  const orbScale = useSharedValue(1);
  const orbGlow = useSharedValue(0);
  const rotateAnim = useSharedValue(0);

  const ORB_COLORS = {
    [ORB_STATES.IDLE]:      { inner: ['#0D3B1A', '#1B6B30', '#2D9E4A'], ring: '#2A7A3F', glow: '#1B6B30' },
    [ORB_STATES.LISTENING]: { inner: ['#004D2E', '#00A852', '#00E87A'], ring: '#00E87A', glow: '#00C760' },
    [ORB_STATES.THINKING]:  { inner: ['#1A2E0D', '#5C7A1A', '#8FB82A'], ring: '#8FB82A', glow: '#B8D940' },
    [ORB_STATES.SPEAKING]:  { inner: ['#0A2E22', '#0E7C56', '#12C484'], ring: '#12C484', glow: '#0FD98E' },
  };

  const colors = ORB_COLORS[orbState] || ORB_COLORS[ORB_STATES.IDLE];

  useEffect(() => {
    cancelAnimation(orbScale);
    cancelAnimation(rotateAnim);

    if (orbState === ORB_STATES.IDLE) {
      orbScale.value = withRepeat(
        withSequence(
          withSpring(1.07, { damping: 15, stiffness: 35 }),
          withSpring(0.97, { damping: 15, stiffness: 35 })
        ), -1, true
      );
      orbGlow.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 2400 }),
          withTiming(0.2, { duration: 2400 })
        ), -1, true
      );
    } else if (orbState === ORB_STATES.LISTENING) {
      orbScale.value = withSpring(1.18, { damping: 10, stiffness: 60 });
      orbGlow.value = withRepeat(
        withSequence(
          withTiming(1.0, { duration: 400 }),
          withTiming(0.6, { duration: 400 })
        ), -1, true
      );
    } else if (orbState === ORB_STATES.THINKING) {
      orbScale.value = withRepeat(
        withSequence(
          withSpring(1.12, { damping: 8, stiffness: 55 }),
          withSpring(0.96, { damping: 8, stiffness: 55 })
        ), -1, true
      );
      rotateAnim.value = withRepeat(
        withTiming(360, { duration: 1800, easing: Easing.linear }),
        -1
      );
      orbGlow.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 900 }),
          withTiming(0.4, { duration: 900 })
        ), -1, true
      );
    } else if (orbState === ORB_STATES.SPEAKING) {
      orbScale.value = withRepeat(
        withSequence(
          withSpring(1.14, { damping: 6, stiffness: 75 }),
          withSpring(0.93, { damping: 6, stiffness: 75 })
        ), -1, true
      );
      orbGlow.value = withRepeat(
        withSequence(
          withTiming(1.0, { duration: 380 }),
          withTiming(0.5, { duration: 380 })
        ), -1, true
      );
    }
  }, [orbState]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: orbScale.value },
      { rotate: `${rotateAnim.value}deg` },
    ] as any,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: orbGlow.value,
  }));

  const ORB_SIZE = 148;

  return (
    <View style={styles.orbContainer}>
      {/* Wave rings behind orb */}
      <WaveRing delay={0}   orbState={orbState} color={colors.ring} />
      <WaveRing delay={600} orbState={orbState} color={colors.ring} />
      <WaveRing delay={1200} orbState={orbState} color={colors.ring} />

      {/* Ambient glow layer */}
      <Animated.View
        pointerEvents="none"
        style={[styles.glowLayer, { backgroundColor: colors.glow }, glowStyle]}
      />

      {/* Main orb */}
      <Animated.View style={orbStyle}>
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={onPress}
          style={[styles.orbOuter, { width: ORB_SIZE, height: ORB_SIZE, borderRadius: ORB_SIZE / 2, borderColor: colors.ring }]}
        >
          <LinearGradient
            colors={colors.inner as any}
            style={[styles.orbGradient, { borderRadius: ORB_SIZE / 2 }]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
          >
            <OrbIcon orbState={orbState} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function OrbIcon({ orbState }) {
  const iconAnim = useSharedValue(0);

  useEffect(() => {
    iconAnim.value = withSpring(1, { damping: 12, stiffness: 70 });
    return () => { iconAnim.value = 0; };
  }, [orbState]);

  const style = useAnimatedStyle(() => ({
    opacity: iconAnim.value,
    transform: [{ scale: interpolate(iconAnim.value, [0, 1], [0.7, 1]) }],
  }));

  const icons = {
    [ORB_STATES.IDLE]:      { name: 'mic-outline', color: '#A8F5C8' },
    [ORB_STATES.LISTENING]: { name: 'mic',         color: '#FFFFFF' },
    [ORB_STATES.THINKING]:  { name: 'sparkles',    color: '#D4FF70' },
    [ORB_STATES.SPEAKING]:  { name: 'volume-high', color: '#7FFFD4' },
  };

  const icon = icons[orbState] || icons[ORB_STATES.IDLE];

  return (
    <Animated.View style={style}>
      <Ionicons name={icon.name as any} size={46} color={icon.color} />
    </Animated.View>
  );
}

// ─── Transcript Text Bubble ──────────────────────────────────────────────────
function TranscriptBubble({ text, isAI }) {
  const translateY = useSharedValue(20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 14, stiffness: 60 });
    opacity.value = withSpring(1, { damping: 14 });
  }, [text]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!text) return null;

  return (
    <Animated.View style={[styles.bubble, isAI ? styles.bubbleAI : styles.bubbleUser, style]}>
      {isAI && (
        <View style={styles.bubbleIcon}>
          <View style={styles.aiDot} />
        </View>
      )}
      <Text style={[styles.bubbleText, isAI ? styles.bubbleTextAI : styles.bubbleTextUser]} numberOfLines={4}>
        {text}
      </Text>
    </Animated.View>
  );
}

// ─── Status Label ─────────────────────────────────────────────────────────
function StatusLabel({ orbState }) {
  const opacity = useSharedValue(0);
  const y = useSharedValue(6);

  useEffect(() => {
    opacity.value = withSpring(1, { damping: 14 });
    y.value = withSpring(0, { damping: 14 });
    return () => {
      opacity.value = withTiming(0, { duration: 200 });
      y.value = withTiming(6, { duration: 200 });
    };
  }, [orbState]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  const LABELS = {
    [ORB_STATES.IDLE]:      { en: 'Touch to speak', hi: 'बोलने के लिए छुएं', color: '#5FBA7D' },
    [ORB_STATES.LISTENING]: { en: 'Listening...', hi: 'सुन रहा हूँ...', color: '#00E87A' },
    [ORB_STATES.THINKING]:  { en: 'Thinking...', hi: 'सोच रहा हूँ...', color: '#B8D940' },
    [ORB_STATES.SPEAKING]:  { en: 'NeoAgri is speaking', hi: 'NeoAgri बोल रहा है', color: '#12C484' },
  };

  const label = LABELS[orbState] || LABELS[ORB_STATES.IDLE];

  return (
    <Animated.View style={style}>
      <Text style={[styles.statusHi, { color: label.color }]}>{label.hi}</Text>
      <Text style={[styles.statusEn, { color: `${label.color}88` }]}>{label.en}</Text>
    </Animated.View>
  );
}

// ─── Quick Nav Pills ─────────────────────────────────────────────────────────
function NavPill({ icon, label, color, onPress }) {
  const scale = useSharedValue(1);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onIn = () => {
    scale.value = withSpring(0.93, { damping: 14 });
    Haptics.selectionAsync();
  };
  const onOut = () => {
    scale.value = withSpring(1, { damping: 14 });
  };

  return (
    <Animated.View style={style}>
      <TouchableOpacity
        onPressIn={onIn}
        onPressOut={onOut}
        onPress={onPress}
        style={[styles.pill, { borderColor: `${color}30` }]}
        activeOpacity={1}
      >
        <View style={[styles.pillIcon, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.pillLabel, { color }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── HomeScreen ──────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const [orbState, setOrbState] = useState(ORB_STATES.IDLE);
  const [userText, setUserText] = useState('');
  const [aiText, setAiText] = useState('');
  const [lang, setLang] = useState('hi'); // 'hi' | 'en'
  const [recording, setRecording] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);

  const headerOpacity = useSharedValue(0);
  const headerY = useSharedValue(-12);
  const pillsY = useSharedValue(30);
  const pillsOpacity = useSharedValue(0);

  // ── Entrance animation ──────────────────────────────────────────────────
  useEffect(() => {
    headerOpacity.value = withDelay(200, withSpring(1, { damping: 14 }));
    headerY.value = withDelay(200, withSpring(0, { damping: 14 }));
    pillsOpacity.value = withDelay(500, withSpring(1, { damping: 14 }));
    pillsY.value = withDelay(500, withSpring(0, { damping: 14 }));

    // Greet user on mount
    setTimeout(() => {
      const greet = lang === 'hi' ? GREET_HI : GREET_EN;
      speak(greet);
    }, 900);

    return () => {
      Speech.stop();
    };
  }, []);

  // ── Back button — home is root ──────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, [])
  );

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerY.value }],
  }));

  const pillsStyle = useAnimatedStyle(() => ({
    opacity: pillsOpacity.value,
    transform: [{ translateY: pillsY.value }],
  }));

  // ── TTS ─────────────────────────────────────────────────────────────────
  const speak = useCallback((text) => {
    setOrbState(ORB_STATES.SPEAKING);
    setAiText(text);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Speech.speak(text, {
      language: lang === 'hi' ? 'hi-IN' : 'en-IN',
      pitch: 1.0,
      rate: 0.92,
      onDone: () => {
        setOrbState(ORB_STATES.IDLE);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onError: () => setOrbState(ORB_STATES.IDLE),
    });
  }, [lang]);

  // ── Mock voice pipeline ─────────────────────────────────────────────────
  // In production: expo-audio → backend Whisper STT → LLM intent → response
  const handleOrbPress = useCallback(async () => {
    if (orbState === ORB_STATES.LISTENING) {
      // Stop listening → process
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setOrbState(ORB_STATES.THINKING);

      // Simulate STT processing delay
      const mockTranscript = lang === 'hi' ? 'मेरी फसल में बीमारी है' : 'My crop has a disease';
      setUserText(mockTranscript);

      setTimeout(() => {
        const intent = detectIntent(mockTranscript);
        const response = MOCK_RESPONSES[intent];
        const responseText = response ? response[lang] : MOCK_RESPONSES.default[lang];

        // Route navigation based on intent
        if (intent === 'history') {
          setTimeout(() => navigation.navigate('History'), 1200);
        } else if (intent === 'drone') {
          setTimeout(() => navigation.navigate('ViewMap'), 1200);
        } else if (intent === 'disease') {
          setTimeout(() => navigation.navigate('SwipeHub'), 1200);
        }

        speak(responseText);
      }, 1800);

    } else if (orbState === ORB_STATES.IDLE) {
      // Start listening
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setOrbState(ORB_STATES.LISTENING);
      setUserText('');
      setAiText('');
      Speech.stop();

      // Auto-stop after 5 seconds (simulate listening window)
      setTimeout(() => {
        setOrbState((current) => {
          if (current === ORB_STATES.LISTENING) {
            // trigger processing
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setOrbState(ORB_STATES.THINKING);
            const mockTranscript = lang === 'hi' ? 'मेरी फसल में बीमारी है' : 'My crop has a disease';
            setUserText(mockTranscript);

            setTimeout(() => {
              const intent = detectIntent(mockTranscript);
              const response = MOCK_RESPONSES[intent];
              const responseText = response ? response[lang] : MOCK_RESPONSES.default[lang];

              if (intent === 'history') setTimeout(() => navigation.navigate('History'), 1200);
              else if (intent === 'drone') setTimeout(() => navigation.navigate('ViewMap'), 1200);
              else if (intent === 'disease') setTimeout(() => navigation.navigate('SwipeHub'), 1200);

              speak(responseText);
            }, 1800);
          }
          return current;
        });
      }, 5000);
    }
  }, [orbState, lang, speak]);

  const NAV_PILLS = [
    { icon: 'compass-outline',  label: 'Field Radar', color: '#4285F4', onPress: () => navigation.navigate('ViewMap') },
    { icon: 'time-outline',     label: 'History',    color: '#FF8C42', onPress: () => navigation.navigate('History') },
    { icon: 'camera-outline',   label: 'Scan',       color: '#69F0AE', onPress: () => navigation.navigate('SwipeHub') },
  ];

  return (
    <View style={styles.root}>
      {/* ── Background gradient ── */}
      <LinearGradient
        colors={['#020D04', '#061208', '#030805']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* ── Ambient background orb glow ── */}
      <View style={styles.bgGlow} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* ── Header ── */}
        <Animated.View style={[styles.header, headerStyle]}>
          <View>
            <Text style={styles.appTitle}>NeoAgri</Text>
            <Text style={styles.appSub}>Awaz se kheti · Voice-First AI</Text>
          </View>
          <TouchableOpacity
            style={styles.langToggle}
            onPress={() => {
              const next = lang === 'hi' ? 'en' : 'hi';
              setLang(next);
              Haptics.selectionAsync();
            }}
          >
            <Text style={styles.langLabel}>{lang === 'hi' ? 'EN' : 'हि'}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Center: Voice Orb + Transcript ── */}
        <View style={styles.center}>
          <PulseOrb orbState={orbState} onPress={handleOrbPress} />

          <View style={styles.statusBlock}>
            <StatusLabel orbState={orbState} />
          </View>

          {/* Transcript area */}
          <View style={styles.transcriptArea}>
            {userText ? (
              <TranscriptBubble text={userText} isAI={false} />
            ) : null}
            {aiText ? (
              <TranscriptBubble text={aiText} isAI={true} />
            ) : null}
          </View>
        </View>

        {/* ── Bottom nav pills ── */}
        <Animated.View style={[styles.pillsRow, pillsStyle]}>
          {NAV_PILLS.map((p) => (
            <NavPill key={p.label} {...p} />
          ))}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020D04',
  },
  safe: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bgGlow: {
    position: 'absolute',
    width: W * 1.1,
    height: W * 1.1,
    borderRadius: W * 0.55,
    backgroundColor: 'rgba(18,90,38,0.09)',
    alignSelf: 'center',
    top: H * 0.18,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  appTitle: {
    color: '#E0F5E8',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  appSub: {
    color: 'rgba(160,220,180,0.45)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.4,
    marginTop: 1,
  },
  langToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(105,240,174,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(105,240,174,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  langLabel: {
    color: '#69F0AE',
    fontSize: 13,
    fontWeight: '800',
  },

  // ── Center ──
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },

  // ── Orb ──
  orbContainer: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.5,
  },
  glowLayer: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  orbOuter: {
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#00E87A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 32,
    elevation: 20,
  },
  orbGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Status ──
  statusBlock: {
    alignItems: 'center',
    minHeight: 48,
  },
  statusHi: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  statusEn: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // ── Transcripts ──
  transcriptArea: {
    width: '100%',
    paddingHorizontal: 20,
    gap: 10,
    minHeight: 80,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '88%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(105,240,174,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(105,240,174,0.15)',
  },
  bubbleAI: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  bubbleIcon: {
    paddingTop: 4,
  },
  aiDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#69F0AE',
    shadowColor: '#69F0AE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  bubbleText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  bubbleTextUser: {
    color: '#B8F5CE',
  },
  bubbleTextAI: {
    color: 'rgba(255,255,255,0.85)',
  },

  // ── Nav Pills ──
  pillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 10,
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 50,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  pillIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
