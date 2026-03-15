import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../translations';

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en'); // Default to English
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Load saved language on mount
    const loadLanguage = async () => {
        try {
            const savedLanguage = await AsyncStorage.getItem('userLanguage');
            const validLanguages = Object.keys(translations);
            if (savedLanguage && validLanguages.includes(savedLanguage)) {
              setLanguage(savedLanguage);
            }
        } catch (e) {
            console.error('Failed to load language', e);
        } finally {
            setIsReady(true);
        }
    };
    loadLanguage();
  }, []);

  const changeLanguage = async (newLang) => {
    try {
        await AsyncStorage.setItem('userLanguage', newLang);
        setLanguage(newLang);
    } catch (e) {
        console.error('Failed to save language', e);
    }
  };

  const t = (key) => {
    const currentTranslations = translations[language] || translations.en;
    return currentTranslations[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t, isReady }}>
      {children}
    </LanguageContext.Provider>
  );
};
