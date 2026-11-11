import { router } from 'expo-router';

import { GastoForm } from '@/features/lancamento-gastos';

// Aberta direto pela URL (web), não há tela anterior: volta à lista.
const voltar = () => (router.canGoBack() ? router.back() : router.replace('/gastos'));

export default function NovoGasto() {
  return <GastoForm onConcluido={voltar} onVoltar={voltar} />;
}
