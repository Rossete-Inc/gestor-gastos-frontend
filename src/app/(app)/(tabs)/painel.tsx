import { router } from 'expo-router';

import { PainelView } from '@/features/dashboard';

export default function Painel() {
  return (
    <PainelView
      onNovo={() => router.push('/gastos/novo')}
      onAbrir={(id) => router.push({ pathname: '/gastos/[id]', params: { id } })}
      onVerTodos={(mes) => router.navigate({ pathname: '/gastos', params: { mes } })}
    />
  );
}
