import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.0ddcb352217041aba6843834ceb7ebb7',
  appName: 'qrafts',
  webDir: 'dist',
  server: {
    url: 'https://0ddcb352-2170-41ab-a684-3834ceb7ebb7.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    App: {
      // Deep link configuration for OAuth
      launchShowDuration: 0
    }
  },
  // iOS specific configuration
  ios: {
    scheme: 'qrafts'
  },
  // Android specific configuration  
  android: {
    allowMixedContent: true
  }
};

export default config;
