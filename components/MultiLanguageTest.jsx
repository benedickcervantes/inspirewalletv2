import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { t } from '../utils/languageUtils';
import { getRTLStyles, isRTL } from '../utils/rtlUtils';

export default function MultiLanguageTest() {
  const [currentLanguage, setCurrentLanguage] = useState('English');

  const languages = [
    { key: 'English', name: 'English', flag: '🇺🇸' },
    { key: 'Japanese', name: '日本語', flag: '🇯🇵' },
    { key: 'Saudi Arabia', name: 'العربية', flag: '🇸🇦' },
    { key: 'Korea', name: '한국어', flag: '🇰🇷' }
  ];

  const switchLanguage = (language) => {
    setCurrentLanguage(language);
  };

  const isCurrentRTL = isRTL(currentLanguage);

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, { flexDirection: isCurrentRTL ? 'row-reverse' : 'row' }]}>
        <Text style={[styles.title, getRTLStyles(currentLanguage)]}>
          {t(currentLanguage, 'personal.header.title')}
        </Text>
        <Text style={styles.rtlIndicator}>
          {isCurrentRTL ? 'RTL' : 'LTR'}
        </Text>
      </View>
      
      <View style={styles.languageButtons}>
        {languages.map((language) => (
          <TouchableOpacity
            key={language.key}
            style={[
              styles.languageButton,
              currentLanguage === language.key && styles.activeLanguageButton
            ]}
            onPress={() => switchLanguage(language.key)}
          >
            <Text style={styles.flagText}>{language.flag}</Text>
            <Text style={[
              styles.languageButtonText,
              currentLanguage === language.key && styles.activeLanguageButtonText
            ]}>
              {language.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.demoSection}>
        <Text style={[styles.sectionTitle, getRTLStyles(currentLanguage)]}>
          {t(currentLanguage, 'personal.cards.accountDetails.title')}
        </Text>
        
        <View style={styles.demoRow}>
          <Text style={[styles.demoLabel, getRTLStyles(currentLanguage)]}>
            {t(currentLanguage, 'personal.fields.name')}:
          </Text>
          <Text style={[styles.demoValue, getRTLStyles(currentLanguage)]}>
            {t(currentLanguage, 'personal.values.notProvided')}
          </Text>
        </View>

        <View style={styles.demoRow}>
          <Text style={[styles.demoLabel, getRTLStyles(currentLanguage)]}>
            {t(currentLanguage, 'personal.fields.emailAddress')}:
          </Text>
          <Text style={[styles.demoValue, getRTLStyles(currentLanguage)]}>
            {t(currentLanguage, 'personal.values.notProvided')}
          </Text>
        </View>

        <View style={styles.demoRow}>
          <Text style={[styles.demoLabel, getRTLStyles(currentLanguage)]}>
            {t(currentLanguage, 'personal.fields.accountType')}:
          </Text>
          <Text style={[styles.demoValue, getRTLStyles(currentLanguage)]}>
            {t(currentLanguage, 'personal.values.basic')}
          </Text>
        </View>
      </View>

      <View style={styles.demoSection}>
        <Text style={[styles.sectionTitle, getRTLStyles(currentLanguage)]}>
          {t(currentLanguage, 'personal.buttons.editName')}
        </Text>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.demoButton, styles.saveButton]}>
            <Text style={styles.demoButtonText}>
              {t(currentLanguage, 'personal.buttons.save')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.demoButton, styles.cancelButton]}>
            <Text style={styles.demoButtonText}>
              {t(currentLanguage, 'personal.buttons.cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.demoSection}>
        <Text style={[styles.sectionTitle, getRTLStyles(currentLanguage)]}>
          {t(currentLanguage, 'personal.messages.titles.success')}
        </Text>
        <Text style={[styles.demoMessage, getRTLStyles(currentLanguage)]}>
          {t(currentLanguage, 'personal.messages.success.nameUpdated')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  rtlIndicator: {
    fontSize: 12,
    backgroundColor: '#007AFF',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: 'bold',
  },
  languageButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  languageButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  activeLanguageButton: {
    backgroundColor: '#007AFF',
  },
  flagText: {
    fontSize: 20,
    marginBottom: 4,
  },
  languageButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  activeLanguageButtonText: {
    color: '#fff',
  },
  demoSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  demoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  demoLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  demoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  demoButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#27ae60',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  demoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  demoMessage: {
    fontSize: 16,
    color: '#27ae60',
    lineHeight: 24,
  },
});
