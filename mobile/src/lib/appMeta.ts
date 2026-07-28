import Constants from 'expo-constants';

// Static app metadata surfaced in the Settings "About" section.

export const APP_VERSION = Constants.expoConfig?.version ?? '';

export const SUPPORT_EMAIL = 'hello@usecontraya.com';

export const HELP_URL = 'https://usecontraya.com/#faq';
export const TERMS_URL = 'https://usecontraya.com/terms';
export const PRIVACY_URL = 'https://usecontraya.com/privacy';

// Shared when the user taps "Share Contraya".
export const SHARE_MESSAGE =
  'Contraya reads your contracts, puts them in plain English, and reminds you before payments, renewals, and deadlines. https://usecontraya.com';
