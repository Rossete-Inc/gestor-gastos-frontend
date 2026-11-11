import { router, useLocalSearchParams } from 'expo-router';

import { GastoForm } from '@/features/lancamento-gastos';

const voltar = () => (router.canGoBack() ? router.back() : router.replace('/gastos'));

export default function EditarGasto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <GastoForm id={id} onConcluido={voltar} onVoltar={voltar} />;
}
