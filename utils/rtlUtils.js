/**
 * RTL (Right-to-Left) utility functions for Arabic language support
 */

/**
 * Check if a language is RTL
 * @param {string} language - The language to check
 * @returns {boolean} True if the language is RTL
 */
export const isRTL = (language) => {
  const rtlLanguages = ['Saudi Arabia', 'Arabic', 'ar', 'he', 'iw', 'fa', 'ur'];
  return rtlLanguages.includes(language);
};

/**
 * Get text alignment based on language
 * @param {string} language - The language to check
 * @returns {string} 'right' for RTL languages, 'left' for LTR languages
 */
export const getTextAlign = (language) => {
  return isRTL(language) ? 'right' : 'left';
};

/**
 * Get flex direction for RTL support
 * @param {string} language - The language to check
 * @returns {string} 'row-reverse' for RTL languages, 'row' for LTR languages
 */
export const getFlexDirection = (language) => {
  return isRTL(language) ? 'row-reverse' : 'row';
};

/**
 * Get margin/padding direction for RTL support
 * @param {string} language - The language to check
 * @param {string} ltrValue - Value for LTR languages (e.g., 'marginLeft')
 * @param {string} rtlValue - Value for RTL languages (e.g., 'marginRight')
 * @returns {object} Style object with appropriate margin/padding
 */
export const getRTLStyle = (language, ltrValue, rtlValue) => {
  if (isRTL(language)) {
    return { [rtlValue]: ltrValue };
  }
  return { [ltrValue]: rtlValue };
};

/**
 * Get RTL-aware styles for common components
 * @param {string} language - The language to check
 * @returns {object} Object with RTL-aware styles
 */
export const getRTLStyles = (language) => {
  return {
    textAlign: getTextAlign(language),
    writingDirection: isRTL(language) ? 'rtl' : 'ltr',
  };
};
