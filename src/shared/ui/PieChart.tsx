import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Animated, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { PieChart as GiftedPie } from 'react-native-gifted-charts';

import { ouvirPonteiro } from '@/shared/platform';

import { fatiaNoPonto, pontoDaFatia } from './pieGeometria';
import { Text, type TextVariant } from './Text';
import { tokens } from './tokens';

// Gráfico de pizza em donut (ADR 0005): react-native-gifted-charts, que
// desenha com react-native-svg na web e no nativo. Só este arquivo conhece a
// biblioteca; trocar de biblioteca é mexer aqui e em nada mais.
//
// Seleção (spec painel-gastos, "Detalhe da fatia do gráfico"): tocar numa
// fatia a seleciona (tocar de novo desfaz) e, na web, passar o mouse sobre
// ela também. A fatia selecionada salta para fora do anel, as outras ficam
// esmaecidas e um balão sai dela com o conteúdo que quem usa passar.
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
  /** Conteúdo do balão da fatia selecionada. */
  balao?: ReactNode;
};

const RAIO = 100;
const RAIO_INTERNO = 64;
/** Quanto a fatia selecionada salta para fora. */
const RAIO_EXTRA = 12;
/** Lado da área do gráfico: a biblioteca reserva o raio extra em volta. */
const LADO = (RAIO + RAIO_EXTRA) * 2;
/** Largura útil do centro: o diâmetro do furo menos uma folga. */
const LARGURA_CENTRO = RAIO_INTERNO * 2 - tokens.space.sm;
/** Folga em cima e embaixo do gráfico (paddingVertical do container). */
const FOLGA = tokens.space.sm;
const LARGURA_BALAO = 232;
/** Lado do quadrado girado que forma a setinha do balão. */
const SETA = 12;

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

/**
 * Cor esmaecida (cerca de 1/3 de opacidade) para as fatias fora de foco.
 * Só entende "#RRGGBB"; outro formato volta como veio.
 *
 *     esmaecer('#F97316') // => "#F9731655"
 */
export function esmaecer(cor: string): string {
  return /^#[0-9a-f]{6}$/i.test(cor) ? `${cor}55` : cor;
}

export function PieChart({
  fatias,
  rotuloCentro,
  valorCentro,
  accessibilityLabel,
  selecionada = null,
  onSelecionar,
  balao,
}: Props) {
  const area = useRef<ComponentRef<typeof View>>(null);
  const [largura, setLargura] = useState(0);
  const [altura, setAltura] = useState(0);
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
  const medir = (e: LayoutChangeEvent) => {
    setLargura(e.nativeEvent.layout.width);
    setAltura(e.nativeEvent.layout.height);
  };

  return (
    <View onLayout={medir} style={styles.container}>
      <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
        <View ref={area} style={styles.area}>
          <GiftedPie
            data={fatias.map((f, i) => ({
              value: f.valor,
              color: selecionada === null || selecionada === i ? f.cor : esmaecer(f.cor),
            }))}
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
      {selecionada !== null && balao && (
        <BalaoDaFatia
          key={selecionada}
          indice={selecionada}
          valores={fatias.map((f) => f.valor)}
          largura={largura}
          altura={altura}
        >
          {balao}
        </BalaoDaFatia>
      )}
    </View>
  );
}

// Balão que sai da borda da fatia selecionada: em cima dela se a fatia está
// na metade de cima do gráfico, embaixo se está na de baixo, com a setinha
// apontando para a fatia. Fica dentro da largura do container (o card do
// painel) para não cortar na tela do celular. Não recebe toque nem mouse:
// o ponteiro continua sendo do gráfico.
function BalaoDaFatia({
  indice,
  valores,
  largura,
  altura,
  children,
}: {
  indice: number;
  valores: number[];
  largura: number;
  altura: number;
  children: ReactNode;
}) {
  // Valor da animação de entrada, criado uma vez por balão.
  const [entrada] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(entrada, { toValue: 1, duration: 150, useNativeDriver: false }).start();
  }, [entrada]);

  const ponto = pontoDaFatia(indice, valores, RAIO + RAIO_EXTRA);
  if (!ponto) return null;

  // Âncora na borda da fatia, em coordenadas do container: o gráfico fica
  // centralizado na horizontal, depois da folga de cima.
  const ancoraX = largura / 2 + ponto.x;
  const ancoraY = FOLGA + LADO / 2 + ponto.y;
  const w = Math.min(LARGURA_BALAO, largura || LARGURA_BALAO);
  const esquerda = Math.min(Math.max(ancoraX - w / 2, 0), Math.max(largura - w, 0));
  const raioDaSeta = tokens.radius.md + SETA / 2;
  const setaX = Math.min(
    Math.max(ancoraX - esquerda - SETA / 2, raioDaSeta),
    w - raioDaSeta - SETA,
  );
  const vertical = ponto.emCima
    ? { bottom: altura - ancoraY + SETA / 2 }
    : { top: ancoraY + SETA / 2 };
  const deslize = entrada.interpolate({
    inputRange: [0, 1],
    outputRange: [ponto.emCima ? SETA / 2 : -SETA / 2, 0],
  });

  return (
    <Animated.View
      style={[
        styles.balao,
        vertical,
        { left: esquerda, width: w, opacity: entrada, transform: [{ translateY: deslize }] },
      ]}
    >
      <View
        style={[
          styles.seta,
          { left: setaX },
          ponto.emCima ? styles.setaEmbaixo : styles.setaEmCima,
        ]}
      />
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: FOLGA, zIndex: 1 },
  area: { width: LADO, height: LADO, alignItems: 'center', justifyContent: 'center' },
  centro: { alignItems: 'center', maxWidth: LARGURA_CENTRO },
  valor: { fontWeight: tokens.font.weight.bold },
  balao: {
    position: 'absolute',
    zIndex: 2,
    pointerEvents: 'none',
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.surface,
    elevation: 6,
    shadowColor: tokens.color.text,
    shadowOpacity: 0.18,
    shadowRadius: tokens.space.md,
    shadowOffset: { width: 0, height: tokens.space.xs },
  },
  seta: {
    position: 'absolute',
    width: SETA,
    height: SETA,
    transform: [{ rotate: '45deg' }],
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.border,
  },
  // Seta na borda de baixo do balão (balão em cima da fatia), e vice-versa;
  // só as duas bordas de fora do quadrado girado aparecem.
  setaEmbaixo: {
    bottom: -SETA / 2,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  setaEmCima: {
    top: -SETA / 2,
    borderLeftWidth: 1,
    borderTopWidth: 1,
  },
});
