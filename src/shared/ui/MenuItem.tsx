import { Pressable, StyleSheet } from 'react-native';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { tokens } from './tokens';

// Componente MenuItem do Figma: ícone, rótulo e seta; "danger" para ações
// como sair.
type Props = { label: string; icon: IconName; onPress: () => void; danger?: boolean };

export function MenuItem({ label, icon, onPress, danger }: Props) {
  const cor = danger ? 'danger' : 'text';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: tokens.color[pressed ? 'surfaceMuted' : 'surface'] },
      ]}
    >
      <Icon name={icon} color={cor} />
      <Text variant="body" color={cor} style={styles.label}>
        {label}
      </Text>
      {!danger && <Icon name="chevron-right" color="textSubtle" size={tokens.size.iconSm} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: tokens.size.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.md,
  },
  label: { flex: 1 },
});
