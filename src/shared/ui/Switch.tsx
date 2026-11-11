import { Switch as RNSwitch, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { tokens } from './tokens';

// Componente Switch da referência, com título e explicação à esquerda. Usa o
// Switch do React Native, que existe na web e no nativo.
type Props = {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
};

export function Switch({ label, hint, value, onValueChange }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.textos}>
        <Text variant="body" style={styles.label}>
          {label}
        </Text>
        {hint && (
          <Text variant="caption" color="textMuted">
            {hint}
          </Text>
        )}
      </View>
      <RNSwitch
        accessibilityLabel={label}
        accessibilityHint={hint}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: tokens.color.borderStrong, true: tokens.color.brand }}
        thumbColor={tokens.color.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    minHeight: tokens.size.touch,
  },
  textos: { flex: 1, gap: tokens.space.xxs },
  label: { fontWeight: tokens.font.weight.semibold },
});
