import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, type BadgeTone } from './Badge';
import { Text } from './Text';
import { tokens } from './tokens';

// Componente UserRow da referência: iniciais num círculo, nome, e-mail e, à
// direita, os selos de papel e de status. Quem usa monta os textos e os tons.
type Selo = { label: string; tone: BadgeTone };

type Props = {
  nome: string;
  email: string;
  papel: Selo;
  status: Selo;
  onPress: () => void;
  accessibilityHint?: string;
};

export function UserRow({ nome, email, papel, status, onPress, accessibilityHint }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${nome}, ${email}, ${papel.label}, ${status.label}`}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.pressionado]}
    >
      <View style={styles.avatar}>
        <Text variant="label" color="brand" style={styles.iniciais}>
          {iniciais(nome)}
        </Text>
      </View>
      <View style={styles.textos}>
        <Text variant="body" numberOfLines={1} style={styles.nome}>
          {nome}
        </Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {email}
        </Text>
      </View>
      <View style={styles.selos}>
        <Badge label={papel.label} tone={papel.tone} style={styles.selo} />
        <Badge label={status.label} tone={status.tone} style={styles.selo} />
      </View>
    </Pressable>
  );
}

/** Moldura das listas de UserRow, igual à das listas de gastos. */
export function UserList({ children }: { children: ReactNode }) {
  return <View style={styles.lista}>{children}</View>;
}

/** Primeira letra do primeiro e do último nome: "Maria Souza" → "MS". */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primeira = partes[0]!.charAt(0);
  const ultima = partes.length > 1 ? partes.at(-1)!.charAt(0) : '';
  return (primeira + ultima).toLocaleUpperCase('pt-BR');
}

const styles = StyleSheet.create({
  lista: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.surface,
    overflow: 'hidden',
  },
  item: {
    minHeight: tokens.size.touch + tokens.space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.border,
  },
  pressionado: { backgroundColor: tokens.color.surfaceMuted },
  avatar: {
    width: tokens.size.touch - tokens.space.sm,
    height: tokens.size.touch - tokens.space.sm,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.color.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniciais: { fontWeight: tokens.font.weight.semibold },
  textos: { flex: 1, gap: tokens.space.xxs },
  nome: { fontWeight: tokens.font.weight.semibold },
  // Selos empilhados e alinhados à direita, como na referência.
  selos: { alignItems: 'flex-end', gap: tokens.space.xs },
  selo: { alignSelf: 'flex-end' },
});
