import { Redirect } from 'expo-router';

import { useSessao } from '@/features/auth';
import { Carregando } from '@/shared/ui';

// Entrada do app: manda para o login ou para o app conforme a sessão.
// O painel chega na fatia 4; até lá, quem está logado vai para o Perfil.
export default function Inicio() {
  const { status } = useSessao();
  if (status === 'carregando') return <Carregando />;
  return <Redirect href={status === 'autenticado' ? '/perfil' : '/login'} />;
}
