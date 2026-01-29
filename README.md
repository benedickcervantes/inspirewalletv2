# Inspire Wallet 💸

A modern mobile wallet application built with React Native and Expo, featuring secure money transfers, QR code payments, and multi-currency support.

## ✨ Latest Feature: QR Code Transfer

**NEW!** Send and receive money by simply scanning QR codes - just like GCash and PayMaya!

- 🔲 Generate your personal QR code
- 📷 Scan others' QR codes to send money
- ⚡ Complete transfers in under 10 seconds
- 🔒 Secure and validated transactions

[📖 Read the full QR Transfer documentation →](./QR_COMPLETE_SUMMARY.md)

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## 🎯 Key Features

### 💳 Transfer Money
- Traditional account number transfers
- **NEW: QR Code transfers** - Scan and send instantly
- Available Balance and Agent Wallet support
- Real-time balance updates
- Transaction history

### 🔲 QR Code Payments
- Generate personal QR codes for receiving money
- Scan QR codes to send money quickly
- Share QR codes via any messaging app
- Secure validation and verification

### 💰 Financial Management
- Multiple balance types (Available Balance, Agent Wallet)
- Deposit and withdrawal
- Transaction history and receipts
- Email and push notifications

### 🔐 Security
- Secure authentication
- Transaction logging
- Balance validation
- Self-transfer prevention
- Encrypted communications

## 📱 QR Transfer Quick Start

### Receive Money:
1. Go to Transfer page
2. Tap "My QR"
3. Share your QR code
4. Done!

### Send Money:
1. Go to Transfer page
2. Tap "Scan QR"
3. Point camera at QR code
4. Enter amount
5. Confirm and send!

## 📚 Documentation

- [QR Transfer Complete Guide](./QR_COMPLETE_SUMMARY.md)
- [User Guide](./QR_TRANSFER_USER_GUIDE.md)
- [Technical Documentation](./QR_TRANSFER_FEATURE.md)
- [Visual Flow Diagrams](./QR_VISUAL_FLOW.md)
- [Deployment Checklist](./QR_DEPLOYMENT_CHECKLIST.md)

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## 🛠️ Tech Stack

- **Framework**: React Native + Expo
- **Routing**: Expo Router (File-based)
- **Backend**: Firebase (Firestore, Auth)
- **Notifications**: EmailJS + Native Notify
- **QR Codes**: react-native-qrcode-svg
- **Camera**: expo-camera
- **State Management**: React Hooks

## 📦 Dependencies

### Core
- React Native 0.76.9
- Expo SDK ~52.0
- Firebase 11.4.0

### Features
- `expo-camera` - QR code scanning
- `react-native-qrcode-svg` - QR code generation
- `expo-sharing` - Share functionality
- `react-native-view-shot` - Screenshots
- `expo-linking` - Deep linking

## 🚀 Recent Updates

### Version 2.1.7
- ✨ **NEW**: QR Code Transfer feature
- 📷 Camera-based QR scanning
- 🔲 QR code generation and sharing
- ⚡ Quick 3-step transfer flow
- 🔗 Deep linking support
- 📧 Enhanced notifications

## 🧪 Testing

### Test QR Feature:
```bash
# Start development server
npx expo start

# Test on device
# Press 'a' for Android or 'i' for iOS
```

### Manual Testing:
1. Generate QR code on Device A
2. Scan QR code with Device B
3. Complete transfer
4. Verify balance updates
5. Check notifications

## 📱 Supported Platforms

- ✅ Android 5.0+ (API 21+)
- ✅ iOS 12.0+
- ✅ Camera required for QR scanning
- ✅ Internet connection required

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
# inspirewallet
