# Language System Implementation

This document describes the internationalization (i18n) system implemented in the Inspire Wallet app.

## Overview

The language system allows users to switch between different languages (currently English, Japanese, Arabic, and Korean) and automatically updates all text content throughout the app. Arabic language includes RTL (Right-to-Left) text direction support.

## Files Structure

```
assets/languages/
├── english.json      # English language strings
├── japanese.json    # Japanese language strings
├── arabic.json      # Arabic language strings
├── korean.json      # Korean language strings
└── ...

utils/
└── languageUtils.js # Language utility functions

components/
├── LanguageTest.jsx      # Basic demo component for testing
└── MultiLanguageTest.jsx # Comprehensive demo with RTL support
```

## How It Works

### 1. Language JSON Files

Each language has its own JSON file containing all the text strings organized in a hierarchical structure:

```json
{
  "personal": {
    "header": {
      "title": "Personal Information"
    },
    "fields": {
      "name": "Name"
    }
  }
}
```

### 2. Language Utility Functions

The `utils/languageUtils.js` file provides functions to:
- Load language data based on user preference
- Get specific strings using dot notation paths
- Fallback to English if a translation is missing

### 3. Usage in Components

To use the language system in a component:

```jsx
import { t } from '../../utils/languageUtils';

// Get a language string
const title = t(userData.preferredLanguage || 'English', 'personal.header.title');

// Use in JSX
<Text>{title}</Text>
```

## Adding New Languages

1. Create a new JSON file in `assets/languages/` (e.g., `spanish.json`)
2. Add the language to the `languageFiles` mapping in `utils/languageUtils.js`
3. Translate all the strings from the English file

## Adding New Text

1. Add the English text to `assets/languages/english.json`
2. Add the corresponding translation to `assets/languages/japanese.json`
3. Use the `t()` function in your component with the correct path

## Language Switching

Users can change their preferred language in the Personal Information page. The change is saved to Firebase and automatically applied throughout the app.

## Testing

Use the test components to verify language switching functionality:

### Basic Testing
```jsx
import LanguageTest from '../components/LanguageTest';

// In your component
<LanguageTest />
```

### Comprehensive Testing with RTL Support
```jsx
import MultiLanguageTest from '../components/MultiLanguageTest';

// In your component
<MultiLanguageTest />
```

The `MultiLanguageTest` component demonstrates all four languages including RTL (Right-to-Left) support for Arabic.

## Best Practices

1. Always use the `t()` function for user-facing text
2. Keep language paths organized and logical
3. Provide fallback text for missing translations
4. Test with different languages to ensure proper display
5. Consider text length differences between languages

## Current Supported Languages

- English (default)
- Japanese
- Saudi Arabia (Arabic)
- Korea (Korean)

## Future Enhancements

- Add more languages
- Implement RTL (Right-to-Left) support for Arabic (currently supported)
- Add language detection based on device settings
- Implement pluralization rules
- Add date and number formatting per locale
