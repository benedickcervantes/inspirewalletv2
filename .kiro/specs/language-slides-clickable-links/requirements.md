# Requirements Document

## Introduction

This feature enables specific banner slides in the language slides carousel to open external URLs when tapped, rather than navigating to a fixed internal route. Currently, all slides in the languageSlides carousel navigate to the "Crypto" route. The Loopwork and DeskHRX banners need to open their respective external URLs instead.

## Glossary

- **Language_Slides_Carousel**: The horizontal scrollable carousel component displaying banner images in the Dashboard
- **Loopwork_Banner**: The banner image for Loopwork (Loopwork.png) in the languageSlides array
- **DeskHRX_Banner**: The banner image for DeskHRX (DeskHRX.png) in the languageSlides array
- **External_URL**: A web address that opens in the device's browser or web view
- **Slide_Item**: An individual banner image within the languageSlides array
- **Dashboard**: The main dashboard screen component (app/Dashboard/main.tsx)

## Requirements

### Requirement 1: Add URL Configuration to Language Slides

**User Story:** As a developer, I want to configure individual URLs for specific language slides, so that different banners can link to different destinations.

#### Acceptance Criteria

1. THE Dashboard SHALL extend the languageSlides array structure to include an optional url property for each Slide_Item
2. THE Loopwork_Banner SHALL have the url property set to "https://inspire-loopwork.com/landingpage"
3. THE DeskHRX_Banner SHALL have the url property set to "https://www.deskhrx.com/home/"
4. WHERE a Slide_Item does not have a url property, THE Dashboard SHALL maintain backward compatibility with existing behavior

### Requirement 2: Handle Banner Tap Events

**User Story:** As a user, I want to tap on the Loopwork or DeskHRX banners, so that I can visit their respective websites.

#### Acceptance Criteria

1. WHEN a user taps a Slide_Item with a url property, THE Dashboard SHALL open the External_URL in the device's browser
2. WHEN a user taps a Slide_Item without a url property, THE Dashboard SHALL navigate to the "Crypto" route
3. THE Dashboard SHALL use React Native's Linking API or expo-web-browser to open External_URLs
4. IF opening an External_URL fails, THEN THE Dashboard SHALL handle the error gracefully without crashing

### Requirement 3: Maintain Carousel Functionality

**User Story:** As a user, I want the carousel to continue working normally, so that I can scroll through all banners and tap them.

#### Acceptance Criteria

1. THE Language_Slides_Carousel SHALL preserve all existing scroll behavior
2. THE Language_Slides_Carousel SHALL preserve pagination indicator functionality
3. THE Language_Slides_Carousel SHALL preserve touch feedback (activeOpacity) for all Slide_Items
4. WHEN a user scrolls the carousel, THE Dashboard SHALL not trigger any tap actions

### Requirement 4: Preserve Non-Clickable Slides

**User Story:** As a user, I want other banner slides to continue navigating to the Crypto screen, so that existing functionality is not broken.

#### Acceptance Criteria

1. THE BuyCards banner SHALL continue to navigate to the "Crypto" route when tapped
2. THE CryptoinIwallet banner SHALL continue to navigate to the "Crypto" route when tapped
3. THE DepositviaCrypto banner SHALL continue to navigate to the "Crypto" route when tapped
4. THE ChangeLanguage banner SHALL continue to navigate to the "Crypto" route when tapped
