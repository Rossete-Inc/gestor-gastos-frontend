import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from './Icon';
import { Text } from './Text';
import { tokens } from './tokens';

// Componente Header do Figma: Type=Title (só título) e Type=Back (com voltar).
type Props = { title: string; onBack?: () => void };

export function Header({ title, onBack }: Props) {
  return (
    <View style={styles.container}>
      {onBack && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={onBack}
          hitSlop={tokens.space.md}
          style={styles.voltar}
        >
          <Icon name="chevron-left" />
        </Pressable>
      )}
      <Text variant="title" accessibilityRole="header" numberOfLines={1} style={styles.titulo}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: tokens.size.header,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.xl,
  },
  voltar: {
    width: tokens.size.touch,
    height: tokens.size.touch,
    marginLeft: -tokens.space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { flex: 1 },
});
