import { ElectronCapacitorConfig } from '@capacitor-community/electron';

const config: ElectronCapacitorConfig = {
  appId: 'tvts.desktop',
  appName: 'tvts-desktop',
  webDir: 'www',
  bundledWebRuntime: false,
  electron: {
    splashScreenEnabled: true,
    splashScreenImageName: 'splash2.gif',
    hideMainWindowOnLaunch: true,
  },
};

export default config;
