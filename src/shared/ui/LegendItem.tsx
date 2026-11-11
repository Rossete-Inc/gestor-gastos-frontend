import { StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { tokens } from './tokens';

// Componente LegendItem da referência: bolinha na cor da fatia, nome,
// percentual e valor.
type Props = {
  nome: string;
  /** Cor da fatia (dado, não token de UI). */
  cor: string;
  /** Percentual já formatado, como "42%". */
  percentual: string;
  /** Valor já formatado, como "R$ 750,00". */
  valor: string;
};

const BOLINHA = tokens.space.sm + tokens.space.xxs;

export function LegendItem({ nome, cor, percentual, valor }: Props) {
  return (
    <View accessible accessibilityLabel={`${nome}: ${percentual}, ${valor}`} style={styles.linha}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    minHeight: tokens.size.touch - tokens.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
  },
  bolinha: { width: BOLINHA, height: BOLINHA, borderRadius: tokens.radius.full },
  nome: { flex: 1 },
  valor: { fontWeight: tokens.font.weight.bold },
});
