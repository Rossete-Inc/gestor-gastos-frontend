import { router } from 'expo-router';

import { CartaoForm } from '@/features/cartoes';

// Aberta direto pela URL (web), não há tela anterior: volta à aba Cartões.
const voltar = () => (router.canGoBack() ? router.back() : router.replace('/cartoes'));

export default function NovoCartao() {
  return <CartaoForm onConcluido={voltar} onVoltar={voltar} />;
}
