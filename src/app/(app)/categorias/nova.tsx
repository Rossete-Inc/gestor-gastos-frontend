import { router } from 'expo-router';

import { CategoriaForm } from '@/features/categorias';

const voltar = () => (router.canGoBack() ? router.back() : router.replace('/categorias'));

export default function NovaCategoria() {
  return <CategoriaForm onCriada={voltar} onVoltar={voltar} />;
}
