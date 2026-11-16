import { router } from 'expo-router';

import { CartoesView } from '@/features/cartoes';

export default function Cartoes() {
  return (
    <CartoesView
      onNovo={() => router.push('/cartoes/novo')}
      onEditar={(id) => router.push({ pathname: '/cartoes/[id]', params: { id } })}
      // A fatia do cartão é a lista de gastos do mês filtrada por ele.
      onAbrirFatura={(cartaoId, mes) =>
        router.navigate({ pathname: '/gastos', params: { mes, cartaoId } })
      }
    />
  );
}
