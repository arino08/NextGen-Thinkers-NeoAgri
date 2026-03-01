export const COLORS = {
  primary: '#2E7D32',
  primaryDark: '#1B5E20',
  primaryLight: '#4CAF50',
  accent: '#FF8F00',
  accentDark: '#E65100',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceWarm: '#FFF8E1',
  text: '#1A1A1A',
  textSecondary: '#424242',
  textLight: '#FFFFFF',
  border: '#E0E0E0',
  success: '#388E3C',
  warning: '#F57F17',
  danger: '#C62828',
  overlay: 'rgba(0,0,0,0.5)',
  shadow: '#000000',
};

export const TYPOGRAPHY = {
  hero: {
    fontSize: 32,
    fontWeight: '800' as const,
    lineHeight: 40,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  subheading: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 26,
  },
  bodyBold: {
    fontSize: 18,
    fontWeight: '700' as const,
    lineHeight: 26,
  },
  label: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const SHADOWS = {
  small: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  large: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  button3D: {
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 8,
  },
};

export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
];

export const MOCK_RESULT = {
  en: {
    disease: 'Late Blight',
    confidence: 94,
    severity: 'Moderate',
    remedy: 'Mancozeb Fungicide',
    dosage: 'Mix 2 grams in 1 liter of water',
    instructions: 'Spray on affected leaves every 7 days. Repeat 3 times.',
    prevention: 'Avoid overhead irrigation. Remove infected leaves immediately.',
  },
  hi: {
    disease: 'झुलसा रोग (लेट ब्लाइट)',
    confidence: 94,
    severity: 'मध्यम',
    remedy: 'मैंकोजेब फफूंदनाशक',
    dosage: '2 ग्राम को 1 लीटर पानी में मिलाएं',
    instructions: 'प्रभावित पत्तियों पर हर 7 दिन छिड़काव करें। 3 बार दोहराएं।',
    prevention: 'ऊपर से सिंचाई से बचें। संक्रमित पत्तियों को तुरंत हटाएं।',
  },
  mr: {
    disease: 'करपा रोग (लेट ब्लाइट)',
    confidence: 94,
    severity: 'मध्यम',
    remedy: 'मॅन्कोझेब बुरशीनाशक',
    dosage: '2 ग्रॅम 1 लिटर पाण्यात मिसळा',
    instructions: 'प्रभावित पानांवर दर 7 दिवसांनी फवारणी करा। 3 वेळा पुन्हा करा।',
    prevention: 'वरून पाणी देणे टाळा। बाधित पाने लगेच काढून टाका।',
  },
};
