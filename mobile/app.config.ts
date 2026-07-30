import { ExpoConfig, ConfigContext } from 'expo/config';

// Contraya mobile app (iOS + Android) built with Expo. Native ios/ and android/
// folders are generated on prebuild, so this is the single source of config.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Contraya',
  slug: 'contraya',
  owner: 'erubero1',
  scheme: 'contraya',
  // Must match the Version field in App Store Connect string for string. ASC
  // creates the record as "1.0"; set it to 1.0.0 there so this archive is
  // selectable under it. A build whose CFBundleShortVersionString does not
  // match the store version simply never appears in the build picker.
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.contraya.app',
    // Xcode's "manage version and build number" auto-increments at export
    // (a lesson from Warraya): after every archive, check what actually
    // shipped and set this one above it. `version` above is the source of
    // truth for CFBundleShortVersionString; a version edited directly in
    // Xcode gets silently reverted on the next prebuild.
    buildNumber: '1',
    // Renovatio, LLC — bakes DEVELOPMENT_TEAM into the generated project so
    // Xcode never shows "requires a development team" after a prebuild.
    appleTeamId: 'DYR4YB9FVL',
    usesAppleSignIn: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.contraya.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#01132F',
    },
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#01132F',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Contraya uses your photos so you can add the pages of a contract.',
        cameraPermission: 'Contraya uses the camera to photograph contracts and documents.',
      },
    ],
    [
      'expo-notifications',
      {
        // Android tints the notification icon with this. Brand lime.
        color: '#a3e635',
      },
    ],
    './plugins/withCleanXcodeBuild',
  ],
  // No Expo services anywhere (owner rule): builds go through Xcode and push
  // goes straight to APNs (the reminder cron signs its own ES256 JWTs), so
  // there is deliberately no EAS/expo.dev project id in this config.
  experiments: {
    typedRoutes: true,
  },
});
