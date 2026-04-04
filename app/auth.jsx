import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Clipboard, AppState,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS, FONTS } from '../lib/voiceStyles';
import PinPad from '../components/auth/PinPad';
import { setupFarmerPin } from '../db/farmer';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = process.env.EXPO_PUBLIC_API_URL;

// ─── Step 1: Phone Entry ────────────────────────────────────────────────────
function PhoneStep({ onNext }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      Alert.alert('गलत नंबर', 'कृपया 10 अंकों का मोबाइल नंबर डालें।');
      return;
    }
    const fullPhone = `+91${digits}`;
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, name: name.trim() || null }),
      });
      const data = await res.json();
      if (res.ok) {
        if (name.trim()) await AsyncStorage.setItem('farmer_name', name.trim());
        onNext(fullPhone);
      } else {
        Alert.alert('Error', data.error || 'OTP नहीं भेजा जा सका।');
      }
    } catch {
      Alert.alert('नेटवर्क त्रुटि', 'कृपया इंटरनेट जाँचें।');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.step}>
      <Text style={styles.title}>NeoAgri</Text>
      <Text style={styles.subtitle}>किसान खाते में लॉगिन करें</Text>

      <TextInput
        style={styles.nameInput}
        placeholder="आपका नाम (वैकल्पिक)"
        placeholderTextColor={COLORS.textSecondary}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />

      <View style={styles.phoneRow}>
        <View style={styles.countryCode}>
          <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
        </View>
        <TextInput
          style={styles.phoneInput}
          placeholder="मोबाइल नंबर"
          placeholderTextColor={COLORS.textSecondary}
          keyboardType="number-pad"
          maxLength={10}
          value={phone}
          onChangeText={setPhone}
          autoFocus
        />
      </View>

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={sendOtp}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#000" />
          : <Text style={styles.btnText}>OTP भेजें →</Text>
        }
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

// ─── Step 2: OTP Verification ───────────────────────────────────────────────
function OtpStep({ phone, onNext, onBack }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const inputRefs = useRef([]);
  const appState = useRef(AppState.currentState);

  // Clipboard watcher for auto-read OTP
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        try {
          const clip = await Clipboard.getString();
          const match = clip.match(/\b(\d{6})\b/);
          if (match) {
            const digits = match[1].split('');
            setOtp(digits);
            // auto-submit
            verifyOtpString(digits.join(''));
          }
        } catch { /* ignore */ }
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  function handleDigit(text, index) {
    const digit = text.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
    if (newOtp.every(d => d !== '')) verifyOtpString(newOtp.join(''));
  }

  function handleKeyPress(e, index) {
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function verifyOtpString(otpStr) {
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: otpStr }),
      });
      const data = await res.json();
      if (res.ok) {
        await AsyncStorage.setItem('auth_token', data.token);
        await AsyncStorage.setItem('farmer_phone', phone);
        if (data.farmer?.name) {
          await AsyncStorage.setItem('farmer_name', data.farmer.name);
        }
        onNext(data.token, data.farmer);
      } else {
        Alert.alert('गलत OTP', data.error || 'OTP सही नहीं है।');
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch {
      Alert.alert('त्रुटि', 'कृपया दोबारा कोशिश करें।');
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setResendTimer(30);
    try {
      await fetch(`${API}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
    } catch { /* ignore */ }
  }

  return (
    <View style={styles.step}>
      <TouchableOpacity onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>← वापस</Text>
      </TouchableOpacity>

      <Text style={styles.title}>OTP डालें</Text>
      <Text style={styles.subtitle}>
        {phone} पर भेजा गया{'\n'}6 अंकों का कोड डालें
      </Text>

      <View style={styles.otpRow}>
        {otp.map((digit, i) => (
          <TextInput
            key={i}
            ref={r => { inputRefs.current[i] = r; }}
            style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
            value={digit}
            onChangeText={t => handleDigit(t, i)}
            onKeyPress={e => handleKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>

      {loading && <ActivityIndicator color={COLORS.orbTeal} style={{ marginTop: 20 }} />}

      <TouchableOpacity
        onPress={resendOtp}
        disabled={resendTimer > 0}
        style={{ marginTop: 24 }}
      >
        <Text style={[styles.resend, resendTimer > 0 && styles.resendDisabled]}>
          {resendTimer > 0 ? `OTP दोबारा भेजें (${resendTimer}s)` : 'OTP दोबारा भेजें'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Step 3: PIN Setup ──────────────────────────────────────────────────────
function PinStep({ onDone }) {
  const [stage, setStage] = useState('set'); // 'set' | 'confirm'
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');

  useEffect(() => {
    if (stage === 'set' && pin.length === 4) {
      setFirstPin(pin);
      setPin('');
      setStage('confirm');
    } else if (stage === 'confirm' && pin.length === 4) {
      if (pin === firstPin) {
        confirmPin();
      } else {
        Alert.alert('PIN मेल नहीं खाया', 'कृपया दोबारा कोशिश करें।');
        setPin('');
        setStage('set');
        setFirstPin('');
      }
    }
  }, [pin]);

  async function confirmPin() {
    const result = await setupFarmerPin(pin);
    if (result.ok) {
      onDone();
    } else {
      Alert.alert('त्रुटि', result.error);
    }
  }

  return (
    <View style={styles.step}>
      <Text style={styles.title}>
        {stage === 'set' ? 'PIN बनाएं' : 'PIN दोहराएं'}
      </Text>
      <Text style={styles.subtitle}>
        {stage === 'set'
          ? '4 अंकों का सुरक्षित PIN बनाएं'
          : 'PIN दोबारा डालें'}
      </Text>

      <PinPad value={pin} onChange={setPin} maxLength={4} />
    </View>
  );
}

// ─── Step 4: PIN Login ──────────────────────────────────────────────────────
function PinLoginStep({ onDone }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const { verifyPin } = require('../db/farmer');

  useEffect(() => {
    if (pin.length === 4) checkPin();
  }, [pin]);

  async function checkPin() {
    const result = await verifyPin(pin);
    if (result.ok) {
      onDone();
    } else if (result.reason === 'locked') {
      setError(`बहुत अधिक गलत प्रयास। ${result.minsLeft} मिनट बाद कोशिश करें।`);
      setPin('');
    } else {
      setError(result.attemptsLeft !== undefined
        ? `गलत PIN। ${result.attemptsLeft} प्रयास शेष।`
        : 'गलत PIN।');
      setPin('');
    }
  }

  return (
    <View style={styles.step}>
      <Text style={styles.title}>PIN डालें</Text>
      <Text style={styles.subtitle}>NeoAgri खोलने के लिए</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <PinPad value={pin} onChange={setPin} maxLength={4} />
    </View>
  );
}

// ─── Root Auth Screen ───────────────────────────────────────────────────────
export default function AuthScreen() {
  // step: 'phone' | 'otp' | 'pin_setup' | 'pin_login'
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [hasPinState, setHasPinState] = useState(false);

  useEffect(() => {
    checkExistingPin();
  }, []);

  async function checkExistingPin() {
    const { hasFarmerProfile } = require('../db/farmer');
    const has = await hasFarmerProfile();
    if (has) {
      setHasPinState(true);
      setStep('pin_login');
    }
  }

  function handlePhoneDone(fullPhone) {
    setPhone(fullPhone);
    setStep('otp');
  }

  function handleOtpDone(token, farmer) {
    // After OTP verified, go to PIN setup if first time
    setStep('pin_setup');
  }

  function handlePinSetupDone() {
    router.replace('/');
  }

  function handlePinLoginDone() {
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.container}>
      {step === 'phone' && (
        <PhoneStep onNext={handlePhoneDone} />
      )}
      {step === 'otp' && (
        <OtpStep
          phone={phone}
          onNext={handleOtpDone}
          onBack={() => setStep('phone')}
        />
      )}
      {step === 'pin_setup' && (
        <PinStep onDone={handlePinSetupDone} />
      )}
      {step === 'pin_login' && (
        <PinLoginStep onDone={handlePinLoginDone} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  step: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.orbTeal,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  nameInput: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: COLORS.textPrimary,
    fontSize: 16,
    marginBottom: 12,
  },
  phoneRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  countryCode: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    justifyContent: 'center',
  },
  countryCodeText: {
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 16,
    color: COLORS.textPrimary,
    fontSize: 18,
    letterSpacing: 2,
  },
  btn: {
    width: '100%',
    backgroundColor: COLORS.orbTeal,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderWidth: 1.5,
    borderColor: '#333',
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: COLORS.orbTeal,
  },
  resend: {
    color: COLORS.orbTeal,
    fontSize: 14,
    fontWeight: '600',
  },
  resendDisabled: {
    color: COLORS.textSecondary,
  },
  back: {
    position: 'absolute',
    top: 16,
    left: 16,
    padding: 8,
  },
  backText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  errorText: {
    color: '#FF4D4D',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
});
