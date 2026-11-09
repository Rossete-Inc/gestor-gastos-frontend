import { Stack } from 'expo-router';

// Layout raiz: só providers e infraestrutura. TanStack Query entra na 5.6;
// a guarda de autenticação fica no layout do grupo (app), na 5.7.
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
