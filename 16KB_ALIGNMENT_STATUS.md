# 16KB Alignment Status

## Current Status
Some native libraries still have 4KB LOAD section alignment. These are **pre-built binaries** that cannot be changed post-build.

## Libraries with 4KB Alignment Issues

1. **`librnskia.so`** - From `@shopify/react-native-skia@1.12.4`
   - Status: Pre-built binary with 4KB alignment
   - Solution: Wait for library maintainer to release version compiled with 16KB alignment
   - Alternative: Rebuild from source if source code is available

2. **`libreanimated.so`** - From `react-native-reanimated@3.16.7`
   - Status: Pre-built binary with 4KB alignment
   - Solution: Wait for Expo SDK 53+ or react-native-reanimated 4.x compatible with Expo SDK 52
   - Note: Version 4.2.0 requires React 19, not compatible with Expo SDK 52

3. **`libworklets.so`** - From `react-native-reanimated@3.16.7`
   - Status: Pre-built binary with 4KB alignment
   - Same as above

4. **`libexpo-modules-core.so`** - From Expo SDK 52.0.27
   - Status: Pre-built binary with 4KB alignment
   - Solution: Wait for Expo SDK update or check if newer patch version exists

5. **`libbarhopper_v3.so`** - Likely from Google ML Kit (transitive dependency)
   - Status: Pre-built binary with 4KB alignment
   - Solution: Identify which package includes this and check for updates

## What We've Done

✅ Updated build configuration:
- AGP 8.7.2 (supports automatic alignment)
- NDK 28.0.12674087 (16KB alignment by default)
- `useLegacyPackaging: false` (uncompressed libraries)
- Added linker flags for libraries built from source
- Created config plugin for 16KB alignment

✅ Updated libraries:
- `@shopify/react-native-skia`: 1.11.2 → 1.12.4
- `react-native-reanimated`: 3.16.7 (compatible with Expo SDK 52)

## Limitations

**ELF LOAD segment alignment is set at compile time** and cannot be changed post-build. AGP 8.7.2 can align file offsets but not ELF LOAD segments.

## Next Steps

1. **Monitor for Updates**: Check regularly for:
   - `@shopify/react-native-skia` updates with 16KB support
   - `react-native-reanimated` updates compatible with Expo SDK 52
   - Expo SDK patches that include 16KB-aligned binaries

2. **Contact Library Maintainers**: If critical, contact maintainers to request 16KB-aligned versions

3. **Consider Alternatives**: For non-critical libraries, consider alternatives that support 16KB alignment

4. **Rebuild from Source** (Advanced): If source code is available, rebuild libraries with:
   ```bash
   -Wl,-z,max-page-size=16384
   ```

## Testing

After library updates, rebuild and verify:
```bash
eas build --platform preview -p android
```

Then analyze the APK in Android Studio to verify alignment.

