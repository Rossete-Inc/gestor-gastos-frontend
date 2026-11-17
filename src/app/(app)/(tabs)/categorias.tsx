import { router } from 'expo-router';

import { CategoriasView } from '@/features/categorias';
import { usePodeEscrever } from '@/features/colaboracao';

// Aba, como na referência: sem voltar. Colaborador Leitor: sem criar nem
// excluir.
export default function Categorias() {
  const podeEscrever = usePodeEscrever();
  return (
    <CategoriasView {...(podeEscrever && { onNova: () => router.push('/categorias/nova') })} />
  );
}
