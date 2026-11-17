import { Redirect, router } from 'expo-router';

import { ColaboradoresView, useContaAtiva } from '@/features/colaboracao';

const voltar = () => (router.canGoBack() ? router.back() : router.replace('/perfil'));

// Gestão dos colaboradores: só do dono, na própria conta.
export default function Colaboradores() {
  const { propria } = useContaAtiva();
  if (!propria) return <Redirect href="/perfil" />;
  return <ColaboradoresView onVoltar={voltar} />;
}
