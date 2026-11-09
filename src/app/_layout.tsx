import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useIniciarSessao } from '@/features/auth';
import { queryClient } from '@/shared/api';

// Layout raiz: providers e o início da sessão. As guardas ficam nos layouts
// dos grupos (auth) e (app).
export default function RootLayout() {
  useIniciarSessao();
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
