import { router } from 'expo-router';

import { CategoriasView } from '@/features/categorias';

export default function Categorias() {
  return (
    <CategoriasView
      onNova={() => router.push('/categorias/nova')}
      // Aberta direto pela URL (web), não há tela anterior: volta ao Perfil.
      onVoltar={() => (router.canGoBack() ? router.back() : router.replace('/perfil'))}
    />
  );
}
