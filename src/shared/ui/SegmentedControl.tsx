import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { tokens } from './tokens';

// Componente SegmentedControl do Figma (Selected=Todos|Cartao|Fixo): escolha
// única entre poucas opções, todas visíveis. Usado no formulário de categoria
// e, nas próximas fatias, nos filtros de gastos e no painel.
export type Segmento<T extends string> = { valor: T; label: string };

type Props<T extends string> = {
  /** Nome do grupo para o leitor de tela, por exemplo "Grupo". */
  label: string;
  opcoes: readonly Segmento<T>[];
  valor: T;
  onChange: (valor: T) => void;
};

export function SegmentedControl<T extends string>({ label, opcoes, valor, onChange }: Props<T>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.container}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ checked: ativo }}
            onPress={() => onChange(o.valor)}
            style={[styles.segmento, ativo && styles.ativo]}
          >
            <Text variant="label" color={ativo ? 'text' : 'textMuted'} style={styles.texto}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: tokens.space.xs,
    gap: tokens.space.xs,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.surfaceMuted,
  },
  segmento: {
    flex: 1,
    minHeight: tokens.size.touch - tokens.space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm,
  },
  ativo: {
    backgroundColor: tokens.color.surface,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  texto: { fontWeight: tokens.font.weight.semibold },
});
