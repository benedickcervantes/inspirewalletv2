# Metro Bundler Connection Error - Troubleshooting Guide

## Error Description
```
failed to connect to /192.168.1.56 (port 8081) from / 100.80.162.90 (port 57484) after 10000ms
```

This error occurs when your Android development build cannot connect to the Metro bundler server running on your development machine.

## Root Causes

1. **Metro bundler is not running** - The development server needs to be active
2. **Network mismatch** - Device and computer are on different networks
3. **Wrong IP address** - The IP address (192.168.1.56) may have changed
4. **Firewall blocking** - Port 8081 may be blocked
5. **Device using mobile data** - Device IP (100.80.162.90) suggests mobile data/VPN

## Immediate Solutions

### Solution 1: Start Metro Bundler (Most Common Fix)

1. **Open terminal in your project directory**
2. **Start the Metro bundler:**
   ```bash
   npm start
   ```
   or
   ```bash
   npx expo start
   ```

3. **Wait for Metro to start** - You should see:
   ```
   Metro waiting on exp://192.168.x.x:8081
   ```

4. **Reload the app** on your device (shake device → "Reload")

### Solution 2: Ensure Same Network Connection

**The device and your computer MUST be on the same Wi-Fi network.**

1. **Check your computer's IP address:**
   ```bash
   # On macOS/Linux:
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Or:
   ipconfig getifaddr en0
   ```

2. **Check your device's network:**
   - Go to Settings → Wi-Fi on your Android device
   - Ensure it's connected to the SAME Wi-Fi network as your computer
   - **Disable mobile data** if it's interfering

3. **If using mobile data or VPN:**
   - The device IP `100.80.162.90` suggests mobile data or VPN
   - Switch to Wi-Fi on the same network as your development machine

### Solution 3: Update IP Address in Metro

If your computer's IP changed:

1. **Find your current IP:**
   ```bash
   # macOS:
   ipconfig getifaddr en0
   
   # Or check in System Preferences → Network
   ```

2. **Start Metro with specific host:**
   ```bash
   npx expo start --host tunnel
   ```
   This uses Expo's tunnel feature (slower but works across networks)

   OR

   ```bash
   npx expo start --host lan
   ```
   This uses your local network IP

3. **Alternative - Use tunnel mode:**
   ```bash
   npx expo start --tunnel
   ```
   Works even if device and computer are on different networks (requires internet)

### Solution 4: Check Firewall Settings

**On macOS:**
1. System Preferences → Security & Privacy → Firewall
2. Ensure Node.js/Metro is allowed through firewall
3. Or temporarily disable firewall to test

**On Windows:**
1. Windows Defender Firewall → Allow an app
2. Add Node.js to allowed apps
3. Ensure port 8081 is open

### Solution 5: Use Expo Dev Client Menu

1. **Shake your device** or press `Cmd+M` (iOS) / `Cmd+D` (Android emulator)
2. **Select "Enter URL manually"**
3. **Enter your computer's IP address:**
   ```
   exp://YOUR_COMPUTER_IP:8081
   ```
   Example: `exp://192.168.1.56:8081`

### Solution 6: Clear and Restart Everything

If nothing works:

```bash
# 1. Kill all Metro processes
killall node

# 2. Clear all caches
npm run clear:all  # If this script exists
# Or manually:
rm -rf node_modules/.cache
rm -rf .expo
npx expo start --clear

# 3. Restart Metro
npm start
```

## Quick Diagnostic Commands

### Check if Metro is running:
```bash
lsof -i :8081
```

### Check your network IP:
```bash
# macOS:
ipconfig getifaddr en0

# Linux:
hostname -I | awk '{print $1}'

# Windows:
ipconfig | findstr IPv4
```

### Test connection from device:
- Open browser on device
- Navigate to: `http://YOUR_COMPUTER_IP:8081/status`
- Should see Metro status page

## Prevention Tips

1. **Always start Metro before opening the app**
2. **Keep device and computer on same Wi-Fi**
3. **Use `--tunnel` mode if networks differ**
4. **Bookmark your computer's IP address**
5. **Use `npm start` instead of building standalone APK for development**

## Alternative: Use Expo Go (Not Recommended for Dev Client)

If you're using Expo Dev Client (which you are), you cannot use Expo Go. You must:
- Build a development build: `npm run android`
- Start Metro bundler: `npm start`
- Connect device to same network

## Still Not Working?

1. **Check Metro logs** - Look for errors in terminal
2. **Try tunnel mode**: `npx expo start --tunnel`
3. **Rebuild the app**: `npm run android`
4. **Check AndroidManifest.xml** - Ensure `usesCleartextTraffic="true"` (already set ✓)
5. **Verify port 8081 is not in use**: `lsof -i :8081`

## Network Configuration

Your current setup shows:
- **Target IP**: 192.168.1.56 (your computer)
- **Device IP**: 100.80.162.90 (likely mobile data/VPN)
- **Port**: 8081 (Metro bundler default)

**Action Required**: Connect device to same Wi-Fi network as computer, or use `--tunnel` mode.
