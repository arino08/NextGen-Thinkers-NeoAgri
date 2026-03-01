import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [hasLanguage, setHasLanguage] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('selectedLanguage').then((lang) => {
      setHasLanguage(!!lang);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (hasLanguage) {
    return <Redirect href="/camera" />;
  }

  return <Redirect href="/language" />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
