import { StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { tokens } from './tokens';

// Componente SummaryCard da referência: rótulo e valor. O destaque (fundo da
// marca, valor grande) é o total do mês; os comuns são os totais por grupo.
type Props = {
  label: string;
  /** Valor já formatado, como "R$ 1.180,00". */
  valor: string;
  destaque?: boolean;
};

export function SummaryCard({ label, valor, destaque }: Props) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${valor}`}
      style={[styles.base, destaque ? styles.destaque : styles.comum]}
    >
      <Text variant="label" color={destaque ? 'textOnBrand' : 'text'}>
        {label}
      </Text>
      <Text
        variant={destaque ? 'display' : 'subtitle'}
        color={destaque ? 'textOnBrand' : 'text'}
        style={destaque ? undefined : styles.valorComum}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {valor}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    gap: tokens.space.xs,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.lg,
  },
  destaque: { backgroundColor: tokens.color.brand },
  comum: {
    backgroundColor: tokens.color.surface,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  valorComum: { fontWeight: tokens.font.weight.bold },
});
