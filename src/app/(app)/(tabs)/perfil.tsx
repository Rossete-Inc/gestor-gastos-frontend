import { router } from 'expo-router';

import { AcoesDaConta } from '@/features/colaboracao';
import { PerfilView } from '@/features/perfil';

export default function Perfil() {
  return (
    <PerfilView
      onCategorias={() => router.push('/categorias')}
      onUsuarios={() => router.push('/usuarios')}
      onAlterarSenha={() => router.push('/alterar-senha')}
      acoesDaConta={
        <AcoesDaConta
          onColaboradores={() => router.push('/colaboradores')}
          onConvites={() => router.push('/convites')}
          onSaiu={() => router.navigate('/painel')}
        />
      }
    />
  );
}
