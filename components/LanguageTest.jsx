import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { t } from '../utils/languageUtils';

export default function LanguageTest() {
  const [currentLanguage, setCurrentLanguage] = useState('English');

  const languages = ['English', 'Japanese', 'Saudi Arabia', 'Korea'];

  const switchLanguage = (language) => {
    setCurrentLanguage(language);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t(currentLanguage, 'personal.header.title')}</Text>
      
      <View style={styles.languageButtons}>
        {languages.map((language) => (
          <TouchableOpacity
            key={language}
            style={[
              styles.languageButton,
              currentLanguage === language && styles.activeLanguageButton
            ]}
            onPress={() => switchLanguage(language)}
          >
            <Text style={[
              styles.languageButtonText,
              currentLanguage === language && styles.activeLanguageButtonText
            ]}>
              {language}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.demoSection}>
        <Text style={styles.demoText}>
          {t(currentLanguage, 'personal.fields.name')}: {t(currentLanguage, 'personal.values.notProvided')}
        </Text>
        <Text style={styles.demoText}>
          {t(currentLanguage, 'personal.fields.emailAddress')}: {t(currentLanguage, 'personal.values.notProvided')}
        </Text>
        <Text style={styles.demoText}>
          {t(currentLanguage, 'personal.buttons.save')} / {t(currentLanguage, 'personal.buttons.cancel')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  languageButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  languageButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
  },
  activeLanguageButton: {
    backgroundColor: '#007AFF',
  },
  languageButtonText: {
    fontSize: 16,
    color: '#333',
  },
  activeLanguageButtonText: {
    color: '#fff',
  },
  demoSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
  },
  demoText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
});
