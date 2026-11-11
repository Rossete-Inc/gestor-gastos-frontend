import { StyleSheet, TextInput, View } from 'react-native';

import { centavosAposEdicao, formatarCentavos } from '@/shared/lib';

import { Text } from './Text';
import { tokens } from './tokens';

// Campo de valor em destaque da tela "Novo gasto": "Valor / R$ 45,90". A
// máscara trabalha em centavos inteiros: cada dígito entra pela direita, como
// nas maquininhas, então não existe vírgula a digitar nem float no caminho.
type Props = {
  label: string;
  centavos: number;
  onChange: (centavos: number) => void;
  onBlur?: () => void;
  error?: string;
};

export function MoneyField({ label, centavos, onChange, onBlur, error }: Props) {
  const texto = formatarCentavos(centavos);
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.cartao,
          { borderColor: tokens.color[error ? 'danger' : 'border'], borderWidth: error ? 2 : 1 },
        ]}
      >
        <Text variant="label" color="textMuted">
          {label}
        </Text>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error}
          aria-invalid={!!error}
          keyboardType="number-pad"
          inputMode="numeric"
          value={texto}
          // A edição é lida pela diferença de dígitos, não pela posição do
          // cursor: na web, o clique deixa o cursor no meio de "R$ 0,00" e os
          // dígitos entrariam fora de ordem (4590 virava R$ 45.900,00).
          onChangeText={(t) => onChange(centavosAposEdicao(centavos, t))}
          onBlur={onBlur}
          style={styles.input}
        />
      </View>
      {error && (
        <Text variant="caption" color="danger" accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: tokens.space.xs },
  cartao: {
    alignItems: 'center',
    gap: tokens.space.xs,
    paddingVertical: tokens.space.xl,
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.surface,
  },
  input: {
    width: '100%',
    textAlign: 'center',
    fontSize: tokens.font.size.display,
    lineHeight: tokens.font.lineHeight.display,
    fontWeight: tokens.font.weight.bold,
    color: tokens.color.text,
  },
});
