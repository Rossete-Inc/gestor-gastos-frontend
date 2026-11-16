import { router, useLocalSearchParams } from 'expo-router';

import { GastosView } from '@/features/lancamento-gastos';

export default function Gastos() {
  // "Ver todos" do painel abre a lista no mês que estava no painel, e a
  // fatura da aba Cartões, no mês e no cartão. A key remonta a tela quando
  // eles mudam, já que a aba pode estar montada.
  const { mes, cartaoId } = useLocalSearchParams<{ mes?: string; cartaoId?: string }>();
  return (
    <GastosView
      key={`${mes ?? 'atual'}|${cartaoId ?? ''}`}
      {...(mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? { mesInicial: mes } : {})}
      {...(cartaoId ? { cartaoInicial: cartaoId } : {})}
      onNovo={() => router.push('/gastos/novo')}
      onAbrir={(id) => router.push({ pathname: '/gastos/[id]', params: { id } })}
    />
  );
}
