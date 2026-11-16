import { useEffect, useRef, type ComponentRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { PieChart as GiftedPie } from 'react-native-gifted-charts';

import { ouvirPonteiro } from '@/shared/platform';

import { fatiaNoPonto } from './pieGeometria';
import { Text, type TextVariant } from './Text';
import { tokens } from './tokens';

// Gráfico de pizza em donut (ADR 0005): react-native-gifted-charts, que
// desenha com react-native-svg na web e no nativo. Só este arquivo conhece a
// biblioteca; trocar de biblioteca é mexer aqui e em nada mais.
//
// Seleção (spec painel-gastos, "Detalhe da fatia do gráfico"): tocar numa
// fatia a seleciona (tocar de novo desfaz) e, na web, passar o mouse sobre
// ela também. A fatia selecionada fica destacada; quem usa mostra o detalhe.
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
  /** Índice da fatia selecionada; null ou ausente = nenhuma. */
  selecionada?: number | null;
  /** Chamado ao tocar numa fatia ou mover o mouse (web); null ao sair. */
  onSelecionar?: (indice: number | null) => void;
};

const RAIO = 100;
const RAIO_INTERNO = 64;
/** Quanto a fatia selecionada cresce para fora. */
const RAIO_EXTRA = 8;
/** Lado da área do gráfico: a biblioteca reserva o raio extra em volta. */
const LADO = (RAIO + RAIO_EXTRA) * 2;
/** Largura útil do centro: o diâmetro do furo menos uma folga. */
const LARGURA_CENTRO = RAIO_INTERNO * 2 - tokens.space.sm;

/**
 * Tamanho do valor do centro conforme o comprimento, para o valor inteiro, com
 * centavos, caber no furo: "R$ 100,60" fica grande; "R$ 1.234.567,89",
 * pequeno.
 */
export function variantDoValorCentro(valor: string): TextVariant {
  if (valor.length <= 9) return 'subtitle';
  if (valor.length <= 11) return 'body';
  if (valor.length <= 13) return 'label';
  return 'caption';
}

export function PieChart({
  fatias,
  rotuloCentro,
  valorCentro,
  accessibilityLabel,
  selecionada = null,
  onSelecionar,
}: Props) {
  const area = useRef<ComponentRef<typeof View>>(null);
  // As funções mudam a cada render; o ouvinte do ponteiro lê sempre a atual.
  const atual = useRef({ fatias, selecionada, onSelecionar });
  useEffect(() => {
    atual.current = { fatias, selecionada, onSelecionar };
  });

  useEffect(
    () =>
      ouvirPonteiro(
        area.current,
        (x, y) => {
          const { fatias: fs, selecionada: sel, onSelecionar: aoSelecionar } = atual.current;
          const i = fatiaNoPonto(
            x,
            y,
            LADO,
            RAIO + RAIO_EXTRA,
            RAIO_INTERNO,
            fs.map((f) => f.valor),
          );
          if (i !== null && i !== sel) aoSelecionar?.(i);
        },
        () => atual.current.onSelecionar?.(null),
      ),
    [],
  );

  const tocar = (_: unknown, i: number) => onSelecionar?.(i === selecionada ? null : i);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={styles.container}
    >
      <View ref={area} style={styles.area}>
        <GiftedPie
          data={fatias.map((f) => ({ value: f.valor, color: f.cor }))}
          donut
          radius={RAIO}
          innerRadius={RAIO_INTERNO}
          extraRadius={RAIO_EXTRA}
          innerCircleColor={tokens.color.surface}
          // Separação branca entre as fatias, como na referência.
          strokeWidth={fatias.length > 1 ? 2 : 0}
          strokeColor={tokens.color.surface}
          focusedPieIndex={selecionada ?? -1}
          onPress={tocar}
          centerLabelComponent={() => (
            <View style={styles.centro}>
              <Text variant="caption" color="textMuted">
                {rotuloCentro}
              </Text>
              <Text
                variant={variantDoValorCentro(valorCentro)}
                style={styles.valor}
                numberOfLines={1}
              >
                {valorCentro}
              </Text>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: tokens.space.sm },
  area: { width: LADO, height: LADO, alignItems: 'center', justifyContent: 'center' },
  centro: { alignItems: 'center', maxWidth: LARGURA_CENTRO },
  valor: { fontWeight: tokens.font.weight.bold },
});
