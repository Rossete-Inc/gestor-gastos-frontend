import { router } from 'expo-router';

import { AlterarSenhaForm } from '@/features/auth';

const voltar = () => (router.canGoBack() ? router.back() : router.replace('/perfil'));

export default function AlterarSenha() {
  return (
    <AlterarSenhaForm
      onVoltar={voltar}
      onSessaoEncerrada={() =>
        router.replace({ pathname: '/login', params: { senhaAlterada: '1' } })
      }
    />
  );
}
