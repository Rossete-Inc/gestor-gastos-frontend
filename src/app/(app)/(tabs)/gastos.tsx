import { router } from 'expo-router';

import { GastosView } from '@/features/lancamento-gastos';

export default function Gastos() {
  return (
    <GastosView
      onNovo={() => router.push('/gastos/novo')}
      onAbrir={(id) => router.push({ pathname: '/gastos/[id]', params: { id } })}
    />
  );
}
