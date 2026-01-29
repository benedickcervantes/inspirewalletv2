/**
 * Google Translate API Service
 * Provides translation functionality using Google Translate API
 */

// Language code mapping for Google Translate API
const LANGUAGE_CODES = {
  'English': 'en',
  'english': 'en',
  'Japanese': 'ja',
  'japanese': 'ja',
  'Saudi Arabia': 'ar',
  'saudi arabia': 'ar',
  'Korea': 'ko',
  'korea': 'ko',
  'Korean': 'ko',
  'korean': 'ko',
};

/**
 * Translate text using Google Translate API
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language (e.g., 'English', 'Japanese')
 * @param {string} sourceLanguage - Source language (default: 'en')
 * @returns {Promise<string>} Translated text
 */
export const translateText = async (text, targetLanguage = 'English', sourceLanguage = 'en') => {
  try {
    // Use the same API key as the existing chat implementation
    const apiKey = 'AIzaSyDw0B7QzCOlTYW7ofPfk916KBIccP9ZQzM';
    if (!apiKey) {
      throw new Error('Google Translate API key not found');
    }

    console.log('Translation request:', { text, targetLanguage, sourceLanguage });

    // Get target language code
    const targetLangCode = LANGUAGE_CODES[targetLanguage] || 'en';
    
    // If source and target are the same, return original text
    if (sourceLanguage === targetLangCode) {
      return text;
    }

    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        target: targetLangCode,
        source: sourceLanguage,
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.data.translations[0].translatedText;
    console.log('Translation successful:', translatedText);
    return translatedText;
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
};

/**
 * Translate multiple texts at once
 * @param {string[]} texts - Array of texts to translate
 * @param {string} targetLanguage - Target language
 * @param {string} sourceLanguage - Source language (default: 'en')
 * @returns {Promise<string[]>} Array of translated texts
 */
export const translateMultipleTexts = async (texts, targetLanguage = 'English', sourceLanguage = 'en') => {
  try {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
      throw new Error('Google Translate API key not found');
    }

    const targetLangCode = LANGUAGE_CODES[targetLanguage] || 'en';
    
    if (sourceLanguage === targetLangCode) {
      return texts;
    }

    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: texts,
        target: targetLangCode,
        source: sourceLanguage,
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data.translations.map(translation => translation.translatedText);
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
};

/**
 * Get supported language codes
 * @returns {Object} Object with language names as keys and codes as values
 */
export const getSupportedLanguages = () => {
  return LANGUAGE_CODES;
};

/**
 * Check if a language is supported
 * @param {string} language - Language name
 * @returns {boolean} True if language is supported
 */
export const isLanguageSupported = (language) => {
  return language in LANGUAGE_CODES;
};

export default {
  translateText,
  translateMultipleTexts,
  getSupportedLanguages,
  isLanguageSupported,
};
