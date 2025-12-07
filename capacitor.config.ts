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
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '205344056886-ckkqqu7l4cslur15g59nj49qsq1s36fh.apps.googleusercontent.com',
      iosClientId: '205344056886-7alg2dj483ip8uige3lddn981bbpg46u.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  },
  ios: {
    scheme: 'qrafts'
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
