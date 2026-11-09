import { Redirect, router, useLocalSearchParams } from 'expo-router';

import { ConfirmarForm } from '@/features/auth';
import { Screen } from '@/shared/ui';

export default function Confirmar() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  if (!email) return <Redirect href="/login" />;
  return (
    <Screen centered>
      <ConfirmarForm
        email={email}
        onConfirmado={() =>
          router.replace({ pathname: '/login', params: { email, confirmada: '1' } })
        }
        onVoltar={() => router.replace('/login')}
      />
    </Screen>
  );
}
