import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/shared/api';
import { formatarCentavos, mesAtual, rotuloDoMes } from '@/shared/lib';
import { Banner, Button, Fab, Icon, MonthSelector, Screen, Text, tokens } from '@/shared/ui';

import { useTelaCartoes } from '../api/queries';
import { fracaoUsada, type ResumoCartao } from '../model/cartao';

type Props = {
  onNovo: () => void;
  onEditar: (id: string) => void;
  /** Abre os gastos da fatura do cartão no mês (spec, "Detalhe do cartão"). */
  onAbrirFatura: (id: string, mes: string) => void;
  mesInicial?: string;
};

// Aba Cartões (spec cartoes-credito, "Visão por cartão"): para o mês
// escolhido, a fatura de cada cartão, o vencimento e o limite usado e
// disponível hoje. Os arquivados ficam numa seção separada.
export function CartoesView({ onNovo, onEditar, onAbrirFatura, mesInicial }: Props) {
  const [mes, setMes] = useState(() => mesInicial ?? mesAtual());
  const tela = useTelaCartoes(mes);

  const ativos = tela.data?.cartoes.filter((r) => !r.cartao.arquivado) ?? [];
  const arquivados = tela.data?.cartoes.filter((r) => r.cartao.arquivado) ?? [];

  return (
    <Screen title="Cartões" overlay={<Fab label="Novo cartão" onPress={onNovo} />}>
      <MonthSelector mes={mes} onChange={setMes} />
      {tela.isPending ? (
        <Text color="textMuted" accessibilityRole="progressbar">
          Carregando cartões…
        </Text>
      ) : tela.isError ? (
        <>
          <Banner
            tone={tela.error instanceof ApiError && tela.error.status === 0 ? 'offline' : 'error'}
            message={
              tela.error instanceof ApiError
                ? tela.error.detail
                : 'Não foi possível carregar os cartões.'
            }
          />
          <Button label="Tentar de novo" variant="secondary" onPress={() => tela.refetch()} />
        </>
      ) : tela.data.cartoes.length === 0 ? (
        <Vazio onNovo={onNovo} />
      ) : (
        <>
          {ativos.map((r) => (
            <ItemCartao
              key={r.cartao.id}
              resumo={r}
              mes={mes}
              onAbrir={() => onAbrirFatura(r.cartao.id, mes)}
              onEditar={() => onEditar(r.cartao.id)}
            />
          ))}
          {arquivados.length > 0 && (
            <>
              <Text variant="label" color="textMuted" accessibilityRole="header">
                Arquivados
              </Text>
              {arquivados.map((r) => (
                <ItemCartao
                  key={r.cartao.id}
                  resumo={r}
                  mes={mes}
                  onAbrir={() => onAbrirFatura(r.cartao.id, mes)}
                  onEditar={() => onEditar(r.cartao.id)}
                />
              ))}
            </>
          )}
        </>
      )}
      {/* Espaço para o FAB não cobrir o último item. */}
      <View style={styles.folgaDoFab} />
    </Screen>
  );
}

function ItemCartao({
  resumo: r,
  mes,
  onAbrir,
  onEditar,
}: {
  resumo: ResumoCartao;
  mes: string;
  onAbrir: () => void;
  onEditar: () => void;
}) {
  const { cartao } = r;
  const fatura = formatarCentavos(r.faturaCentavos);
  const vencimento = `${r.vencimento.slice(8, 10)}/${r.vencimento.slice(5, 7)}`;
  const usado = formatarCentavos(r.limiteUsadoCentavos);
  const disponivel = formatarCentavos(r.limiteDisponivelCentavos);
  const estourado = r.limiteDisponivelCentavos < 0;
  return (
    <View style={[styles.cartao, cartao.arquivado && styles.arquivado]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${cartao.apelido}: fatura de ${rotuloDoMes(mes).toLowerCase()} ${fatura}, vence ${vencimento}, disponível ${disponivel}`}
        accessibilityHint="Abre os gastos desta fatura"
        onPress={onAbrir}
        style={styles.corpo}
      >
        <View style={styles.cabecalho}>
          {/* A cor é dado do cartão, não token de UI. */}
          <View style={[styles.bolinha, { backgroundColor: cartao.cor }]} />
          <Text variant="subtitle" numberOfLines={1} style={styles.apelido}>
            {cartao.apelido}
          </Text>
          <Text variant="subtitle" style={styles.fatura}>
            {fatura}
          </Text>
        </View>
        <Text variant="caption" color="textMuted">
          Fatura de {rotuloDoMes(mes).toLowerCase()} · vence {vencimento}
        </Text>
        <View
          style={styles.barra}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(fracaoUsada(r) * 100) }}
        >
          <View
            style={[
              styles.preenchido,
              {
                width: `${fracaoUsada(r) * 100}%`,
                backgroundColor: estourado ? tokens.color.danger : cartao.cor,
              },
            ]}
          />
        </View>
        <Text variant="caption" color={estourado ? 'danger' : 'textMuted'}>
          Limite usado {usado} · disponível {disponivel}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Editar ${cartao.apelido}`}
        onPress={onEditar}
        style={styles.editar}
      >
        <Icon name="edit" color="textMuted" />
      </Pressable>
    </View>
  );
}

// Cenário "Usuário sem cartões": estado vazio com atalho para cadastrar.
function Vazio({ onNovo }: { onNovo: () => void }) {
  return (
    <View style={styles.vazio}>
      <Icon name="credit-card" color="textSubtle" size={tokens.size.touch} />
      <Text color="textMuted" align="center">
        Cadastre seus cartões para ver a fatura e o limite de cada um.
      </Text>
      <Button label="Cadastrar cartão" icon="plus" onPress={onNovo} />
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.surface,
  },
  arquivado: { opacity: 0.6 },
  corpo: { flex: 1, gap: tokens.space.xs, padding: tokens.space.lg },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  bolinha: { width: tokens.space.md, height: tokens.space.md, borderRadius: tokens.radius.full },
  apelido: { flex: 1 },
  fatura: { fontWeight: tokens.font.weight.bold },
  barra: {
    height: tokens.space.xs,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.color.surfaceMuted,
    overflow: 'hidden',
  },
  preenchido: { height: '100%' },
  editar: {
    width: tokens.size.touch,
    height: tokens.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    margin: tokens.space.xs,
  },
  vazio: { alignItems: 'center', gap: tokens.space.md, paddingVertical: tokens.space.xxl },
  folgaDoFab: { height: tokens.size.touch + tokens.space.xl },
});
