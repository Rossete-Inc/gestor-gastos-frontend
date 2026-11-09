import { router } from 'expo-router';

import { CadastroForm } from '@/features/auth';
import { Screen } from '@/shared/ui';

export default function Cadastro() {
  return (
    <Screen centered>
      <CadastroForm
        onCadastrado={(email) => router.replace({ pathname: '/confirmar', params: { email } })}
        onJaTenhoConta={() => router.replace('/login')}
      />
    </Screen>
  );
}
