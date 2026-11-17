import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useMeuId } from '@/features/colaboracao';
import { ApiError } from '@/shared/api';
import { formatarCentavos, mesAtual, rotuloDoDia, rotuloDoMes } from '@/shared/lib';
import {
  Banner,
  Button,
  ExpenseItem,
  ExpenseList,
  Fab,
  Icon,
  MonthSelector,
  Screen,
  SegmentedControl,
  Select,
  Text,
  tokens,
  type SecaoSelect,
} from '@/shared/ui';

import { useTelaGastos } from '../api/queries';
import {
  FILTROS_DE_GRUPO,
  ROTULO_DO_GRUPO,
  SEM_CARTAO,
  agruparPorDia,
  autoria,
  type Cartao,
  type CategoriasPorGrupo,
  type FiltroGrupo,
  type Gasto,
  seloDaSerie,
} from '../model/gasto';

type Props = {
  /** Sem onNovo e onAbrir, a lista só mostra (colaborador Leitor). */
  onNovo?: () => void;
  onAbrir?: (id: string) => void;
  /** Mês aberto ao entrar; padrão é o mês corrente no fuso do dispositivo. */
  mesInicial?: string;
  /** Cartão filtrado ao entrar, como na fatura aberta pela aba Cartões. */
  cartaoInicial?: string;
};

const TODAS = '';
const TODOS_OS_CARTOES = '';
const TODAS_AS_PESSOAS = '';

// Tela Gastos (spec lancamento-gastos, "Listagem de gastos"): mês de
// referência, filtros por grupo, categoria e cartão, lista do mais recente
// para o mais antigo agrupada por dia e paginação por "Carregar mais".
export function GastosView({ onNovo, onAbrir, mesInicial, cartaoInicial }: Props) {
  const [mes, setMes] = useState(() => mesInicial ?? mesAtual());
  const [grupo, setGrupo] = useState<FiltroGrupo>('TODOS');
  const [categoriaId, setCategoriaId] = useState(TODAS);
  const [cartaoId, setCartaoId] = useState(cartaoInicial ?? TODOS_OS_CARTOES);
  const [autorId, setAutorId] = useState(TODAS_AS_PESSOAS);
  const meuId = useMeuId();

  const gastos = useTelaGastos({
    mes,
    ...(grupo !== 'TODOS' ? { grupo } : {}),
    ...(categoriaId ? { categoriaId } : {}),
    ...(cartaoId ? { cartaoId } : {}),
    ...(autorId ? { autorId } : {}),
  });

  // As categorias, os cartões e as pessoas vêm com a página e não mudam com
  // o filtro.
  const categorias = gastos.data?.pages[0]?.categorias;
  const cartoes = gastos.data?.pages[0]?.cartoes;
  const pessoas = gastos.data?.pages[0]?.pessoas;
  // A pessoa escolhida continua no filtro enquanto a página nova carrega.
  const [ultimasPessoas, setUltimasPessoas] = useState(pessoas);
  if (pessoas && pessoas !== ultimasPessoas) setUltimasPessoas(pessoas);
  const itens = gastos.data?.pages.flatMap((p) => p.itens) ?? [];

  const trocarGrupo = (g: FiltroGrupo) => {
    setGrupo(g);
    // Categoria de outro grupo não combina com o filtro novo.
    if (g !== 'TODOS' && categorias && !categorias[g].some((c) => c.id === categoriaId)) {
      setCategoriaId(TODAS);
    }
  };

  return (
    <Screen title="Gastos" overlay={onNovo && <Fab label="Novo gasto" onPress={onNovo} />}>
      <MonthSelector mes={mes} onChange={setMes} />
      <SegmentedControl
        label="Grupo"
        opcoes={FILTROS_DE_GRUPO}
        valor={grupo}
        onChange={trocarGrupo}
      />
      <Select
        label="Categoria"
        valor={categoriaId}
        secoes={secoesDoFiltro(categorias, grupo)}
        onChange={setCategoriaId}
      />
      <Select
        label="Cartão"
        valor={cartaoId}
        secoes={secoesDeCartao(cartoes, cartaoId)}
        onChange={setCartaoId}
      />
      {/* Filtro "Pessoa" só numa conta com colaboradores (spec colaboracao). */}
      {ultimasPessoas && ultimasPessoas.length > 1 && (
        <Select
          label="Pessoa"
          valor={autorId}
          secoes={[
            {
              opcoes: [
                { valor: TODAS_AS_PESSOAS, label: 'Todas as pessoas' },
                ...ultimasPessoas.map((p) => ({
                  valor: p.id,
                  label: p.id === meuId ? `${p.nome} (você)` : p.nome,
                })),
              ],
            },
          ]}
          onChange={setAutorId}
        />
      )}
      {gastos.isPending ? (
        <Text color="textMuted" accessibilityRole="progressbar">
          Carregando gastos…
        </Text>
      ) : !gastos.data ? (
        // Erro na primeira página. Erro numa página seguinte mantém a lista.
        <>
          <Banner tone={tomDoErro(gastos.error)} message={mensagem(gastos.error)} />
          <Button label="Tentar de novo" variant="secondary" onPress={() => gastos.refetch()} />
        </>
      ) : itens.length === 0 ? (
        <Vazio
          mes={mes}
          filtrado={grupo !== 'TODOS' || !!categoriaId || !!cartaoId || !!autorId}
          onNovo={onNovo}
        />
      ) : (
        <>
          {agruparPorDia(itens).map((dia) => (
            <View key={dia.data} style={styles.dia}>
              <Text variant="label" color="textMuted" accessibilityRole="header">
                {rotuloDoDia(dia.data)}
              </Text>
              <ExpenseList>
                {dia.gastos.map((g) => (
                  <ItemGasto
                    key={g.id}
                    gasto={g}
                    meuId={meuId}
                    {...(onAbrir ? { onPress: () => onAbrir(g.id) } : {})}
                  />
                ))}
              </ExpenseList>
            </View>
          ))}
          {gastos.isFetchNextPageError && (
            <>
              <Banner tone={tomDoErro(gastos.error)} message={mensagem(gastos.error)} />
              <Button
                label="Recarregar lista"
                variant="secondary"
                onPress={() => gastos.refetch()}
              />
            </>
          )}
          {gastos.hasNextPage && !gastos.isFetchNextPageError && (
            <Button
              label="Carregar mais"
              variant="secondary"
              loading={gastos.isFetchingNextPage}
              onPress={() => gastos.fetchNextPage()}
            />
          )}
        </>
      )}
      {/* Espaço para o FAB não cobrir o último item. */}
      <View style={styles.folgaDoFab} />
    </Screen>
  );
}

function secoesDoFiltro(cats: CategoriasPorGrupo | undefined, grupo: FiltroGrupo): SecaoSelect[] {
  const secoes: SecaoSelect[] = [{ opcoes: [{ valor: TODAS, label: 'Todas as categorias' }] }];
  if (!cats) return secoes;
  for (const g of ['CARTAO', 'FIXO'] as const) {
    if (grupo !== 'TODOS' && grupo !== g) continue;
    secoes.push({
      titulo: ROTULO_DO_GRUPO[g],
      opcoes: cats[g].map((c) => ({ valor: c.id, label: c.nome, cor: c.cor })),
    });
  }
  return secoes;
}

// Filtro de cartão: todos, sem cartão e cada cartão (os arquivados também,
// porque podem ter gastos no mês). Um cartão vindo da aba Cartões que ainda
// não chegou na lista aparece como "Cartão selecionado".
function secoesDeCartao(cartoes: readonly Cartao[] | undefined, atual: string): SecaoSelect[] {
  const opcoes = (cartoes ?? []).map((c) => ({
    valor: c.id,
    label: c.arquivado ? `${c.apelido} (arquivado)` : c.apelido,
    cor: c.cor,
  }));
  if (atual && atual !== SEM_CARTAO && !opcoes.some((o) => o.valor === atual)) {
    opcoes.push({ valor: atual, label: 'Cartão selecionado', cor: tokens.color.textSubtle });
  }
  return [
    {
      opcoes: [
        { valor: TODOS_OS_CARTOES, label: 'Todos os cartões' },
        { valor: SEM_CARTAO, label: 'Sem cartão' },
      ],
    },
    ...(opcoes.length > 0 ? [{ titulo: 'Cartões', opcoes }] : []),
  ];
}

function ItemGasto({
  gasto,
  meuId,
  onPress,
}: {
  gasto: Gasto;
  meuId: string | undefined;
  onPress?: () => void;
}) {
  const autor = autoria(gasto, meuId);
  const partes = [
    gasto.categoria.nome,
    ...(gasto.cartao ? [gasto.cartao.apelido] : []),
    // Na série, o selo ao lado do título já diz "Recorrente" ou "n/N".
    ...(gasto.recorrente && !gasto.serie ? ['recorrente'] : []),
    ...(autor ? [autor] : []),
  ];
  return (
    <ExpenseItem
      titulo={gasto.descricao || gasto.categoria.nome}
      detalhe={partes.join(' · ')}
      valor={formatarCentavos(gasto.valorCentavos)}
      cor={gasto.categoria.cor}
      icone={gasto.grupo === 'FIXO' ? 'repeat' : 'credit-card'}
      accessibilityHint="Abre o gasto para editar ou excluir"
      {...(onPress ? { onPress } : {})}
      selo={seloDaSerie(gasto.serie)}
    />
  );
}

// Cenário "Mês sem gastos": estado vazio com atalho para lançar um gasto.
function Vazio({ mes, filtrado, onNovo }: { mes: string; filtrado: boolean; onNovo?: () => void }) {
  return (
    <View style={styles.vazio}>
      <Icon name="inbox" color="textSubtle" size={tokens.size.touch} />
      <Text color="textMuted" align="center">
        {filtrado
          ? `Nenhum gasto com esses filtros em ${rotuloDoMes(mes).toLowerCase()}.`
          : `Nenhum gasto em ${rotuloDoMes(mes).toLowerCase()}.`}
      </Text>
      {onNovo && <Button label="Lançar gasto" icon="plus" onPress={onNovo} />}
    </View>
  );
}

const tomDoErro = (e: unknown) => (e instanceof ApiError && e.status === 0 ? 'offline' : 'error');

function mensagem(e: unknown): string {
  if (e instanceof ApiError && e.code === 'cursor_invalido') {
    return 'A lista mudou desde que você abriu. Recarregue para ver a versão atual.';
  }
  return e instanceof ApiError ? e.detail : 'Não foi possível carregar os gastos.';
}

const styles = StyleSheet.create({
  dia: { gap: tokens.space.sm },
  vazio: { alignItems: 'center', gap: tokens.space.md, paddingVertical: tokens.space.xxl },
  folgaDoFab: { height: tokens.size.touch + tokens.space.xl },
});
