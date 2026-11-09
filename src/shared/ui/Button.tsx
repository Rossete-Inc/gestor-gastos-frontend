import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { tokens, type CorToken } from './tokens';

// Variantes do componente Button do Figma: Primary, Secondary, Ghost, Danger,
// cada uma com Default e Disabled.
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const estilos: Record<
  ButtonVariant,
  { fundo: CorToken; pressionado: CorToken; texto: CorToken; borda?: CorToken }
> = {
  primary: { fundo: 'brand', pressionado: 'brandPressed', texto: 'textOnBrand' },
  secondary: {
    fundo: 'surface',
    pressionado: 'surfaceMuted',
    texto: 'text',
    borda: 'borderStrong',
  },
  ghost: { fundo: 'bg', pressionado: 'surfaceMuted', texto: 'brand' },
  danger: { fundo: 'danger', pressionado: 'dangerPressed', texto: 'textOnBrand' },
};

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Mostra um indicador e bloqueia novos toques, por exemplo durante o envio. */
  loading?: boolean;
  icon?: IconName;
};

export function Button({ label, onPress, variant = 'primary', disabled, loading, icon }: Props) {
  const e = estilos[variant];
  const inativo = disabled || loading;
  const corTexto: CorToken = disabled ? 'textDisabled' : e.texto;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inativo, busy: !!loading }}
      onPress={onPress}
      disabled={inativo}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: tokens.color[disabled ? 'disabled' : pressed ? e.pressionado : e.fundo],
          borderColor: e.borda ? tokens.color[e.borda] : 'transparent',
        },
      ]}
    >
      <View style={styles.conteudo}>
        {loading ? (
          <ActivityIndicator color={tokens.color[corTexto]} testID="button-loading" />
        ) : (
          icon && <Icon name={icon} color={corTexto} size={tokens.size.iconSm} />
        )}
        <Text variant="label" color={corTexto} style={styles.label}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: tokens.size.touch,
    paddingHorizontal: tokens.space.xl,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    justifyContent: 'center',
  },
  conteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.sm,
  },
  label: { fontWeight: tokens.font.weight.semibold },
});
