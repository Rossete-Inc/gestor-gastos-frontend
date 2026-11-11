import { Redirect } from 'expo-router';

import { useSessao } from '@/features/auth';
import { Carregando } from '@/shared/ui';

// Entrada do app: manda para o login ou para o app conforme a sessão.
// Quem está logado abre no Painel (spec autenticacao, "Credenciais válidas").
export default function Inicio() {
  const { status } = useSessao();
  if (status === 'carregando') return <Carregando />;
  return <Redirect href={status === 'autenticado' ? '/painel' : '/login'} />;
}
