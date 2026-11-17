import { router } from 'expo-router';

import { usePodeEscrever } from '@/features/colaboracao';
import { PainelView } from '@/features/dashboard';

export default function Painel() {
  // Colaborador Leitor: sem lançar nem abrir para editar.
  const podeEscrever = usePodeEscrever();
  return (
    <PainelView
      {...(podeEscrever && {
        onNovo: () => router.push('/gastos/novo'),
        onAbrir: (id: string) => router.push({ pathname: '/gastos/[id]', params: { id } }),
      })}
      onVerTodos={(mes) => router.navigate({ pathname: '/gastos', params: { mes } })}
    />
  );
}
