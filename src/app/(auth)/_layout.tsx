import { Redirect, Stack } from 'expo-router';

import { useSessao } from '@/features/auth';
import { Carregando } from '@/shared/ui';

// Telas públicas. Quem já está logado vai direto para o app; é assim que o
// login bem-sucedido leva ao app.
export default function AuthLayout() {
  const { status } = useSessao();
  if (status === 'carregando') return <Carregando />;
  if (status === 'autenticado') return <Redirect href="/gastos" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
