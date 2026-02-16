# Inspire Wallet v3 (Frontend)

Expo React Native app — development with **Expo Go** (no custom dev client).

## Prerequisites

- Node.js 18+
- [Expo Go](https://expo.dev/go) on your phone (Android / iOS)
- Same Wi‑Fi for your PC and phone (or use tunnel)

## Run in development (Expo Go)

```bash
npm start
```

Then:

- **Phone:** Scan the QR code with Expo Go (Android) or the Camera app (iOS).
- **Web:** Press `w` in the terminal.
- **Android emulator:** Press `a`.
- **iOS simulator (macOS only):** Press `i`.

If the QR code doesn’t connect (e.g. different network), use tunnel:

```bash
npx expo start --tunnel
```

## Project layout

- **Expo Router** — file-based routing (see `app/`).
- **TypeScript** — enabled by default.
- **Scripts:** `npm run android`, `npm run ios`, `npm run web`, `npm run lint`.

This project is intended for **development with Expo Go** only (no production/dev build profiles).
