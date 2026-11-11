import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { tokens } from './tokens';

// Componente ExpenseItem da referência: ícone na cor da categoria, título,
// detalhe e valor. Usado na lista de gastos e nos últimos lançamentos do
// painel; quem usa monta os textos.
type Props = {
  titulo: string;
  detalhe: string;
  /** Valor já formatado, como "R$ 45,90". */
  valor: string;
  /** Cor da categoria (dado, não token de UI). */
  cor: string;
  icone: IconName;
  onPress: () => void;
  accessibilityHint?: string;
};

export function ExpenseItem({
  titulo,
  detalhe,
  valor,
  cor,
  icone,
  onPress,
  accessibilityHint,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${titulo}, ${detalhe}, ${valor}`}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.pressionado]}
    >
      {/* Fundo na cor da categoria com 13% de opacidade. */}
      <View style={[styles.icone, { backgroundColor: `${cor}22` }]}>
        <Icon name={icone} colorValue={cor} size={tokens.size.iconSm} />
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

/** Moldura das listas de ExpenseItem: cartão com borda e cantos arredondados. */
export function ExpenseList({ children }: { children: ReactNode }) {
  return <View style={styles.lista}>{children}</View>;
}

const styles = StyleSheet.create({
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
});
