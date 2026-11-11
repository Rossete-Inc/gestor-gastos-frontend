import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from './Icon';
import { Text } from './Text';
import { tokens } from './tokens';

// Componente Select da referência: campo com o valor escolhido (e a bolinha
// de cor, quando houver) que abre a lista de opções num Modal. O Modal do
// React Native funciona na web e no nativo, sem biblioteca de picker.
export type OpcaoSelect = {
  valor: string;
  label: string;
  /** Cor da bolinha (dado da opção, por exemplo a cor da categoria). */
  cor?: string;
};

export type SecaoSelect = { titulo?: string; opcoes: readonly OpcaoSelect[] };

type Props = {
  label: string;
  /** Escondido acima do campo, mas ainda lido pelo leitor de tela. */
  ocultarLabel?: boolean;
  valor: string | null;
  secoes: readonly SecaoSelect[];
  onChange: (valor: string) => void;
  placeholder?: string;
  error?: string;
};

export function Select({
  label,
  ocultarLabel,
  valor,
  secoes,
  onChange,
  placeholder,
  error,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const escolhida = secoes.flatMap((s) => s.opcoes).find((o) => o.valor === valor);

  const escolher = (v: string) => {
    setAberto(false);
    onChange(v);
  };

  return (
    <View style={styles.container}>
      {!ocultarLabel && <Text variant="label">{label}</Text>}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${escolhida?.label ?? placeholder ?? 'nenhuma'}`}
        accessibilityHint={error}
        onPress={() => setAberto(true)}
        style={[
          styles.campo,
          {
            borderColor: tokens.color[error ? 'danger' : 'borderStrong'],
            borderWidth: error ? 2 : 1,
          },
        ]}
      >
        {escolhida?.cor && <Bolinha cor={escolhida.cor} />}
        <Text color={escolhida ? 'text' : 'textSubtle'} numberOfLines={1} style={styles.valor}>
          {escolhida?.label ?? placeholder ?? ''}
        </Text>
        <Icon name="chevron-down" color="textMuted" size={tokens.size.iconSm} />
      </Pressable>
      {error && (
        <Text variant="caption" color="danger" accessibilityRole="alert">
          {error}
        </Text>
      )}
      <Modal
        transparent
        visible={aberto}
        animationType="fade"
        onRequestClose={() => setAberto(false)}
      >
        <Pressable
          accessibilityLabel="Fechar"
          style={styles.fundo}
          onPress={() => setAberto(false)}
        >
          <Pressable accessibilityViewIsModal style={styles.folha}>
            <Text variant="subtitle" accessibilityRole="header">
              {label}
            </Text>
            <ScrollView>
              {secoes.map((s, i) => (
                <View key={s.titulo ?? i}>
                  {s.titulo && (
                    <Text variant="caption" color="textMuted" style={styles.secao}>
                      {s.titulo}
                    </Text>
                  )}
                  {s.opcoes.map((o) => (
                    <Pressable
                      key={o.valor}
                      accessibilityRole="radio"
                      accessibilityLabel={o.label}
                      accessibilityState={{ checked: o.valor === valor }}
                      onPress={() => escolher(o.valor)}
                      style={({ pressed }) => [styles.opcao, pressed && styles.pressionada]}
                    >
                      {o.cor && <Bolinha cor={o.cor} />}
                      <Text style={styles.valor}>{o.label}</Text>
                      {o.valor === valor && (
                        <Icon name="check-circle" color="brand" size={tokens.size.iconSm} />
                      )}
                    </Pressable>
                  ))}
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Bolinha({ cor }: { cor: string }) {
  // A cor é dado da opção, não token de UI.
  return <View style={[styles.bolinha, { backgroundColor: cor }]} />;
}

const styles = StyleSheet.create({
  container: { gap: tokens.space.xs },
  campo: {
    minHeight: tokens.size.input,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    backgroundColor: tokens.color.surface,
  },
  valor: { flex: 1 },
  bolinha: { width: tokens.space.md, height: tokens.space.md, borderRadius: tokens.radius.full },
  fundo: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: tokens.color.overlay,
  },
  folha: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '75%',
    alignSelf: 'center',
    gap: tokens.space.sm,
    padding: tokens.space.xl,
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    backgroundColor: tokens.color.surface,
  },
  secao: {
    textTransform: 'uppercase',
    fontWeight: tokens.font.weight.medium,
    marginTop: tokens.space.md,
  },
  opcao: {
    minHeight: tokens.size.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
  },
  pressionada: { backgroundColor: tokens.color.surfaceMuted },
});
