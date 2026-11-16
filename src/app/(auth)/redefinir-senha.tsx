import { Redirect, router, useLocalSearchParams } from 'expo-router';

import { RedefinirSenhaForm } from '@/features/auth';
import { Screen } from '@/shared/ui';

export default function RedefinirSenha() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  if (!email) return <Redirect href="/esqueci-senha" />;
  return (
    <Screen centered>
      <RedefinirSenhaForm
        email={email}
        onRedefinida={() =>
          router.replace({ pathname: '/login', params: { email, senhaRedefinida: '1' } })
        }
        onVoltar={() => router.replace('/login')}
      />
    </Screen>
  );
}
