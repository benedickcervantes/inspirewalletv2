#!/usr/bin/env node

/**
 * Script to clear all caches and reset the development environment
 * This helps fix issues with hot reload, app crashes, and stale builds
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 Clearing all caches and resetting development environment...\n');

const projectRoot = path.resolve(__dirname, '..');

// Directories and files to clean
const cleanPaths = [
  path.join(projectRoot, 'node_modules', '.cache'),
  path.join(projectRoot, '.expo'),
  path.join(projectRoot, '.expo-shared'),
  path.join(projectRoot, 'android', 'app', 'build'),
  path.join(projectRoot, 'android', '.gradle'),
  path.join(projectRoot, 'ios', 'build'),
  path.join(projectRoot, 'ios', 'Pods'),
  path.join(projectRoot, 'ios', 'Podfile.lock'),
];

console.log('📦 Clearing caches...');
cleanPaths.forEach((cleanPath) => {
  if (fs.existsSync(cleanPath)) {
    try {
      if (fs.statSync(cleanPath).isDirectory()) {
        fs.rmSync(cleanPath, { recursive: true, force: true });
        console.log(`  ✓ Removed: ${path.relative(projectRoot, cleanPath)}`);
      } else {
        fs.unlinkSync(cleanPath);
        console.log(`  ✓ Removed: ${path.relative(projectRoot, cleanPath)}`);
      }
    } catch (error) {
      console.log(`  ⚠ Could not remove: ${path.relative(projectRoot, cleanPath)} - ${error.message}`);
    }
  }
});

// Clear Metro bundler cache
console.log('\n🚇 Clearing Metro bundler cache...');
try {
  execSync('npx expo start --clear', { stdio: 'inherit', cwd: projectRoot });
} catch (error) {
  console.log('  ⚠ Metro cache clear command failed (this is okay if Metro is not running)');
}

// Clear watchman (if installed)
console.log('\n👀 Clearing Watchman cache...');
try {
  execSync('watchman watch-del-all', { stdio: 'inherit' });
  console.log('  ✓ Watchman cache cleared');
} catch (error) {
  console.log('  ℹ Watchman not installed or not running (this is okay)');
}

console.log('\n✅ Cache clearing complete!');
console.log('\n📝 Next steps:');
console.log('  1. Run: npm start (or npm run start:dev for debug logs)');
console.log('  2. If issues persist, rebuild the app:');
console.log('     - Android: npm run android');
console.log('     - iOS: npm run ios');
console.log('\n💡 Tip: Use "npm run start:dev" to see detailed logs in terminal\n');
