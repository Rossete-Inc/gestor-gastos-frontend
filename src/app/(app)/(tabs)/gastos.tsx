import { router, useLocalSearchParams } from 'expo-router';

import { GastosView } from '@/features/lancamento-gastos';

export default function Gastos() {
  // "Ver todos" do painel abre a lista no mês que estava no painel. A key
  // remonta a tela quando o mês muda, já que a aba pode estar montada.
  const { mes } = useLocalSearchParams<{ mes?: string }>();
  return (
    <GastosView
      key={mes ?? 'atual'}
      {...(mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? { mesInicial: mes } : {})}
      onNovo={() => router.push('/gastos/novo')}
      onAbrir={(id) => router.push({ pathname: '/gastos/[id]', params: { id } })}
    />
  );
}
