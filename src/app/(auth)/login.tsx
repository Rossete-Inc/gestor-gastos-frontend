import { router, useLocalSearchParams } from 'expo-router';

import { LoginForm } from '@/features/auth';
import { Screen } from '@/shared/ui';

export default function Login() {
  const { email, confirmada } = useLocalSearchParams<{ email?: string; confirmada?: string }>();
  return (
    <Screen centered>
      <LoginForm
        emailInicial={email}
        aviso={confirmada ? 'Conta confirmada. Entre com seu e-mail e senha.' : undefined}
        onNaoConfirmado={(e) => router.push({ pathname: '/confirmar', params: { email: e } })}
        onCriarConta={() => router.push('/cadastro')}
      />
    </Screen>
  );
}
