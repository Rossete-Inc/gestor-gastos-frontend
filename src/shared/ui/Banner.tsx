import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { tokens, type CorToken } from './tokens';

// Componente Banner do Figma: Tone=Error, Offline e Success.
export type BannerTone = 'error' | 'offline' | 'success';

const tons: Record<BannerTone, { fundo: CorToken; cor: CorToken; icone: IconName }> = {
  error: { fundo: 'dangerSoft', cor: 'danger', icone: 'alert-circle' },
  offline: { fundo: 'warningSoft', cor: 'warning', icone: 'wifi-off' },
  success: { fundo: 'successSoft', cor: 'success', icone: 'check-circle' },
};

type Props = { tone: BannerTone; message: string };

export function Banner({ tone, message }: Props) {
  const t = tons[tone];
  return (
    <View
      // accessible: o leitor de tela anuncia ícone e mensagem como um único alerta.
      accessible
      accessibilityRole={tone === 'success' ? 'summary' : 'alert'}
      accessibilityLiveRegion="polite"
      style={[styles.container, { backgroundColor: tokens.color[t.fundo] }]}
    >
      <Icon name={t.icone} color={t.cor} size={tokens.size.iconSm} />
      <Text variant="label" color={t.cor} style={styles.texto}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.md,
  },
  texto: { flex: 1 },
});
