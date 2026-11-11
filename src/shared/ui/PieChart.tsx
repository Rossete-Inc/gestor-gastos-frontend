import { StyleSheet, View } from 'react-native';
import { PieChart as GiftedPie } from 'react-native-gifted-charts';

import { Text } from './Text';
import { tokens } from './tokens';

// Gráfico de pizza em donut (ADR 0005): react-native-gifted-charts, que
// desenha com react-native-svg na web e no nativo. Só este arquivo conhece a
// biblioteca; trocar de biblioteca é mexer aqui e em nada mais.
export type FatiaPie = {
  chave: string;
  valor: number;
  /** Cor da fatia (dado, não token de UI). */
  cor: string;
};

type Props = {
  fatias: readonly FatiaPie[];
  /** Texto pequeno no centro, como "Total". */
  rotuloCentro: string;
  /** Valor no centro, já formatado. */
  valorCentro: string;
  /** Resumo para o leitor de tela; o gráfico em si é decorativo. */
  accessibilityLabel: string;
};

const RAIO = 100;
const RAIO_INTERNO = 64;

export function PieChart({ fatias, rotuloCentro, valorCentro, accessibilityLabel }: Props) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={styles.container}
    >
      <GiftedPie
        data={fatias.map((f) => ({ value: f.valor, color: f.cor }))}
        donut
        radius={RAIO}
        innerRadius={RAIO_INTERNO}
        innerCircleColor={tokens.color.surface}
        // Separação branca entre as fatias, como na referência.
        strokeWidth={fatias.length > 1 ? 2 : 0}
        strokeColor={tokens.color.surface}
        centerLabelComponent={() => (
          <View style={styles.centro}>
            <Text variant="caption" color="textMuted">
              {rotuloCentro}
            </Text>
            <Text variant="subtitle" style={styles.valor} numberOfLines={1}>
              {valorCentro}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: tokens.space.sm },
  centro: { alignItems: 'center', maxWidth: RAIO_INTERNO * 2 - tokens.space.lg },
  valor: { fontWeight: tokens.font.weight.bold },
});
