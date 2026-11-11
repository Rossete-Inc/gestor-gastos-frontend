import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from './Text';
import { tokens, type CorToken } from './tokens';

// Componente Badge do Figma: Tone=Neutral, Brand, Success, Danger, Warning,
// Cartao e Fixo.
export type BadgeTone = 'neutral' | 'brand' | 'success' | 'danger' | 'warning' | 'cartao' | 'fixo';

const tons: Record<BadgeTone, { fundo: CorToken; cor: CorToken }> = {
  neutral: { fundo: 'surfaceMuted', cor: 'textMuted' },
  brand: { fundo: 'brandSoft', cor: 'brand' },
  success: { fundo: 'successSoft', cor: 'success' },
  danger: { fundo: 'dangerSoft', cor: 'danger' },
  warning: { fundo: 'warningSoft', cor: 'warning' },
  cartao: { fundo: 'cartaoSoft', cor: 'cartao' },
  fixo: { fundo: 'fixoSoft', cor: 'fixo' },
};

type Props = {
  label: string;
  tone?: BadgeTone;
  // Por padrão o selo se alinha ao início (numa coluna, não estica). Numa
  // linha com alignItems: 'center', passe { alignSelf: 'center' }.
  style?: StyleProp<ViewStyle>;
};

export function Badge({ label, tone = 'neutral', style }: Props) {
  const t = tons[tone];
  return (
    <View style={[styles.container, { backgroundColor: tokens.color[t.fundo] }, style]}>
      <Text variant="caption" color={t.cor} style={styles.texto}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xxs,
    borderRadius: tokens.radius.full,
  },
  texto: { fontWeight: tokens.font.weight.semibold },
});
