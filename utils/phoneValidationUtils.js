/**
 * Phone Number Validation Utility
 * Validates phone numbers for different countries
 * Accepts numbers with 10 digits or 11 digits starting with 0
 */

const COUNTRY_FORMATS = {
  "+63": { // Philippines
    name: "Philippines",
    digitCount: [10], // Exactly 10 digits (9012345678)
    maxLength: 10,
  },
  "+81": { // Japan
    name: "Japan",
    digitCount: [10], // Exactly 10 digits
    maxLength: 10,
  },
  "+966": { // Saudi Arabia
    name: "Saudi Arabia",
    digitCount: [9], // Exactly 9 digits
    maxLength: 9,
  },
  "+82": { // Korea
    name: "Korea",
    digitCount: [10], // Exactly 10 digits
    maxLength: 10,
  },
  "+1": { // USA
    name: "USA",
    digitCount: [10], // Exactly 10 digits
    maxLength: 10,
  },
};

/**
 * Removes all non-digit characters from a string
 * @param {string} phoneNumber - The phone number to clean
 * @returns {string} - The cleaned phone number with only digits
 */
export const cleanPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return "";
  return phoneNumber.replace(/\D/g, "");
};

/**
 * Validates a phone number based on the selected country code
 * @param {string} phoneNumber - The phone number to validate (can include spaces, hyphens, etc.)
 * @param {string} countryCode - The country code (e.g., "+63", "+81")
 * @returns {object} - { isValid: boolean, error: string or null }
 */
export const validatePhoneNumber = (phoneNumber, countryCode) => {
  // If phone number is empty, it's valid (field is optional)
  if (!phoneNumber || !phoneNumber.trim()) {
    return { isValid: true, error: null };
  }

  // Get country format rules
  const countryRules = COUNTRY_FORMATS[countryCode];
  if (!countryRules) {
    return { isValid: false, error: "Invalid country code" };
  }

  // Clean the phone number (remove all non-digits)
  const cleanedNumber = cleanPhoneNumber(phoneNumber);

  // Check if it contains only digits
  if (!/^\d+$/.test(cleanedNumber)) {
    return {
      isValid: false,
      error: `Phone number should contain only digits`,
    };
  }

  // Check if the digit count is valid for the country
  const digitLength = cleanedNumber.length;
  const validLengths = countryRules.digitCount;

  if (!validLengths.includes(digitLength)) {
    const lengthText =
      validLengths.length === 1
        ? `exactly ${validLengths[0]}`
        : `${validLengths[0]} or ${validLengths[validLengths.length - 1]}`;

    return {
      isValid: false,
      error: `${countryRules.name} phone number must be ${lengthText} digits. You entered ${digitLength} digits.`,
    };
  }

  // All validations passed
  return { isValid: true, error: null };
};

/**
 * Get the display format hint for a country
 * @param {string} countryCode - The country code
 * @returns {string} - Format hint text
 */
export const getFormatHint = (countryCode) => {
  const countryRules = COUNTRY_FORMATS[countryCode];
  if (!countryRules) return "";

  const lengths = countryRules.digitCount;
  let hint = `${lengths[0]}`;
  if (lengths.length > 1) {
    hint += ` or ${lengths[lengths.length - 1]}`;
  }
  return `${hint} digits`;
};

/**
 * Get the maximum allowed length for a country's phone number
 * @param {string} countryCode - The country code
 * @returns {number} - Maximum length
 */
export const getMaxLength = (countryCode) => {
  const countryRules = COUNTRY_FORMATS[countryCode];
  if (!countryRules) return 15; // Default fallback
  return countryRules.maxLength;
};
