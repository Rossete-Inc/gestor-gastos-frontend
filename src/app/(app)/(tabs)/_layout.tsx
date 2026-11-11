import { Tabs } from 'expo-router';

import { TabBar, type IconName } from '@/shared/ui';

// Abas da referência (TabBar). O Painel entra como primeira aba na fatia 4.
const abas: Record<string, { label: string; icon: IconName }> = {
  gastos: { label: 'Gastos', icon: 'list' },
  categorias: { label: 'Categorias', icon: 'tag' },
  perfil: { label: 'Perfil', icon: 'user' },
};

export default function AbasLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigateToTab }) => (
        <TabBar
          itens={state.routes.map((r, i) => ({
            chave: r.key,
            label: abas[r.name]?.label ?? r.name,
            icon: abas[r.name]?.icon ?? 'list',
            ativo: state.index === i,
            onPress: () => navigateToTab(r.key),
          }))}
        />
      )}
    >
      <Tabs.Screen name="gastos" />
      <Tabs.Screen name="categorias" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  );
}
