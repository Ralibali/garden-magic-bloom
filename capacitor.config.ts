import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.odlingsdagboken.app',
  appName: 'Odlingsdagboken',
  webDir: 'dist-native',
  backgroundColor: '#FAF9F6',
  // Bundle the app. Never ship a development server URL or allowNavigation '*'.
  server: { androidScheme: 'https' },
  ios: { contentInset: 'never', backgroundColor: '#FAF9F6' },
  android: { backgroundColor: '#FAF9F6', allowMixedContent: false },
  plugins: {
    LocalNotifications: { smallIcon: 'ic_notification', iconColor: '#4A7C59' },
  },
};
export default config;
