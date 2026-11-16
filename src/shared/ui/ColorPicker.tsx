import { Pressable, StyleSheet, View } from 'react-native';

import { PALETA, TONS, nomeDaCor } from './paleta';
import { Text } from './Text';
import { tokens } from './tokens';

type Props = {
  label: string;
  /** Cor marcada, #RRGGBB. */
  valor: string;
  onChange: (cor: string) => void;
  error?: string;
};

// Seletor de cor da paleta: uma linha por família, do tom claro ao escuro.
// Usado nos formulários de categoria e de cartão.
export function ColorPicker({ label, valor, onChange, error }: Props) {
  return (
    <View style={styles.campo}>
      <Text variant="label">{label}</Text>
      <Text variant="caption" color="textMuted">
        Selecionada: {nomeDaCor(valor)}
      </Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.paleta}>
        {PALETA.map((familia) => (
          <View key={familia.familia} style={styles.familia}>
            <Text variant="label" color="textMuted" style={styles.nomeFamilia}>
              {familia.familia}
            </Text>
            {TONS.map((tom) => {
              const cor = familia[tom.valor];
              const marcada = valor.toUpperCase() === cor;
              return (
                <Pressable
                  key={cor}
                  accessibilityRole="radio"
                  accessibilityLabel={`${familia.familia} ${tom.label}`}
                  accessibilityState={{ checked: marcada }}
                  onPress={() => onChange(cor)}
                  style={[styles.amostraAlvo, marcada && styles.marcada]}
                >
                  {/* A cor é dado, não token de UI. */}
                  <View style={[styles.amostra, { backgroundColor: cor }]} />
                </Pressable>
              );
            })}
          </View>
        ))}
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
  campo: { gap: tokens.space.xs },
  paleta: { gap: tokens.space.xxs },
  familia: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs },
  nomeFamilia: { flex: 1 },
  amostraAlvo: {
    width: tokens.size.touch,
    height: tokens.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.full,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  marcada: { borderColor: tokens.color.text },
  amostra: {
    width: tokens.size.icon + tokens.space.sm,
    height: tokens.size.icon + tokens.space.sm,
    borderRadius: tokens.radius.full,
  },
});
