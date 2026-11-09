import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { tokens } from './tokens';

/** Indicador de carregamento centralizado, para telas e blocos. */
export function Carregando({ label = 'Carregando…' }: { label?: string }) {
  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      <ActivityIndicator color={tokens.color.brand} size="large" />
      <Text color="textMuted">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.md,
    padding: tokens.space.xl,
    backgroundColor: tokens.color.bg,
  },
});
