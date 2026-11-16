import { router, useLocalSearchParams } from 'expo-router';

import { LoginForm } from '@/features/auth';
import { Screen } from '@/shared/ui';

type Params = {
  email?: string;
  confirmada?: string;
  senhaRedefinida?: string;
  senhaAlterada?: string;
};

function avisoDe({ confirmada, senhaRedefinida, senhaAlterada }: Params): string | undefined {
  if (confirmada) return 'Conta confirmada. Entre com seu e-mail e senha.';
  if (senhaRedefinida) return 'Senha redefinida. Entre com a nova senha.';
  if (senhaAlterada) return 'Sua senha foi alterada. Entre de novo com a nova senha.';
  return undefined;
}

export default function Login() {
  const params = useLocalSearchParams<Params>();
  return (
    <Screen centered>
      <LoginForm
        emailInicial={params.email}
        aviso={avisoDe(params)}
        onNaoConfirmado={(e) => router.push({ pathname: '/confirmar', params: { email: e } })}
        onCriarConta={() => router.push('/cadastro')}
        onEsqueciSenha={(e) => router.push({ pathname: '/esqueci-senha', params: { email: e } })}
      />
    </Screen>
  );
}
