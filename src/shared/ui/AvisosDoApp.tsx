import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { assinarConexao, estaOnline, registrarServiceWorker } from '@/shared/platform';

import { Banner } from './Banner';
import { Button } from './Button';
import { Text } from './Text';
import { tokens } from './tokens';

// Avisos da PWA no topo de todas as telas (tarefa 11.1): sem conexão e versão
// nova disponível. No iOS e no Android as duas fontes não emitem nada e o
// componente não ocupa espaço.
export function AvisosDoApp() {
  const [online, setOnline] = useState(estaOnline);
  const [aplicar, setAplicar] = useState<(() => void) | null>(null);
  const { top } = useSafeAreaInsets();

  useEffect(() => assinarConexao(setOnline), []);
  // A função vai embrulhada: o setState chamaria a função recebida.
  useEffect(() => registrarServiceWorker((a) => setAplicar(() => a)), []);

  if (online && !aplicar) return null;

  return (
    <View style={[styles.faixa, { paddingTop: top + tokens.space.sm }]}>
      {!online && (
        <Banner
          tone="offline"
          message="Sem conexão. Você vê o que já foi carregado; salvar volta a funcionar quando a conexão voltar."
        />
      )}
      {aplicar && (
        <View accessibilityRole="alert" style={styles.versao}>
          <Text variant="label" style={styles.texto}>
            Nova versão disponível.
          </Text>
          <Button label="Atualizar" variant="secondary" onPress={aplicar} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  faixa: {
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.lg,
    paddingBottom: tokens.space.sm,
    backgroundColor: tokens.color.bg,
  },
  versao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.brandSoft,
  },
  texto: { flex: 1 },
});
