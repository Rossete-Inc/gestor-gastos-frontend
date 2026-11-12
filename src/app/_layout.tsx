import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useIniciarSessao } from '@/features/auth';
import { queryClient } from '@/shared/api';
import { AvisosDoApp } from '@/shared/ui';

// Layout raiz: providers, o início da sessão e os avisos da PWA (sem conexão,
// versão nova). As guardas ficam nos layouts dos grupos (auth) e (app).
export default function RootLayout() {
  useIniciarSessao();
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <View style={styles.raiz}>
          <AvisosDoApp />
          <Stack screenOptions={{ headerShown: false }} />
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({ raiz: { flex: 1 } });
