import type { CapacitorConfig } from '@capacitor/cli';

// The Android app loads the deployed web app, so both stay identical.
const config: CapacitorConfig = {
  appId: 'com.finreminder.app',
  appName: 'FinReminder',
  webDir: 'dist/frontend/browser',
  server: {
    url: 'https://app.narukullapati.com',
    cleartext: false,
  },
};

export default config;
