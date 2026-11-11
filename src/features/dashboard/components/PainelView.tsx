import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/shared/api';
import { formatarCentavos, mesAtual } from '@/shared/lib';
import {
  Banner,
  Button,
  ExpenseItem,
  ExpenseList,
  Fab,
  Icon,
  LegendItem,
  MonthSelector,
  PieChart,
  Screen,
  SegmentedControl,
  SummaryCard,
  Text,
  tokens,
} from '@/shared/ui';

import { useTelaDashboard } from '../api/queries';
import {
  VISOES,
  diaMes,
  fatiasDaVisao,
  formatarPercentual,
  formatarReaisCompacto,
  totalDaVisao,
  type Fatia,
  type TelaDashboard,
  type Visao,
} from '../model/painel';

type Props = {
  onNovo: () => void;
  onAbrir: (id: string) => void;
  /** "Ver todos": a lista de gastos do mês aberto no painel. */
  onVerTodos: (mes: string) => void;
  /** Mês aberto ao entrar; padrão é o mês corrente no fuso do dispositivo. */
  mesInicial?: string;
};

// Painel (spec painel-gastos): mês selecionável, total do mês e por grupo,
// pizza por categoria com as visões Todos, Cartão e Fixo, e os 5 últimos
// lançamentos. Mês sem gastos troca o gráfico por um atalho para lançar.
export function PainelView({ onNovo, onAbrir, onVerTodos, mesInicial }: Props) {
  const [mes, setMes] = useState(() => mesInicial ?? mesAtual());
  const painel = useTelaDashboard(mes);

  return (
    <Screen title="Painel" overlay={<Fab label="Novo gasto" onPress={onNovo} />}>
      <MonthSelector mes={mes} onChange={setMes} />
      {painel.isPending ? (
        <Text color="textMuted" accessibilityRole="progressbar">
          Carregando painel…
        </Text>
      ) : painel.isError ? (
        <>
          <Banner tone={tomDoErro(painel.error)} message={mensagem(painel.error)} />
          <Button label="Tentar de novo" variant="secondary" onPress={() => painel.refetch()} />
        </>
      ) : (
        <Conteudo
          tela={painel.data}
          onNovo={onNovo}
          onAbrir={onAbrir}
          onVerTodos={() => onVerTodos(mes)}
        />
      )}
      {/* Espaço para o FAB não cobrir o último item. */}
      <View style={styles.folgaDoFab} />
    </Screen>
  );
}

function Conteudo({
  tela,
  onNovo,
  onAbrir,
  onVerTodos,
}: {
  tela: TelaDashboard;
  onNovo: () => void;
  onAbrir: (id: string) => void;
  onVerTodos: () => void;
}) {
  const vazio = tela.totalCentavos === 0;
  return (
    <>
      <SummaryCard destaque label="Total do mês" valor={formatarCentavos(tela.totalCentavos)} />
      <View style={styles.linha}>
        <SummaryCard label="Cartão" valor={formatarCentavos(totalDaVisao(tela, 'CARTAO'))} />
        <SummaryCard label="Fixos" valor={formatarCentavos(totalDaVisao(tela, 'FIXO'))} />
      </View>
      {vazio ? (
        <MesVazio onNovo={onNovo} />
      ) : (
        <>
          <PorCategoria tela={tela} />
          <View style={styles.cabecalhoUltimos}>
            <Text variant="subtitle" accessibilityRole="header">
              Últimos lançamentos
            </Text>
            <Button label="Ver todos" variant="ghost" onPress={onVerTodos} />
          </View>
          <ExpenseList>
            {tela.ultimos.map((g) => (
              <ExpenseItem
                key={g.id}
                titulo={g.descricao || g.categoria.nome}
                detalhe={`${g.categoria.nome} · ${diaMes(g.data)}`}
                valor={formatarCentavos(g.valorCentavos)}
                cor={g.categoria.cor}
                icone={g.grupo === 'FIXO' ? 'repeat' : 'credit-card'}
                accessibilityHint="Abre o gasto para editar ou excluir"
                onPress={() => onAbrir(g.id)}
              />
            ))}
          </ExpenseList>
        </>
      )}
    </>
  );
}

// Requirement "Gráfico de pizza por categoria": participação de cada
// categoria, com valor e percentual por fatia, na cor da categoria.
function PorCategoria({ tela }: { tela: TelaDashboard }) {
  const [visao, setVisao] = useState<Visao>('todas');
  const fatias = fatiasDaVisao(tela, visao);
  const total = totalDaVisao(tela, visao);
  const nomeDaVisao = VISOES.find((v) => v.valor === visao)!.label;

  return (
    <View style={styles.cartao}>
      <Text variant="subtitle" accessibilityRole="header">
        Por categoria
      </Text>
      <SegmentedControl
        label="Visão do gráfico"
        opcoes={VISOES}
        valor={visao}
        onChange={setVisao}
      />
      {fatias.length === 0 ? (
        <Text color="textMuted" align="center" style={styles.semFatias}>
          {visao === 'CARTAO'
            ? 'Nenhum gasto de cartão neste mês.'
            : 'Nenhum gasto fixo neste mês.'}
        </Text>
      ) : (
        <>
          <PieChart
            fatias={fatias.map((f) => ({
              chave: chaveDaFatia(f),
              valor: f.totalCentavos,
              cor: corDaFatia(f),
            }))}
            rotuloCentro="Total"
            valorCentro={formatarReaisCompacto(total)}
            accessibilityLabel={`Gráfico por categoria, ${nomeDaVisao.toLowerCase()}: total de ${formatarCentavos(total)}`}
          />
          <View style={styles.legenda}>
            {fatias.map((f) => (
              <LegendItem
                key={chaveDaFatia(f)}
                nome={f.nome}
                cor={corDaFatia(f)}
                percentual={formatarPercentual(f.percentualDecimos)}
                valor={formatarCentavos(f.totalCentavos)}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const chaveDaFatia = (f: Fatia) => f.categoriaId ?? f.grupo ?? f.nome;
// Fatias de categoria sempre trazem a cor; a de grupo não é usada nesta tela.
const corDaFatia = (f: Fatia) => f.cor ?? tokens.color.textSubtle;

// Requirement "Painel sem dados": totais zerados e, no lugar do gráfico, uma
// mensagem com atalho para lançar um gasto.
function MesVazio({ onNovo }: { onNovo: () => void }) {
  return (
    <View style={[styles.cartao, styles.vazio]}>
      <View style={styles.iconeVazio}>
        <Icon name="inbox" color="textSubtle" />
      </View>
      <Text variant="subtitle" align="center" accessibilityRole="header">
        Nenhum gasto neste mês
      </Text>
      <Text color="textMuted" align="center">
        Lance seu primeiro gasto para ver o gráfico por categoria.
      </Text>
      <Button label="Lançar gasto" onPress={onNovo} />
    </View>
  );
}

const tomDoErro = (e: unknown) => (e instanceof ApiError && e.status === 0 ? 'offline' : 'error');

const mensagem = (e: unknown) =>
  e instanceof ApiError ? e.detail : 'Não foi possível carregar o painel.';

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', gap: tokens.space.md },
  cartao: {
    gap: tokens.space.md,
    padding: tokens.space.lg,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.surface,
  },
  semFatias: { paddingVertical: tokens.space.xl },
  legenda: { gap: tokens.space.xs },
  cabecalhoUltimos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: tokens.space.sm,
  },
  vazio: { alignItems: 'center', paddingVertical: tokens.space.xl },
  iconeVazio: {
    width: tokens.size.touch + tokens.space.lg,
    height: tokens.size.touch + tokens.space.lg,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.color.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folgaDoFab: { height: tokens.size.touch + tokens.space.xl },
});
