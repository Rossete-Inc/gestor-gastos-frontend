import type { ReactNode } from 'react';

import { useEhAdmin } from '@/features/perfil';
import { Carregando } from '@/shared/ui';

type Props = {
  children: ReactNode;
  /** O que mostrar a quem não é admin, como um redirecionamento. */
  semAcesso: ReactNode;
};

// Guarda da área de administração (spec gestao-usuarios, "Navegação por
// papel"): o cliente não vê a área. É só navegação; quem decide o acesso é o
// BFF, que responde 403 a quem não está no grupo admin.
export function SomenteAdmin({ children, semAcesso }: Props) {
  const { carregando, admin } = useEhAdmin();
  if (carregando) return <Carregando />;
  return <>{admin ? children : semAcesso}</>;
}
