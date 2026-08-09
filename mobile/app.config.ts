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
        // Contraya never records audio: the picker is images-only and nothing
        // in the app touches AV. The key is here anyway because the plugin
        // emits its stock "Allow $(PRODUCT_NAME) to access your microphone"
        // when this is unset, and a template purpose string is a documented
        // 5.1.1 rejection. Setting it to `false` is the wrong fix in the other
        // direction: image-picker's native code still references the audio
        // capture APIs, so deleting the key trades a review flag for an
        // ITMS-90683 at upload. An honest sentence is the only option that
        // fails neither way.
        microphonePermission:
          'Contraya does not record audio. iOS asks for this because the photo picker can also capture video.',
      },
    ],
    [
      'expo-calendar',
      {
        // FULL access, not write-only. iOS 17 write-only access lets an app
        // create events but NOT create, update or delete calendars, and
        // Contraya only ever writes into a calendar it creates itself. Under
        // write-only, reads come back empty, the reconcile degrades to
        // append-only, and every foreground would add another copy of every
        // event. deviceCalendar.fullAccessGranted() probes for that.
        //
        // This one string covers both models: the plugin writes it to
        // NSCalendarsUsageDescription (iOS 16 devices, and the deployment
        // target is 16.4) and NSCalendarsFullAccessUsageDescription (17+).
        calendarPermission:
          'Contraya adds your contract dates to a calendar it creates, so payments and deadlines show up alongside everything else.',
        // The plugin writes NSRemindersUsageDescription and
        // NSRemindersFullAccessUsageDescription with a stock string unless
        // told not to. Contraya never touches EKReminders, and shipping a
        // usage string for a capability the app does not use is a question
        // from App Review with no good answer. `false` deletes both keys.
        remindersPermission: false,
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
