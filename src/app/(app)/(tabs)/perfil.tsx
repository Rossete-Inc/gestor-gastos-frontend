import { router } from 'expo-router';

import { PerfilView } from '@/features/perfil';

export default function Perfil() {
  return (
    <PerfilView
      onCategorias={() => router.push('/categorias')}
      onUsuarios={() => router.push('/usuarios')}
    />
  );
}
