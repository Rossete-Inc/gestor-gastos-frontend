import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, Select, tokens } from '@/shared/ui';

import { contasAlheias, useContas, useTrocarConta } from '../api/queries';
import { useContaAtiva, useSincronizarConta } from '../hooks/useContaAtiva';
import { contaAtiva } from '../model/contaAtiva';

const PROPRIA = '';

type Props = {
  /** Abre a tela de convites recebidos. */
  onConvites: () => void;
  /** Depois de trocar de conta (spec: leva ao painel). */
  onTrocou: () => void;
};

// Abaixo do título das abas (spec colaboracao, "Seletor de conta"): o aviso
// de acesso terminado, o seletor (só com mais de uma conta) e o aviso de
// convites pendentes.
export function BarraDaConta({ onConvites, onTrocou }: Props) {
  const contas = useContas();
  const ativa = useContaAtiva();
  const trocar = useTrocarConta();

  const alheias = useMemo(
    () => (contas.data ? contasAlheias(contas.data.contas) : undefined),
    [contas.data],
  );
  useSincronizarConta(alheias);

  const convites = contas.data?.convites.length ?? 0;
  const escolher = async (donoId: string) => {
    await trocar(alheias?.find((c) => c.donoId === donoId) ?? null);
    onTrocou();
  };

  if (!ativa.acessoPerdido && !alheias?.length && convites === 0) return null;

  return (
    <View style={styles.barra}>
      {ativa.acessoPerdido && (
        <View style={styles.aviso}>
          <Banner
            tone="error"
            message={`Seu acesso à conta de ${ativa.acessoPerdido} terminou. Você voltou para a sua conta.`}
          />
          <Button label="Ok" variant="ghost" onPress={contaAtiva.dispensarAviso} />
        </View>
      )}
      {alheias && alheias.length > 0 && (
        <Select
          label="Conta"
          valor={ativa.conta?.donoId ?? PROPRIA}
          secoes={[
            {
              opcoes: [
                { valor: PROPRIA, label: 'Minha conta' },
                ...alheias.map((c) => ({
                  valor: c.donoId,
                  label: `Conta de ${c.nomeDono}${c.papel === 'LEITOR' ? ' (só leitura)' : ''}`,
                })),
              ],
            },
          ]}
          onChange={(v) => void escolher(v)}
        />
      )}
      {convites > 0 && (
        <Button
          label={convites === 1 ? 'Você tem 1 convite' : `Você tem ${convites} convites`}
          icon="mail"
          variant="secondary"
          onPress={onConvites}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  barra: { gap: tokens.space.sm, paddingBottom: tokens.space.sm },
  aviso: { gap: tokens.space.xs },
});
