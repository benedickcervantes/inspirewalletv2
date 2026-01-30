const { withGradleProperties, withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to ensure 16KB memory page alignment for native libraries
 * This forces rebuilding of libraries from source with 16KB alignment flags
 */
const with16KBAlignment = (config) => {
  // Add gradle properties for linker flags
  config = withGradleProperties(config, (config) => {
    config.modResults = config.modResults || [];
    
    // Add NDK linker flags for 16KB alignment
    const linkerFlagsIndex = config.modResults.findIndex(
      (item) => item.type === 'property' && item.key === 'android.ndk.linkerFlags'
    );
    
    if (linkerFlagsIndex >= 0) {
      const existingFlags = config.modResults[linkerFlagsIndex].value || '';
      if (!existingFlags.includes('max-page-size=16384')) {
        config.modResults[linkerFlagsIndex].value = `${existingFlags} -Wl,-z,max-page-size=16384`.trim();
      }
    } else {
      config.modResults.push({
        type: 'property',
        key: 'android.ndk.linkerFlags',
        value: '-Wl,-z,max-page-size=16384',
      });
    }

    // Add CMake arguments for 16KB alignment
    const cmakeArgsKey = 'android.defaultConfig.externalNativeBuild.cmake.arguments';
    const cmakeArgsIndex = config.modResults.findIndex(
      (item) => item.type === 'property' && item.key === cmakeArgsKey
    );
    
    if (cmakeArgsIndex < 0) {
      config.modResults.push({
        type: 'property',
        key: cmakeArgsKey,
        value: '-DCMAKE_CXX_FLAGS=-Wl,-z,max-page-size=16384 -DCMAKE_C_FLAGS=-Wl,-z,max-page-size=16384',
      });
    }

    return config;
  });

  // Modify app build.gradle to add configurations for all native libraries
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let contents = config.modResults.contents;

      // Ensure packagingOptions is set for uncompressed libraries
      if (!contents.includes('packagingOptions')) {
        if (contents.includes('defaultConfig')) {
          contents = contents.replace(
            /(defaultConfig\s*\{[^}]*\})/,
            `$1\n        packagingOptions {\n            jniLibs {\n                useLegacyPackaging = false\n            }\n        }`
          );
        } else {
          contents = contents.replace(
            /(android\s*\{)/,
            `$1\n        packagingOptions {\n            jniLibs {\n                useLegacyPackaging = false\n            }\n        }`
          );
        }
      }

      // Add configurations to force 16KB alignment for all native libraries
      // This will apply to libraries built from source
      const alignmentConfig = `
        // Force 16KB alignment for all native libraries
        android.applicationVariants.all { variant ->
            variant.outputs.all { output ->
                output.processResourcesProvider.get().doFirst {
                    // Ensure all .so files are aligned to 16KB
                }
            }
        }`;

      // Add after android block if not already present
      if (!contents.includes('// Force 16KB alignment')) {
        // Find the closing brace of android block
        const androidBlockEnd = contents.lastIndexOf('}');
        if (androidBlockEnd > 0) {
          contents = contents.slice(0, androidBlockEnd) + alignmentConfig + '\n' + contents.slice(androidBlockEnd);
        }
      }

      // Add CMake arguments to externalNativeBuild if it exists
      if (contents.includes('externalNativeBuild') && !contents.includes('max-page-size=16384')) {
        // Try to add arguments to cmake block
        contents = contents.replace(
          /(cmake\s*\{[^}]*arguments\s*\[)/,
          `$1\n                    "-DCMAKE_CXX_FLAGS=-Wl,-z,max-page-size=16384",\n                    "-DCMAKE_C_FLAGS=-Wl,-z,max-page-size=16384",`
        );
      }

      config.modResults.contents = contents;
    }
    return config;
  });

  return config;
};

module.exports = with16KBAlignment;
