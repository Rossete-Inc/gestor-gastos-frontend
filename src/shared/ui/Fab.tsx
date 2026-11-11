import { Pressable, StyleSheet } from 'react-native';

import { Icon, type IconName } from './Icon';
import { tokens } from './tokens';

// Componente FAB da referência: botão redondo flutuante no canto inferior
// direito, para a ação principal da tela.
type Props = { label: string; onPress: () => void; icon?: IconName };

const TAMANHO = tokens.size.touch + tokens.space.sm;

export function Fab({ label, onPress, icon = 'plus' }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: tokens.color[pressed ? 'brandPressed' : 'brand'] },
      ]}
    >
      <Icon name={icon} color="textOnBrand" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    right: tokens.space.xl,
    bottom: tokens.space.xl,
    width: TAMANHO,
    height: TAMANHO,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: tokens.color.text,
    shadowOpacity: 0.2,
    shadowRadius: tokens.space.sm,
    shadowOffset: { width: 0, height: tokens.space.xs },
  },
});
