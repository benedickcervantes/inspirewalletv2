import english from '../assets/languages/english.json';
import japanese from '../assets/languages/japanese.json';
import arabic from '../assets/languages/arabic.json';
import korean from '../assets/languages/korean.json';

// Language mapping
const languageFiles = {
  'English': english,
  'Japanese': japanese,
  'Saudi Arabia': arabic, // Now maps to Arabic
  'Korea': korean, // Now maps to Korean
};

/**
 * Get the language data for the specified language
 * @param {string} language - The preferred language
 * @returns {object} The language data object
 */
export const getLanguageData = (language = 'English') => {
  return languageFiles[language] || languageFiles['English'];
};

/**
 * Get a nested value from language data using dot notation
 * @param {object} languageData - The language data object
 * @param {string} path - The path to the value (e.g., 'personal.header.title')
 * @returns {string} The language string or fallback
 */
export const getLanguageString = (languageData, path) => {
  const keys = path.split('.');
  let value = languageData;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return path; // Return the path as fallback if not found
    }
  }
  
  return value || path;
};

/**
 * Get a language string with fallback to English
 * @param {string} language - The preferred language
 * @param {string} path - The path to the value
 * @returns {string} The language string
 */
export const t = (language, path) => {
  const languageData = getLanguageData(language);
  const value = getLanguageString(languageData, path);
  
  // If the value is the same as the path, it means it wasn't found
  // Try to get it from English as fallback
  if (value === path && language !== 'English') {
    const englishData = getLanguageData('English');
    return getLanguageString(englishData, path);
  }
  
  return value;
};
