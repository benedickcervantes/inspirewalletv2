const { withDangerousMod, withProjectBuildGradle, WarningAggregator } = require('@expo/config-plugins');

const DEFAULTS = {
  ndkVersion: '26.1.10909125',
  frescoVersion: '3.6.0',
  fbjniVersion: '0.7.0',
  mlkitBarcodeScanningVersion: '17.3.0',
};

function setOrReplaceNdkVersion(buildGradleContents, ndkVersion) {
  const replaced = buildGradleContents.replace(
    /^\s*ndkVersion\s*=\s*["'][^"']+["']\s*$/m,
    `        ndkVersion = "${ndkVersion}"`
  );
  if (replaced !== buildGradleContents) {
    return replaced;
  }

  // Fallback: insert into buildscript ext block if missing.
  const extBlockMatch = buildGradleContents.match(/buildscript\s*\{\s*[\s\S]*?ext\s*\{\s*/m);
  if (!extBlockMatch) {
    return buildGradleContents;
  }

  const insertAt = extBlockMatch.index + extBlockMatch[0].length;
  return (
    buildGradleContents.slice(0, insertAt) +
    `        ndkVersion = "${ndkVersion}"\n` +
    buildGradleContents.slice(insertAt)
  );
}

function ensureResolutionStrategy(buildGradleContents, versions) {
  const marker = '// 16KB_PAGE_SIZE_SUPPORT';
  if (buildGradleContents.includes(marker)) {
    return buildGradleContents;
  }

  const block = [
    `    ${marker}`,
    '    // Force dependency versions that ship 16KB-aligned native libraries.',
    '    configurations.all {',
    '        resolutionStrategy.eachDependency { details ->',
    `            if (details.requested.group == "com.facebook.fresco") {`,
    `                details.useVersion "${versions.frescoVersion}"`,
    '            }',
    `            if (details.requested.group == "com.facebook.fbjni" && details.requested.name == "fbjni") {`,
    `                details.useVersion "${versions.fbjniVersion}"`,
    '            }',
    `            if (details.requested.group == "com.google.mlkit" && details.requested.name == "barcode-scanning") {`,
    `                details.useVersion "${versions.mlkitBarcodeScanningVersion}"`,
    '            }',
    '        }',
    '    }',
    '',
  ].join('\n');

  const match = buildGradleContents.match(/^\s*allprojects\s*\{\s*$/m);
  if (!match || match.index == null) {
    return buildGradleContents;
  }

  const insertAt = match.index + match[0].length;
  return buildGradleContents.slice(0, insertAt) + '\n' + block + buildGradleContents.slice(insertAt);
}

function ensureCMakeLinkerFlags(contents) {
  const marker = '# 16KB_PAGE_SIZE_SUPPORT';
  if (contents.includes(marker)) {
    return contents;
  }

  const flagsLine =
    'add_link_options(-Wl,-z,max-page-size=16384 -Wl,-z,common-page-size=4096)';
  const insert = `${marker}\n${flagsLine}\n`;

  const hook = 'add_link_options(-Wl,--build-id)';
  if (contents.includes(hook)) {
    return contents.replace(hook, `${hook}\n${insert}`);
  }

  const projectMatch = contents.match(/project\([^)]+\)\s*/i);
  if (projectMatch && projectMatch.index != null) {
    const at = projectMatch.index + projectMatch[0].length;
    return contents.slice(0, at) + `\n${insert}` + contents.slice(at);
  }

  return `${insert}\n${contents}`;
}

const withAndroid16KbPageSizeSupport = (config, props = {}) => {
  const versions = {
    ndkVersion: props.ndkVersion ?? DEFAULTS.ndkVersion,
    frescoVersion: props.frescoVersion ?? DEFAULTS.frescoVersion,
    fbjniVersion: props.fbjniVersion ?? DEFAULTS.fbjniVersion,
    mlkitBarcodeScanningVersion:
      props.mlkitBarcodeScanningVersion ?? DEFAULTS.mlkitBarcodeScanningVersion,
  };

  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      WarningAggregator.addWarningAndroid(
        'withAndroid16KbPageSizeSupport',
        'Cannot automatically configure project build.gradle because it is not groovy.'
      );
      return config;
    }

    let contents = config.modResults.contents;
    contents = setOrReplaceNdkVersion(contents, versions.ndkVersion);
    contents = ensureResolutionStrategy(contents, versions);
    config.modResults.contents = contents;
    return config;
  });

  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const fs = require('fs');
      const path = require('path');

      const files = [
        // React Native core
        path.join(
          config._internal.projectRoot,
          'node_modules',
          'react-native',
          'ReactAndroid',
          'src',
          'main',
          'jni',
          'CMakeLists.txt'
        ),
        path.join(
          config._internal.projectRoot,
          'node_modules',
          'react-native',
          'ReactAndroid',
          'cmake-utils',
          'default-app-setup',
          'CMakeLists.txt'
        ),
        // Expo modules core
        path.join(
          config._internal.projectRoot,
          'node_modules',
          'expo-modules-core',
          'android',
          'CMakeLists.txt'
        ),
        path.join(
          config._internal.projectRoot,
          'node_modules',
          'expo-modules-core',
          'android',
          'src',
          'fabric',
          'CMakeLists.txt'
        ),
        // Reanimated
        path.join(
          config._internal.projectRoot,
          'node_modules',
          'react-native-reanimated',
          'android',
          'CMakeLists.txt'
        ),
        path.join(
          config._internal.projectRoot,
          'node_modules',
          'react-native-reanimated',
          'android',
          'src',
          'main',
          'cpp',
          'reanimated',
          'CMakeLists.txt'
        ),
        path.join(
          config._internal.projectRoot,
          'node_modules',
          'react-native-reanimated',
          'android',
          'src',
          'main',
          'cpp',
          'worklets',
          'CMakeLists.txt'
        ),
        // RNScreens
        path.join(
          config._internal.projectRoot,
          'node_modules',
          'react-native-screens',
          'android',
          'CMakeLists.txt'
        ),
        path.join(
          config._internal.projectRoot,
          'node_modules',
          'react-native-screens',
          'android',
          'src',
          'main',
          'jni',
          'CMakeLists.txt'
        ),
        // RNSkia
        path.join(
          config._internal.projectRoot,
          'node_modules',
          '@shopify',
          'react-native-skia',
          'android',
          'CMakeLists.txt'
        ),
      ];

      for (const file of files) {
        if (!fs.existsSync(file)) continue;
        const original = fs.readFileSync(file, 'utf8');
        const updated = ensureCMakeLinkerFlags(original);
        if (original !== updated) {
          fs.writeFileSync(file, updated);
        }
      }

      return config;
    },
  ]);

  return config;
};

module.exports = withAndroid16KbPageSizeSupport;
module.exports.default = withAndroid16KbPageSizeSupport;
