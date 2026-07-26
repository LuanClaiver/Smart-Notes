import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.smartnotes.app',
  appName: 'Smart Notes',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
  },
}

export default config
