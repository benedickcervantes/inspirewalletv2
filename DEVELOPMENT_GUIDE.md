# Development Guide - Inspire Wallet

## 🐛 Problema na Na-fix

Nakita namin ang mga sumusunod na problema at naayos na:

1. **Hindi nakikita ang code updates** - Entry point conflict na naayos
2. **Walang logs sa terminal** - Logging configuration na-enable na
3. **App nagblink at hindi nag-oopen pag rerun** - Cache clearing scripts naidagdag

## 🚀 Paano Gamitin

### Starting the Development Server

#### Normal Start (with cache clearing)
```bash
npm start
```

#### Development Mode with Debug Logs
```bash
npm run start:dev
```
Ito ay magpapakita ng mas detailed logs sa terminal.

#### Platform-specific Start
```bash
npm run start:android  # Para sa Android
npm run start:ios      # Para sa iOS
```

### Clearing Caches (Kapag may problema)

Kung hindi nagre-reflect ang changes o nag-crash ang app:

```bash
npm run clear:all
```

O kaya:
```bash
npm run reset:cache
```

Ito ay mag-clear ng:
- Metro bundler cache
- Expo cache
- Android build cache
- iOS build cache
- Watchman cache

### Rebuilding the App

Kung may malalaking changes o hindi pa rin gumagana:

#### Android
```bash
npm run clean:android
npm run android
```

#### iOS
```bash
cd ios && pod install && cd ..
npm run ios
```

## 📝 Logging

### Sa Development Mode

Lahat ng `console.log()`, `console.warn()`, at `console.error()` ay makikita sa:
- **Terminal** - kung saan mo nirun ang `npm start`
- **Metro Bundler** - sa terminal output
- **React Native Debugger** - kung naka-enable

### Paano Mag-log

```javascript
// Simple log
console.log('User logged in:', user.email);

// Warning
console.warn('API response is slow');

// Error
console.error('Failed to fetch data:', error);
```

## 🔧 Troubleshooting

### Problem: Hindi nagre-reflect ang code changes

**Solution:**
1. Clear cache: `npm run clear:all`
2. Restart Metro: Stop at restart `npm start`
3. Reload app: Shake device → "Reload" o press `r` sa terminal

### Problem: App nagblink at hindi nag-oopen

**Solution:**
1. Clear all caches: `npm run clear:all`
2. Uninstall app sa device/emulator
3. Rebuild: `npm run android` o `npm run ios`
4. Reinstall app

### Problem: Walang logs sa terminal

**Solution:**
1. Gamitin ang `npm run start:dev` para sa debug mode
2. Check kung naka-enable ang Metro bundler
3. Tiyakin na naka-connect ang device/emulator

### Problem: Metro bundler hindi nag-start

**Solution:**
```bash
# Kill all Metro processes
killall node

# Clear cache
npm run clear:all

# Restart
npm start
```

## 📱 Development Client

Ang app ay gumagamit ng **Expo Dev Client**. Ibig sabihin:

- Kailangan mo ng development build (hindi Expo Go)
- Build muna: `npm run android` o `npm run ios`
- Pagkatapos, pwede na ang hot reload

## 🎯 Best Practices

1. **Always use `npm start` with `--clear` flag** - Para sa fresh start
2. **Clear cache regularly** - Lalo na pag may malalaking changes
3. **Check terminal logs** - Para makita ang errors at warnings
4. **Use `start:dev` for debugging** - Para sa mas detailed logs
5. **Rebuild pag may native changes** - Changes sa `app.json`, plugins, etc.

## 🔍 Quick Commands Reference

```bash
# Start development
npm start                    # Normal start with cache clear
npm run start:dev           # With debug logs
npm run start:android      # Android specific
npm run start:ios          # iOS specific

# Cache management
npm run clear:all           # Clear all caches
npm run reset:cache        # Same as clear:all

# Building
npm run android             # Build and run Android
npm run ios                 # Build and run iOS
npm run clean:android      # Clean Android build

# Other
npm run lint                # Check code quality
npm test                    # Run tests
```

## 💡 Tips

- **Hot Reload**: Automatic pag may code changes (sa development mode)
- **Fast Refresh**: React component updates na hindi nawawala ang state
- **Manual Reload**: Shake device → "Reload" o press `r` sa terminal
- **Debug Menu**: Shake device → "Debug" para sa developer menu

---

**Note**: Lahat ng changes ay dapat makita agad sa development mode. Kung hindi, clear cache at restart.
