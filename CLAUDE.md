# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Inspire Wallet is a React Native/Expo investment wallet application built for mobile platforms (iOS/Android). The app manages user investments, financial transactions, and provides a comprehensive dashboard for tracking investment performance.

## Development Commands

### Core Development
- `npm install` - Install dependencies
- `npx expo start` - Start development server
- `npm run android` - Run on Android emulator
- `npm run ios` - Run on iOS simulator
- `npm run web` - Run on web

### Testing & Quality
- `npm test` - Run Jest tests with watch mode
- `npm run lint` - Run Expo linter

### Build & Deploy
- Uses Expo Application Services (EAS) for builds
- Configuration in `eas.json`
- Project ID: 81d5c41e-b862-48d6-a14d-21246b09c564

## Project Architecture

### Core Technologies
- **Framework**: Expo SDK 52 with React Native 0.76
- **Navigation**: Expo Router with file-based routing
- **Database**: Firebase Firestore with real-time listeners
- **Authentication**: Firebase Auth with AsyncStorage persistence
- **Notifications**: Native Notify integration
- **State Management**: React hooks with real-time Firebase synchronization

### Key Directory Structure
- `app/` - File-based routing pages (login, main dashboard, settings, etc.)
- `components/` - Reusable UI components
- `services/` - Business logic and external service integrations
- `configs/` - Firebase and other configuration files
- `constants/` - App-wide constants including Colors theme
- `utils/` - Utility functions for language and RTL support
- `mobile/` - Mobile-specific components (chat functionality)

### Critical Architecture Patterns

#### Real-time Data Synchronization
The app uses extensive Firebase real-time listeners (`onSnapshot`) for:
- User data changes (available balance, time deposits)
- Investment profile updates and earnings calculations
- Transaction history
- Active card status
- Support message notifications

#### Investment Calculation Engine
Complex investment logic in `app/main/index.jsx`:
- Semi-annual investment cycles (6-month periods)
- Automated earnings calculations with 20% tax deduction
- Principal + earnings returns after 2-year terms
- Real-time cycle progression monitoring

#### Multi-language Support
- Uses `utils/languageUtils.js` for translations
- RTL language support via `utils/rtlUtils.js`
- Language preference stored in user document

#### Authentication Flow
- Login page (`app/index.jsx`) with passcode alternative
- AsyncStorage for credential persistence
- Maintenance mode support with developer bypass
- Presence monitoring via `services/presenceService.js`

### Firebase Integration

#### Collections Structure
- `users/{uid}` - Main user document with balances and settings
- `users/{uid}/investmentProfiles` - Individual investment deposits
- `users/{uid}/inspireAuto` - Auto-investment deposits
- `users/{uid}/transactions` - Transaction history
- `users/{uid}/purchasedCards` - User's wallet cards
- `users/{uid}/tickets` - Support/help center tickets

#### Real-time Updates
The main dashboard implements sophisticated real-time monitoring:
- Investment maturity detection and balance transfers
- Cycle-based earnings distribution
- Automatic deposit completion processing

### Mobile Chat System
- Enhanced chat functionality in `components/mobile/`
- Admin assignment and presence tracking
- File sharing and message delivery services
- Real-time communication with typing indicators

## Development Guidelines

### Component Patterns
- Use functional components with hooks
- Implement error boundaries for critical sections
- Follow the existing modal system (`components/ProfessionalModal.jsx`)
- Use `Colors` constants from `constants/Colors.jsx`

### Firebase Operations
- Always use try-catch blocks around Firebase operations
- Implement real-time listeners with proper cleanup
- Use Firebase's `increment()` for balance updates
- Handle offline persistence appropriately

### State Management
- Local state with useState for UI state
- Firebase real-time listeners for data synchronization
- AsyncStorage for user preferences and credentials

### Testing Considerations
- Jest is configured but test files are not currently present
- The app includes error handling and loading states
- Maintenance mode capability for app-wide control

## Environment Configuration

### Required Environment Variables
- `EXPO_PUBLIC_NATIVENOTIFY_API_KEY` - Native Notify API key for push notifications

### Firebase Configuration
- Pre-configured in `configs/firebase.js`
- Includes offline persistence and proper error handling
- Multiple authentication persistence options

## Notable Features

### Investment Auto-Update System
The app includes an automated system that:
- Monitors investment cycles in real-time
- Calculates and distributes earnings automatically
- Handles investment maturity and principal returns
- Updates user balances without manual intervention

### Adaptive UI
- Responsive design for tablets and different screen sizes
- Platform-specific UI adaptations (iOS blur effects, Android fallbacks)
- Keyboard-aware scrolling and input handling

### Security Features
- Passcode alternative to email/password login
- Presence monitoring for user activity tracking
- Rate limiting and security services
- Account deletion protection with confirmation modals

This is a production-ready financial application with complex real-time data flows and sophisticated investment calculation logic. Always test thoroughly when making changes to the investment or balance calculation systems.