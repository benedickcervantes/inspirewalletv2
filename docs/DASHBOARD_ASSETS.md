# Dashboard – assets and files you can add

The Dashboard uses **React Navigation** (no Expo Router). After login or passcode, the app goes to **Main** (Dashboard).

## Card images (required for Wallet / Cards / Savings tabs)

These paths are **required** or the app will fail to bundle:

| Tab | Path |
|-----|------|
| Wallet & Cards | `assets/cards/default/card2.1.png` |
| Wallet & Cards | `assets/cards/default/card2.0 back.png` |
| Savings | `assets/cards/default/card2.0.png` |
| Cards – VIP | `assets/cards/vip/vip2/front.png` |
| Cards – VIP | `assets/cards/vip/vip4/front.png` |
| Cards – Design | `assets/cards/design/cd2/front.png` |

Create the folders `assets/cards/default/`, `assets/cards/vip/vip2/`, `assets/cards/vip/vip4/`, `assets/cards/design/cd2/` and add the corresponding images.

## Auth / splash

- **AuthLoader** (initial screen) uses `assets/images/InpireLogo.png` for the splash. For a custom loader, add `assets/images/inspireloader.png` and in `app/AuthLoader.jsx` change the `LOADER_IMAGE` require to use `inspireloader.png`.

## Other images (optional, for main Dashboard)

The main dashboard uses `assets/images/InpireLogo.png` as a placeholder for:

| Use | Path to add |
|-----|-------------|
| Partner banners | `assets/banner/Loopwork.png`, `assets/banner/HRX.png` |
| Language/crypto carousel | `assets/images/new1.png` … `new4.png` |
| Play and Earn menu icon | `assets/images/play crypto icon.png` |

In `main.jsx`, replace `PLACEHOLDER_IMG` and the `banners` / `languageSlides` / `menuItems` entries with `require('../../assets/...')` for these paths once the files exist.

## Firebase

- **Config:** `configs/firebase.js` is a stub (no real Firebase). When you add Firebase:
  - Set `auth`, `firestore`, and `storage` from your Firebase app.
  - Implement `subscribeToUser`, `subscribeToTransactions`, and `subscribeToNotifications` using Firestore `onSnapshot` (see comments in that file).
- **Auth:** With the stub, `auth.currentUser` is always `null`, so the Dashboard redirects to Welcome. After you connect Firebase and the user signs in, they will stay on the Dashboard.

## Screens opened from the Dashboard

These are registered as placeholder screens (they show “Coming soon”). Replace them with real screens when ready:

- Personal, Notification, Settings  
- Transfer, Bdo, Travel, History  
- Maya, Stockholder, Task, AgentRequest, PlayEarn, Crypto  

They are wired in `App.js`; swap `Placeholder` for your real components when you add them.
