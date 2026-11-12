import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { usePerfil } from '@/features/perfil';
import {
  ActionSheet,
  Banner,
  Button,
  Carregando,
  ConfirmDialog,
  Screen,
  Text,
  UserList,
  UserRow,
  tokens,
} from '@/shared/ui';

import { useAtualizarUsuario, useExcluirUsuario, useTelaUsuarios } from '../api/queries';
import {
  PAPEIS,
  STATUS,
  acoesPara,
  mensagemDeErro,
  tomDoErro,
  type Acao,
  type Usuario,
} from '../model/usuario';

type Props = { onVoltar?: () => void };

// Tela Usuários (spec gestao-usuarios): lista paginada do mais novo para o
// mais antigo; tocar numa pessoa abre as ações (bloquear ou reativar, trocar
// o papel, excluir), cada uma com confirmação.
export function UsuariosView({ onVoltar }: Props) {
  const usuarios = useTelaUsuarios();
  const eu = usePerfil();
  const atualizar = useAtualizarUsuario();
  const excluir = useExcluirUsuario();
  const [selecionado, setSelecionado] = useState<Usuario | null>(null);
  const [pendente, setPendente] = useState<{ usuario: Usuario; acao: Acao } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  if (usuarios.isPending) return <Carregando label="Carregando usuários…" />;

  const erroDaAcao = atualizar.error ?? excluir.error;
  const executando = atualizar.isPending || excluir.isPending;

  const escolher = (acao: Acao) => {
    if (!selecionado) return;
    setPendente({ usuario: selecionado, acao });
    setSelecionado(null);
  };

  const confirmar = () => {
    if (!pendente) return;
    const { usuario, acao } = pendente;
    atualizar.reset();
    excluir.reset();
    setAviso(null);
    const fim = { onSettled: () => setPendente(null) };
    if (acao.patch) {
      atualizar.mutate(
        { id: usuario.id, patch: acao.patch },
        {
          ...fim,
          onSuccess: () => setAviso(`${usuario.nome}: ${acao.label.toLowerCase()} feito.`),
        },
      );
    } else {
      excluir.mutate(usuario.id, {
        ...fim,
        onSuccess: () => setAviso(`A conta de ${usuario.nome} foi excluída.`),
      });
    }
  };

  const lista = usuarios.data?.pages.flatMap((p) => p.itens) ?? [];

  return (
    <Screen title="Usuários" onBack={onVoltar}>
      {usuarios.isError && !usuarios.data ? (
        <>
          <Banner tone={tomDoErro(usuarios.error)} message={mensagemDeErro(usuarios.error)} />
          <Button label="Tentar de novo" variant="secondary" onPress={() => usuarios.refetch()} />
        </>
      ) : (
        <>
          <Text color="textMuted">Toque numa pessoa para bloquear, trocar o papel ou excluir.</Text>
          {erroDaAcao && (
            <Banner tone={tomDoErro(erroDaAcao)} message={mensagemDeErro(erroDaAcao)} />
          )}
          {aviso && !erroDaAcao && <Banner tone="success" message={aviso} />}
          {lista.length === 0 ? (
            <Text color="textMuted">Nenhum usuário cadastrado.</Text>
          ) : (
            <UserList>
              {lista.map((u) => (
                <UserRow
                  key={u.id}
                  nome={u.id === eu.data?.id ? `${u.nome} (você)` : u.nome}
                  email={u.email}
                  papel={PAPEIS[u.papel]}
                  status={STATUS[u.status]}
                  accessibilityHint="Abre as ações da conta"
                  onPress={() => setSelecionado(u)}
                />
              ))}
            </UserList>
          )}
          {usuarios.isFetchNextPageError && (
            <View style={styles.erroPagina}>
              <Banner tone={tomDoErro(usuarios.error)} message={mensagemDeErro(usuarios.error)} />
              <Button label="Recarregar" variant="secondary" onPress={() => usuarios.refetch()} />
            </View>
          )}
          {usuarios.hasNextPage && !usuarios.isFetchNextPageError && (
            <Button
              label="Carregar mais"
              variant="secondary"
              loading={usuarios.isFetchingNextPage}
              onPress={() => usuarios.fetchNextPage()}
            />
          )}
        </>
      )}
      <ActionSheet
        visible={selecionado !== null}
        title={selecionado?.nome ?? ''}
        subtitle={selecionado?.email}
        acoes={
          selecionado
            ? acoesPara(selecionado, eu.data?.id).map((a) => ({
                label: a.label,
                danger: a.danger,
                onPress: () => escolher(a),
              }))
            : []
        }
        onCancel={() => setSelecionado(null)}
      />
      <ConfirmDialog
        visible={pendente !== null}
        title={pendente ? pendente.acao.titulo(pendente.usuario.nome) : ''}
        message={pendente?.acao.mensagem ?? ''}
        confirmLabel={pendente?.acao.confirmar ?? ''}
        confirmVariant={pendente?.acao.danger === false ? 'primary' : 'danger'}
        loading={executando}
        onConfirm={confirmar}
        onCancel={() => setPendente(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  erroPagina: { gap: tokens.space.sm },
});
