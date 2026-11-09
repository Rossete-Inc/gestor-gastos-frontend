import type { ConfigContext, ExpoConfig } from 'expo/config';

// Configuração do app. Valores de ambiente do front ficam em EXPO_PUBLIC_*,
// validados em src/shared/config. Nada aqui é segredo: tudo vai no bundle.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Gestor de Gastos',
  slug: 'gestor-gastos',
  scheme: 'gestorgastos',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: { supportsTablet: true },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
  },
  web: {
    // SPA servida como PWA (guardrails: trocar para "static" só com ADR).
    output: 'single',
    bundler: 'metro',
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-router'],
});
