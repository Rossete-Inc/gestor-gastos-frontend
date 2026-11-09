import { Redirect, Stack } from 'expo-router';

import { useSessao } from '@/features/auth';
import { Carregando } from '@/shared/ui';

// Guarda de autenticação: sem sessão, volta para o login. Também cobre o
// logout e a renovação expirada (spec, "Renovação expirada").
export default function AppLayout() {
  const { status } = useSessao();
  if (status === 'carregando') return <Carregando />;
  if (status === 'anonimo') return <Redirect href="/login" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
