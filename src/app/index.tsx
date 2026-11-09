import { Screen, Text } from '@/shared/ui';
import { env } from '@/shared/config';

// Tela provisória: confirma que o app sobe e leu o ambiente. Na 5.7 esta rota
// passa a redirecionar para o login ou para o app.
export default function Inicio() {
  return (
    <Screen centered>
      <Text variant="title" align="center">
        Gestor de Gastos
      </Text>
      <Text color="textMuted" align="center">
        Ambiente: {env.appEnv} · API: {env.apiUrl}
      </Text>
    </Screen>
  );
}
