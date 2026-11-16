import { router, useLocalSearchParams } from 'expo-router';

import { EsqueciSenhaForm } from '@/features/auth';
import { Screen } from '@/shared/ui';

export default function EsqueciSenha() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  return (
    <Screen centered>
      <EsqueciSenhaForm
        emailInicial={email}
        onCodigoEnviado={(e) => router.push({ pathname: '/redefinir-senha', params: { email: e } })}
        onVoltar={() => router.replace('/login')}
      />
    </Screen>
  );
}
