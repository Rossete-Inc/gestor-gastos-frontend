import { Redirect, Stack } from 'expo-router';

import { useSessao } from '@/features/auth';
import { useContaAtiva } from '@/features/colaboracao';
import { Carregando } from '@/shared/ui';

// Guarda de autenticação: sem sessão, volta para o login. Também cobre o
// logout e a renovação expirada (spec, "Renovação expirada").
export default function AppLayout() {
  const { status } = useSessao();
  // A conta guardada no dispositivo precisa estar lida antes da primeira
  // chamada, para o X-Conta já ir certo.
  const { carregada } = useContaAtiva();
  if (status === 'carregando' || !carregada) return <Carregando />;
  if (status === 'anonimo') return <Redirect href="/login" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
