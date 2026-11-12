import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { Text } from './Text';
import { tokens } from './tokens';

// Confirmação de ação destrutiva (Figma: "confirmação de exclusão"). Usa o
// Modal do React Native, que funciona na web e no nativo; o Alert.alert não
// mostra botões no react-native-web.
type Props = {
  /** Estilo do botão de confirmar: danger (padrão) para ações destrutivas. */
  confirmVariant?: 'danger' | 'primary';
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Bloqueia os botões e mostra o indicador no de confirmar. */
  loading?: boolean;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  loading,
  confirmVariant = 'danger',
}: Props) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <Pressable
        accessibilityLabel="Fechar"
        style={styles.fundo}
        onPress={loading ? undefined : onCancel}
      >
        {/* Pressable interno: toque dentro da caixa não fecha o diálogo. */}
        <Pressable accessibilityViewIsModal accessibilityRole="alert" style={styles.caixa}>
          <Text variant="subtitle" accessibilityRole="header">
            {title}
          </Text>
          <Text color="textMuted">{message}</Text>
          <View style={styles.acoes}>
            <Button
              label={confirmLabel}
              variant={confirmVariant}
              onPress={onConfirm}
              loading={loading}
            />
            <Button label="Cancelar" variant="secondary" onPress={onCancel} disabled={loading} />
          </View>
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
    gap: tokens.space.md,
    padding: tokens.space.xl,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.surface,
  },
  acoes: { gap: tokens.space.sm, marginTop: tokens.space.sm },
});
