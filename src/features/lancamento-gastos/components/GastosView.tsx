import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/shared/api';
import { formatarCentavos, mesAtual, rotuloDoDia, rotuloDoMes } from '@/shared/lib';
import {
  Banner,
  Button,
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
  agruparPorDia,
  type CategoriasPorGrupo,
  type FiltroGrupo,
  type Gasto,
} from '../model/gasto';

type Props = {
  onNovo: () => void;
  onAbrir: (id: string) => void;
  /** Mês aberto ao entrar; padrão é o mês corrente no fuso do dispositivo. */
  mesInicial?: string;
};

const TODAS = '';

// Tela Gastos (spec lancamento-gastos, "Listagem de gastos"): mês, filtros
// por grupo e categoria, lista do mais recente para o mais antigo agrupada
// por dia e paginação por "Carregar mais".
export function GastosView({ onNovo, onAbrir, mesInicial }: Props) {
  const [mes, setMes] = useState(() => mesInicial ?? mesAtual());
  const [grupo, setGrupo] = useState<FiltroGrupo>('TODOS');
  const [categoriaId, setCategoriaId] = useState(TODAS);

  const gastos = useTelaGastos({
    mes,
    ...(grupo !== 'TODOS' ? { grupo } : {}),
    ...(categoriaId ? { categoriaId } : {}),
  });

  // As categorias vêm com a página e não mudam com o filtro.
  const categorias = gastos.data?.pages[0]?.categorias;
  const itens = gastos.data?.pages.flatMap((p) => p.itens) ?? [];

  const trocarGrupo = (g: FiltroGrupo) => {
    setGrupo(g);
    // Categoria de outro grupo não combina com o filtro novo.
    if (g !== 'TODOS' && categorias && !categorias[g].some((c) => c.id === categoriaId)) {
      setCategoriaId(TODAS);
    }
  };

  return (
    <Screen title="Gastos" overlay={<Fab label="Novo gasto" onPress={onNovo} />}>
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
        <Vazio mes={mes} filtrado={grupo !== 'TODOS' || !!categoriaId} onNovo={onNovo} />
      ) : (
        <>
          {agruparPorDia(itens).map((dia) => (
            <View key={dia.data} style={styles.dia}>
              <Text variant="label" color="textMuted" accessibilityRole="header">
                {rotuloDoDia(dia.data)}
              </Text>
              <View style={styles.lista}>
                {dia.gastos.map((g) => (
                  <ItemGasto key={g.id} gasto={g} onPress={() => onAbrir(g.id)} />
                ))}
              </View>
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

function ItemGasto({ gasto, onPress }: { gasto: Gasto; onPress: () => void }) {
  const titulo = gasto.descricao || gasto.categoria.nome;
  const detalhe = gasto.recorrente ? `${gasto.categoria.nome} · recorrente` : gasto.categoria.nome;
  const valor = formatarCentavos(gasto.valorCentavos);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${titulo}, ${detalhe}, ${valor}`}
      accessibilityHint="Abre o gasto para editar ou excluir"
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.pressionado]}
    >
      {/* Ícone e fundo na cor da categoria (dado, não token): 13% de opacidade no fundo. */}
      <View style={[styles.icone, { backgroundColor: `${gasto.categoria.cor}22` }]}>
        <Icon
          name={gasto.grupo === 'FIXO' ? 'repeat' : 'credit-card'}
          colorValue={gasto.categoria.cor}
          size={tokens.size.iconSm}
        />
      </View>
      <View style={styles.textos}>
        <Text variant="body" numberOfLines={1} style={styles.titulo}>
          {titulo}
        </Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {detalhe}
        </Text>
      </View>
      <Text variant="body" style={styles.valor}>
        {valor}
      </Text>
    </Pressable>
  );
}

// Cenário "Mês sem gastos": estado vazio com atalho para lançar um gasto.
function Vazio({ mes, filtrado, onNovo }: { mes: string; filtrado: boolean; onNovo: () => void }) {
  return (
    <View style={styles.vazio}>
      <Icon name="inbox" color="textSubtle" size={tokens.size.touch} />
      <Text color="textMuted" align="center">
        {filtrado
          ? `Nenhum gasto com esses filtros em ${rotuloDoMes(mes).toLowerCase()}.`
          : `Nenhum gasto em ${rotuloDoMes(mes).toLowerCase()}.`}
      </Text>
      <Button label="Lançar gasto" icon="plus" onPress={onNovo} />
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
  lista: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.surface,
    overflow: 'hidden',
  },
  item: {
    minHeight: tokens.size.touch + tokens.space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.border,
  },
  pressionado: { backgroundColor: tokens.color.surfaceMuted },
  icone: {
    width: tokens.size.touch - tokens.space.sm,
    height: tokens.size.touch - tokens.space.sm,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, gap: tokens.space.xxs },
  titulo: { fontWeight: tokens.font.weight.semibold },
  valor: { fontWeight: tokens.font.weight.bold },
  vazio: { alignItems: 'center', gap: tokens.space.md, paddingVertical: tokens.space.xxl },
  folgaDoFab: { height: tokens.size.touch + tokens.space.xl },
});
