import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LanguageContext } from '../context/LanguageContext';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Language'>;
};

export default function LanguageSelectionScreen({ navigation }: Props) {
  const languageContext = useContext(LanguageContext);

  if (!languageContext) return null;

  const { changeLanguage, t, isReady } = languageContext;

  const selectLanguage = (lang: string) => {
    changeLanguage(lang);
    navigation.replace('Home');
  };

  if (!isReady) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('welcome')}</Text>
      <Text style={styles.subtitle}>{t('selectLanguageText')}</Text>

      <TouchableOpacity style={styles.button} onPress={() => selectLanguage('en')}>
        <Text style={styles.buttonText}>English</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => selectLanguage('hi')}>
        <Text style={styles.buttonText}>हिन्दी</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    color: '#2E7D32',
  },
  subtitle: {
    fontSize: 16,
    color: '#2E7D32',
    marginBottom: 40,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  button: {
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginVertical: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
