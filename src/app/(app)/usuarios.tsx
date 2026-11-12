import { Redirect, router } from 'expo-router';

import { SomenteAdmin, UsuariosView } from '@/features/admin';

const voltar = () => (router.canGoBack() ? router.back() : router.replace('/perfil'));

// Área de administração: quem não é admin volta para o painel.
export default function Usuarios() {
  return (
    <SomenteAdmin semAcesso={<Redirect href="/painel" />}>
      <UsuariosView onVoltar={voltar} />
    </SomenteAdmin>
  );
}
