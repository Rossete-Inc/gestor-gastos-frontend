import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { Text } from './Text';
import { tokens } from './tokens';

export type AcaoSheet = {
  label: string;
  onPress: () => void;
  /** Ação destrutiva, em vermelho. */
  danger?: boolean;
};

type Props = {
  visible: boolean;
  title: string;
  /** Texto curto abaixo do título, como o e-mail da pessoa. */
  subtitle?: string;
  acoes: AcaoSheet[];
  onCancel: () => void;
};

// Lista de ações sobre um item, no mesmo Modal do ConfirmDialog (funciona na
// web e no nativo). Cada ação fecha a folha por conta de quem a usa.
export function ActionSheet({ visible, title, subtitle, acoes, onCancel }: Props) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <Pressable accessibilityLabel="Fechar" style={styles.fundo} onPress={onCancel}>
        <Pressable accessibilityViewIsModal style={styles.caixa}>
          <View style={styles.cabecalho}>
            <Text variant="subtitle" accessibilityRole="header" numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text variant="caption" color="textMuted" numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {acoes.map((a) => (
            <Button
              key={a.label}
              label={a.label}
              variant={a.danger ? 'danger' : 'secondary'}
              onPress={a.onPress}
            />
          ))}
          <Button label="Cancelar" variant="ghost" onPress={onCancel} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    justifyContent: 'center',
    padding: tokens.space.xl,
    backgroundColor: tokens.color.overlay,
  },
  caixa: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    gap: tokens.space.sm,
    padding: tokens.space.xl,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.surface,
  },
  cabecalho: { gap: tokens.space.xxs, marginBottom: tokens.space.sm },
});
