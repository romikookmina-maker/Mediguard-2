import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mediguard.app',
  appName: 'MediGuard',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
