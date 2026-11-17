import { router } from 'expo-router';

import { CartoesView } from '@/features/cartoes';
import { usePodeEscrever } from '@/features/colaboracao';

export default function Cartoes() {
  // Colaborador Leitor: sem cadastrar nem editar.
  const podeEscrever = usePodeEscrever();
  return (
    <CartoesView
      {...(podeEscrever && {
        onNovo: () => router.push('/cartoes/novo'),
        onEditar: (id: string) => router.push({ pathname: '/cartoes/[id]', params: { id } }),
      })}
      // A fatia do cartão é a lista de gastos do mês filtrada por ele.
      onAbrirFatura={(cartaoId, mes) =>
        router.navigate({ pathname: '/gastos', params: { mes, cartaoId } })
      }
    />
  );
}
