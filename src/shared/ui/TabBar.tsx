import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { tokens } from './tokens';

// Componente TabBar da referência: ícone e rótulo, com a aba ativa na cor da
// marca. Não conhece o roteador: o layout de abas do app monta os itens.
export type ItemTabBar = {
  chave: string;
  label: string;
  icon: IconName;
  ativo: boolean;
  onPress: () => void;
};

export function TabBar({ itens }: { itens: readonly ItemTabBar[] }) {
  const { bottom } = useSafeAreaInsets();
  return (
    <View accessibilityRole="tablist" style={[styles.container, { paddingBottom: bottom }]}>
      {itens.map((i) => {
        const cor = i.ativo ? 'brand' : 'textMuted';
        return (
          <Pressable
            key={i.chave}
            accessibilityRole="tab"
            accessibilityLabel={i.label}
            accessibilityState={{ selected: i.ativo }}
            onPress={i.onPress}
            style={styles.item}
          >
            <Icon name={i.icon} color={cor} />
            <Text variant="caption" color={cor}>
              {i.label}
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
    borderTopWidth: 1,
    borderTopColor: tokens.color.border,
    backgroundColor: tokens.color.surface,
  },
  item: {
    flex: 1,
    minHeight: tokens.size.header,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.xxs,
  },
});
