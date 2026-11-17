import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatarDataLonga } from '@/shared/lib';
import { Banner, Button, Carregando, Icon, Screen, Text, tokens } from '@/shared/ui';

import { useAceitarConvite, useContas, useRecusarConvite } from '../api/queries';
import { ROTULO_DO_PAPEL, mensagemDeErro, tomDoErro } from '../model/colaboracao';

type Props = {
  onVoltar: () => void;
  /** Depois de aceitar: a conta do dono já está ativa (spec, "Aceitar"). */
  onAceito: () => void;
};

// Convites recebidos (spec colaboracao, "Aceitar ou recusar convite"): os
// convites pendentes para o e-mail da conta, sem notificação por e-mail.
export function ConvitesView({ onVoltar, onAceito }: Props) {
  const contas = useContas();
  const aceitar = useAceitarConvite(onAceito);
  const recusar = useRecusarConvite();
  const [respondendo, setRespondendo] = useState<string | null>(null);

  if (contas.isPending) return <Carregando label="Carregando convites…" />;

  const erro = aceitar.error ?? recusar.error;
  const convites = contas.data?.convites ?? [];

  return (
    <Screen title="Convites" onBack={onVoltar}>
      {contas.isError ? (
        <>
          <Banner
            tone={tomDoErro(contas.error)}
            message={mensagemDeErro(contas.error, 'Não foi possível carregar os convites.')}
          />
          <Button label="Tentar de novo" variant="secondary" onPress={() => contas.refetch()} />
        </>
      ) : convites.length === 0 ? (
        <View style={styles.vazio}>
          <Icon name="inbox" color="textSubtle" size={tokens.size.touch} />
          <Text color="textMuted" align="center">
            Nenhum convite pendente.
          </Text>
        </View>
      ) : (
        <>
          {erro && (
            <Banner
              tone={tomDoErro(erro)}
              message={mensagemDeErro(erro, 'Não foi possível responder.')}
            />
          )}
          {convites.map((c) => (
            <View key={c.donoId} style={styles.cartao}>
              <Text variant="subtitle">{`Conta de ${c.nomeDono}`}</Text>
              <Text color="textMuted">
                {c.papel === 'EDITOR'
                  ? 'Como Editor, você lança, edita e exclui gastos, cartões e categorias.'
                  : 'Como Leitor, você só consulta.'}
              </Text>
              <Text variant="caption" color="textMuted">
                {`${ROTULO_DO_PAPEL[c.papel]} · convite de ${formatarDataLonga(c.criadoEm)}`}
              </Text>
              <View style={styles.acoes}>
                <Button
                  label="Aceitar"
                  loading={aceitar.isPending && respondendo === c.donoId}
                  disabled={respondendo !== null}
                  onPress={() => {
                    setRespondendo(c.donoId);
                    aceitar.mutate(c.donoId, { onSettled: () => setRespondendo(null) });
                  }}
                />
                <Button
                  label="Recusar"
                  variant="secondary"
                  loading={recusar.isPending && respondendo === c.donoId}
                  disabled={respondendo !== null}
                  onPress={() => {
                    setRespondendo(c.donoId);
                    recusar.mutate(c.donoId, { onSettled: () => setRespondendo(null) });
                  }}
                />
              </View>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  vazio: { alignItems: 'center', gap: tokens.space.md, paddingVertical: tokens.space.xxl },
  cartao: {
    gap: tokens.space.sm,
    padding: tokens.space.xl,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.surface,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  acoes: { gap: tokens.space.sm, marginTop: tokens.space.sm },
});
