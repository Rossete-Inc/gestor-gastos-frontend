import { StyleSheet, View } from 'react-native';

import { useSair } from '@/features/auth';
import { ApiError } from '@/shared/api';
import { formatarDataLonga } from '@/shared/lib';
import { Badge, Banner, Button, Carregando, MenuItem, Screen, Text, tokens } from '@/shared/ui';

import { usePerfil } from '../api/queries';

const papeis = { admin: 'Administrador', cliente: 'Cliente' } as const;

type Props = {
  /** Abre Categorias. Até o painel com abas (fatia 4), o acesso fica aqui. */
  onCategorias: () => void;
  /** Abre a área de administração; o item só aparece para admin. */
  onUsuarios: () => void;
};

// Tela Perfil (spec gestao-usuarios, "Ver perfil"): nome, e-mail, papel e
// data de criação, com a ação de sair.
export function PerfilView({ onCategorias, onUsuarios }: Props) {
  const perfil = usePerfil();
  const sair = useSair();

  if (perfil.isPending) return <Carregando label="Carregando perfil…" />;

  return (
    <Screen title="Perfil">
      {perfil.isError ? (
        <>
          <Banner
            tone={
              perfil.error instanceof ApiError && perfil.error.status === 0 ? 'offline' : 'error'
            }
            message={
              perfil.error instanceof ApiError
                ? perfil.error.detail
                : 'Não foi possível carregar o perfil.'
            }
          />
          <Button label="Tentar de novo" variant="secondary" onPress={() => perfil.refetch()} />
        </>
      ) : (
        <View style={styles.cartao}>
          <Text variant="title">{perfil.data.nome}</Text>
          <Text color="textMuted">{perfil.data.email}</Text>
          <Badge
            label={papeis[perfil.data.papel]}
            tone={perfil.data.papel === 'admin' ? 'brand' : 'neutral'}
          />
          <Text variant="caption" color="textMuted">
            Membro desde {formatarDataLonga(perfil.data.criadoEm)}
          </Text>
        </View>
      )}
      <MenuItem label="Categorias" icon="tag" onPress={onCategorias} />
      {/* Spec gestao-usuarios, "Navegação por papel": cliente não vê a área. */}
      {perfil.data?.papel === 'admin' && (
        <MenuItem label="Usuários" icon="users" onPress={onUsuarios} />
      )}
      <MenuItem label="Sair" icon="log-out" danger onPress={() => sair.mutate()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cartao: {
    gap: tokens.space.sm,
    padding: tokens.space.xl,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.surface,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
});
