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
      backgroundColor: '#04193E',
    },
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#04193E',
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
  // Expo project id: NOT for EAS builds (those stay banned; Xcode only). The
  // push service needs it or getExpoPushTokenAsync silently never mints a
  // token and the reminder cron has nobody to send to (the trap MovePact
  // hit). Set EXPO_PUBLIC_EXPO_PROJECT_ID in mobile/.env once the project
  // exists on expo.dev under the erubero1 account.
  extra: {
    eas: {
      projectId: process.env.EXPO_PUBLIC_EXPO_PROJECT_ID || undefined,
    },
  },
  experiments: {
    typedRoutes: true,
  },
});
