import { router, useLocalSearchParams } from 'expo-router';

import { CartaoForm } from '@/features/cartoes';

const voltar = () => (router.canGoBack() ? router.back() : router.replace('/cartoes'));

export default function EditarCartao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CartaoForm id={id} onConcluido={voltar} onVoltar={voltar} />;
}
