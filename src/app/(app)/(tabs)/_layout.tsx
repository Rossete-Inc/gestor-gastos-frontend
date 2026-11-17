import { router, Tabs } from 'expo-router';

import { BarraDaConta } from '@/features/colaboracao';
import { TabBar, TopoDaTela, type IconName } from '@/shared/ui';

// Abas da referência (TabBar), com o Painel primeiro.
const abas: Record<string, { label: string; icon: IconName }> = {
  painel: { label: 'Painel', icon: 'pie-chart' },
  gastos: { label: 'Gastos', icon: 'list' },
  cartoes: { label: 'Cartões', icon: 'credit-card' },
  categorias: { label: 'Categorias', icon: 'tag' },
  perfil: { label: 'Perfil', icon: 'user' },
};

// Abaixo do título de cada aba: o seletor de conta e o aviso de convites.
const barra = (
  <BarraDaConta
    onConvites={() => router.push('/convites')}
    onTrocou={() => router.navigate('/painel')}
  />
);

export default function AbasLayout() {
  return (
    <TopoDaTela.Provider value={barra}>
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
        <Tabs.Screen name="painel" />
        <Tabs.Screen name="gastos" />
        <Tabs.Screen name="cartoes" />
        <Tabs.Screen name="categorias" />
        <Tabs.Screen name="perfil" />
      </Tabs>
    </TopoDaTela.Provider>
  );
}
