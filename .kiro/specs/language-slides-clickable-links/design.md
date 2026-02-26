# Design Document: Language Slides Clickable Links

## Overview

This feature adds URL navigation capability to specific banner slides in the Dashboard's language slides carousel. Currently, all slides navigate to the "Crypto" route when tapped. This design enables the Loopwork and DeskHRX banners to open their respective external URLs in the device's browser while maintaining backward compatibility for other banners.

The implementation is minimal and focused: we extend the data structure to include optional URLs and modify the tap handler to conditionally open external links or navigate internally based on the presence of a URL property.

## Architecture

The solution follows a data-driven approach where each slide's behavior is determined by its configuration rather than hardcoded logic. This maintains the existing carousel architecture while adding flexibility for external navigation.

### Component Structure

```
Dashboard Component
├── languageSlides (data array)
│   ├── Slide objects with image + optional url
│   └── Configuration determines tap behavior
├── ScrollView (carousel container)
│   └── TouchableOpacity (per slide)
│       ├── onPress handler (conditional logic)
│       └── Image component
└── Pagination indicators
```

### Data Flow

1. User taps a banner slide
2. TouchableOpacity onPress handler checks for url property
3. If url exists: Open external URL via Linking API
4. If url absent: Navigate to "Crypto" route (existing behavior)
5. Error handling prevents crashes on failed URL opens

## Components and Interfaces

### Data Model Extension

The languageSlides array structure is extended to support optional URLs:

```typescript
interface LanguageSlide {
  image: any; // require() result for image asset
  url?: string; // Optional external URL
}

const languageSlides: LanguageSlide[] = [
  { 
    image: require("../../assets/banner/DeskHRX.png"),
    url: "https://www.deskhrx.com/home/"
  },
  { 
    image: require("../../assets/banner/Loopwork.png"),
    url: "https://inspire-loopwork.com/landingpage"
  },
  { image: require("../../assets/banner/BuyCards.png") },
  { image: require("../../assets/banner/CryptoinIwallet.png") },
  { image: require("../../assets/banner/DepositviaCrypto.png") },
  { image: require("../../assets/banner/ChangeLanguage.png") },
];
```

### Touch Handler Logic

The TouchableOpacity onPress handler implements conditional navigation:

```typescript
onPress={() => {
  if (slide.url) {
    Linking.openURL(slide.url).catch(err => {
      console.error("Failed to open URL:", err);
      // Graceful degradation: could show alert or fallback
    });
  } else {
    navigation.navigate("Crypto");
  }
}}
```

### API Usage

- **React Native Linking API**: Already imported in the file, provides `openURL()` method
- **Navigation API**: Existing `navigation.navigate()` for internal routing
- **Error Handling**: Promise catch block prevents crashes on URL open failures

## Data Models

### LanguageSlide Interface

```typescript
interface LanguageSlide {
  image: any;      // Image asset from require()
  url?: string;    // Optional external URL (https://...)
}
```

### Configuration Data

```typescript
const EXTERNAL_URLS = {
  LOOPWORK: "https://inspire-loopwork.com/landingpage",
  DESKHRX: "https://www.deskhrx.com/home/",
} as const;
```

This constant can be defined for maintainability, though URLs can also be inline in the array.


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing the acceptance criteria, several redundancies were identified:
- Criteria 1.4 and 2.2 both test that slides without URLs navigate to "Crypto" - these are combined into Property 1
- Criteria 4.1-4.4 are all specific examples of the general property in 1.4/2.2 - covered by Property 1 and unit tests
- Criteria 3.1 and 3.2 are integration tests about carousel preservation, not universal properties - covered by unit tests

The following properties provide unique validation value:

### Property 1: Slides without URLs navigate internally

*For any* slide in the languageSlides array that does not have a url property, tapping that slide should trigger navigation to the "Crypto" route and should not attempt to open an external URL.

**Validates: Requirements 1.4, 2.2, 4.1, 4.2, 4.3, 4.4**

### Property 2: Slides with URLs open external links

*For any* slide in the languageSlides array that has a url property, tapping that slide should call Linking.openURL with the exact URL value from the slide's url property.

**Validates: Requirements 2.1, 2.3**

### Property 3: URL opening errors are handled gracefully

*For any* slide with a url property, if Linking.openURL fails (rejects), the application should catch the error and continue executing without crashing.

**Validates: Requirements 2.4**

### Property 4: Touch feedback is preserved

*For any* slide in the languageSlides array, the TouchableOpacity component should maintain its activeOpacity setting regardless of whether the slide has a url property.

**Validates: Requirements 3.3**

### Property 5: Scroll does not trigger tap actions

*For any* scroll gesture on the carousel, the onPress handlers of individual slides should not be triggered during the scroll motion.

**Validates: Requirements 3.4**

## Error Handling

### URL Opening Failures

When `Linking.openURL()` fails, the error is caught and logged:

```typescript
Linking.openURL(slide.url).catch(err => {
  console.error("Failed to open URL:", err);
  // Optional: Show user-facing alert
  // Alert.alert("Error", "Could not open link");
});
```

Possible failure scenarios:
- Invalid URL format
- Device restrictions (parental controls, MDM policies)
- No browser app available
- Network connectivity issues (for some URL schemes)

The catch block prevents app crashes and allows graceful degradation.

### Malformed URLs

The implementation assumes URLs in the configuration are valid HTTPS URLs. For production robustness, consider:

```typescript
const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// In onPress handler:
if (slide.url && isValidUrl(slide.url)) {
  Linking.openURL(slide.url).catch(err => {
    console.error("Failed to open URL:", err);
  });
}
```

### Navigation Failures

Internal navigation to "Crypto" route uses existing navigation infrastructure. If the route doesn't exist, React Navigation will throw an error. This is outside the scope of this feature but should be handled by global error boundaries.

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific banner configurations, carousel integration, and edge cases
- **Property tests**: Verify universal behaviors across all slides and URL handling

### Unit Testing

Unit tests should focus on:

1. **Specific Configuration Examples**
   - Loopwork banner has correct URL: "https://inspire-loopwork.com/landingpage"
   - DeskHRX banner has correct URL: "https://www.deskhrx.com/home/"
   - BuyCards, CryptoinIwallet, DepositviaCrypto, ChangeLanguage banners have no URL

2. **Integration Points**
   - Carousel scroll behavior unchanged
   - Pagination indicators update correctly
   - Image rendering works for all slides

3. **Edge Cases**
   - Empty languageSlides array
   - Single slide in array
   - Rapid tapping on slides

### Property-Based Testing

Property-based tests should use **fast-check** (for JavaScript/TypeScript) and run a minimum of 100 iterations per test.

Each property test must include a comment tag referencing the design property:

```typescript
// Feature: language-slides-clickable-links, Property 1: Slides without URLs navigate internally
test('slides without url property navigate to Crypto route', () => {
  fc.assert(
    fc.property(
      fc.array(fc.record({ image: fc.constant(mockImage), url: fc.constant(undefined) })),
      (slides) => {
        // Test that tapping any slide calls navigation.navigate("Crypto")
      }
    ),
    { numRuns: 100 }
  );
});
```

### Property Test Specifications

**Property 1: Slides without URLs navigate internally**
- Generator: Create arrays of slide objects without url property
- Action: Simulate tap on each slide
- Assertion: Verify navigation.navigate("Crypto") is called, Linking.openURL is not called

**Property 2: Slides with URLs open external links**
- Generator: Create arrays of slide objects with valid HTTPS URLs
- Action: Simulate tap on each slide
- Assertion: Verify Linking.openURL is called with the exact URL from the slide

**Property 3: URL opening errors are handled gracefully**
- Generator: Create slides with URLs, mock Linking.openURL to reject
- Action: Simulate tap on slides
- Assertion: Verify no uncaught exceptions, app continues running

**Property 4: Touch feedback is preserved**
- Generator: Create arrays of slides with and without URLs
- Action: Render TouchableOpacity components
- Assertion: Verify activeOpacity prop is set to 0.9 for all slides

**Property 5: Scroll does not trigger tap actions**
- Generator: Create scroll gestures with various velocities
- Action: Simulate scroll on carousel
- Assertion: Verify onPress handlers are not invoked during scroll

### Test Configuration

- **Framework**: Jest with React Native Testing Library
- **Property Testing Library**: fast-check
- **Minimum Iterations**: 100 per property test
- **Mocking**: Mock Linking.openURL and navigation.navigate for isolation
- **Coverage Target**: 100% of modified code paths

### Example Test Structure

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import fc from 'fast-check';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
}));

describe('Language Slides Clickable Links', () => {
  // Unit tests
  test('Loopwork banner has correct URL', () => {
    const loopworkSlide = languageSlides.find(s => 
      s.image === require("../../assets/banner/Loopwork.png")
    );
    expect(loopworkSlide?.url).toBe("https://inspire-loopwork.com/landingpage");
  });

  // Property tests
  // Feature: language-slides-clickable-links, Property 2: Slides with URLs open external links
  test('slides with url property open external links', () => {
    fc.assert(
      fc.property(
        fc.webUrl(),
        (url) => {
          const slide = { image: mockImage, url };
          // Render and tap slide
          // Assert Linking.openURL called with url
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

This dual approach ensures both specific requirements (unit tests) and general correctness (property tests) are validated.
