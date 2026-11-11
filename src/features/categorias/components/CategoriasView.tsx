import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/shared/api';
import {
  Badge,
  Banner,
  Button,
  Carregando,
  ConfirmDialog,
  Icon,
  Screen,
  Text,
  tokens,
} from '@/shared/ui';

import { useCategorias, useExcluirCategoria } from '../api/queries';
import { GRUPOS, type Categoria } from '../model/categoria';

type Props = {
  onNova: () => void;
  onVoltar?: () => void;
};

// Tela Categorias (spec categorias): padrão e personalizadas por grupo; só as
// personalizadas podem ser excluídas, com confirmação.
export function CategoriasView({ onNova, onVoltar }: Props) {
  const categorias = useCategorias();
  const excluir = useExcluirCategoria();
  const [aExcluir, setAExcluir] = useState<Categoria | null>(null);

  if (categorias.isPending) return <Carregando label="Carregando categorias…" />;

  const confirmar = () => {
    if (!aExcluir) return;
    excluir.mutate(aExcluir.id, { onSettled: () => setAExcluir(null) });
  };

  return (
    <Screen title="Categorias" onBack={onVoltar}>
      {categorias.isError ? (
        <>
          <Banner tone={tomDoErro(categorias.error)} message={mensagem(categorias.error)} />
          <Button label="Tentar de novo" variant="secondary" onPress={() => categorias.refetch()} />
        </>
      ) : (
        <>
          <Text color="textMuted">
            As categorias padrão valem para todos. Crie as suas para organizar melhor.
          </Text>
          {excluir.isError && (
            <Banner tone={tomDoErro(excluir.error)} message={mensagem(excluir.error)} />
          )}
          {GRUPOS.map((g) => (
            <View key={g.valor} style={styles.grupo}>
              <Text
                variant="caption"
                color="textMuted"
                accessibilityRole="header"
                style={styles.tituloGrupo}
              >
                {g.label}
              </Text>
              <View style={styles.lista}>
                {categorias.data[g.valor].length === 0 ? (
                  <Text color="textMuted" style={styles.vazio}>
                    Nenhuma categoria neste grupo.
                  </Text>
                ) : (
                  categorias.data[g.valor].map((c) => (
                    <ItemCategoria key={c.id} categoria={c} onExcluir={() => setAExcluir(c)} />
                  ))
                )}
              </View>
            </View>
          ))}
          <Button label="Nova categoria" variant="secondary" onPress={onNova} />
        </>
      )}
      <ConfirmDialog
        visible={aExcluir !== null}
        title="Excluir categoria?"
        message={`"${aExcluir?.nome ?? ''}" deixa de aparecer nas suas categorias.`}
        confirmLabel="Excluir"
        loading={excluir.isPending}
        onConfirm={confirmar}
        onCancel={() => setAExcluir(null)}
      />
    </Screen>
  );
}

function ItemCategoria({ categoria, onExcluir }: { categoria: Categoria; onExcluir: () => void }) {
  return (
    <View style={styles.item}>
      {/* A cor é dado da categoria (a mesma da pizza), não um token de UI. */}
      <View style={[styles.cor, { backgroundColor: categoria.cor }]} />
      <Text style={styles.nome} numberOfLines={1}>
        {categoria.nome}
      </Text>
      {categoria.padrao ? (
        <Badge label="Padrão" style={styles.selo} />
      ) : (
        <>
          <Badge label="Personalizada" tone="brand" style={styles.selo} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Excluir ${categoria.nome}`}
            onPress={onExcluir}
            hitSlop={tokens.space.sm}
            style={styles.excluir}
          >
            <Icon name="trash" color="danger" size={tokens.size.iconSm} />
          </Pressable>
        </>
      )}
    </View>
  );
}

const tomDoErro = (e: unknown) => (e instanceof ApiError && e.status === 0 ? 'offline' : 'error');

function mensagem(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Não foi possível carregar as categorias.';
  if (e.code === 'categoria_em_uso') {
    return 'Esta categoria tem gastos vinculados e não pode ser excluída.';
  }
  return e.detail;
}

const styles = StyleSheet.create({
  grupo: { gap: tokens.space.sm },
  // Legenda do grupo em maiúsculas, como na tela de referência; o leitor de
  // tela continua lendo "Cartão" e "Fixo".
  tituloGrupo: { textTransform: 'uppercase', fontWeight: tokens.font.weight.medium },
  lista: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.surface,
    overflow: 'hidden',
  },
  item: {
    minHeight: tokens.size.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.border,
  },
  cor: { width: tokens.space.md, height: tokens.space.md, borderRadius: tokens.radius.full },
  nome: { flex: 1 },
  // O Badge alinha ao início por padrão; na linha, fica no meio da altura.
  selo: { alignSelf: 'center' },
  excluir: {
    width: tokens.size.touch,
    height: tokens.size.touch,
    marginRight: -tokens.space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vazio: { padding: tokens.space.lg },
});
