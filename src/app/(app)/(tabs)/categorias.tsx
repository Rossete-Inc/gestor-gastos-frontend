import { router } from 'expo-router';

import { CategoriasView } from '@/features/categorias';

// Aba, como na referência: sem voltar.
export default function Categorias() {
  return <CategoriasView onNova={() => router.push('/categorias/nova')} />;
}
