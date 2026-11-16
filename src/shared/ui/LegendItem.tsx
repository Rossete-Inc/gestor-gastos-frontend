import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { tokens } from './tokens';

// Componente LegendItem da referência: bolinha na cor da fatia, nome,
// percentual e valor. Com onPress, vira o atalho do detalhe da fatia: toque
// (e mouse, na web) seleciona a fatia correspondente.
type Props = {
  nome: string;
  /** Cor da fatia (dado, não token de UI). */
  cor: string;
  /** Percentual já formatado, como "42%". */
  percentual: string;
  /** Valor já formatado, como "R$ 750,00". */
  valor: string;
  selecionado?: boolean;
  onPress?: () => void;
  /** Mouse sobre o item (web). */
  onHoverIn?: () => void;
  onHoverOut?: () => void;
};

const BOLINHA = tokens.space.sm + tokens.space.xxs;

export function LegendItem({
  nome,
  cor,
  percentual,
  valor,
  selecionado,
  onPress,
  onHoverIn,
  onHoverOut,
}: Props) {
  const rotulo = `${nome}: ${percentual}, ${valor}`;
  const conteudo = (
    <>
      <View style={[styles.bolinha, { backgroundColor: cor }]} />
      <Text variant="body" numberOfLines={1} style={styles.nome}>
        {nome}
      </Text>
      <Text variant="label" color="textMuted">
        {percentual}
      </Text>
      <Text variant="body" style={styles.valor}>
        {valor}
      </Text>
    </>
  );
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={rotulo} style={styles.linha}>
        {conteudo}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityHint="Mostra o detalhe desta fatia"
      accessibilityState={{ selected: !!selecionado }}
      onPress={onPress}
      onHoverIn={onHoverIn}
      onHoverOut={onHoverOut}
      style={[styles.linha, selecionado && styles.selecionado]}
    >
      {conteudo}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  linha: {
    minHeight: tokens.size.touch - tokens.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.xs,
    borderRadius: tokens.radius.md,
  },
  selecionado: { backgroundColor: tokens.color.surfaceMuted },
  bolinha: { width: BOLINHA, height: BOLINHA, borderRadius: tokens.radius.full },
  nome: { flex: 1 },
  valor: { fontWeight: tokens.font.weight.bold },
});
