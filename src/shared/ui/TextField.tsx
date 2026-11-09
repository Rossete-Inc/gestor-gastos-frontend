import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { tokens } from './tokens';

// Componente Input do Figma: estados Default, Focused, Error e Disabled.
// No React 19, ref é uma prop comum: dispensa forwardRef.
type Props = Omit<ComponentProps<typeof TextInput>, 'style' | 'editable'> & {
  label: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  icon?: IconName;
  /** Campo de senha com botão de mostrar/ocultar. */
  password?: boolean;
};

export function TextField({
  label,
  error,
  hint,
  disabled,
  icon,
  password,
  onFocus,
  onBlur,
  ref,
  ...rest
}: Props) {
  const [focado, setFocado] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const borda = error ? 'danger' : focado ? 'focus' : 'borderStrong';

  return (
    <View style={styles.container}>
      <Text variant="label" color={disabled ? 'textDisabled' : 'text'}>
        {label}
      </Text>
      <View
        style={[
          styles.campo,
          {
            borderColor: tokens.color[borda],
            borderWidth: focado || error ? 2 : 1,
            backgroundColor: tokens.color[disabled ? 'surfaceMuted' : 'surface'],
          },
        ]}
      >
        {icon && <Icon name={icon} color="textMuted" size={tokens.size.iconSm} />}
        <TextInput
          ref={ref}
          {...rest}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          aria-invalid={!!error}
          editable={!disabled}
          secureTextEntry={password && !visivel}
          placeholderTextColor={tokens.color.textSubtle}
          onFocus={(e) => {
            setFocado(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocado(false);
            onBlur?.(e);
          }}
          style={[styles.input, { color: tokens.color[disabled ? 'textDisabled' : 'text'] }]}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visivel ? 'Ocultar senha' : 'Mostrar senha'}
            onPress={() => setVisivel((v) => !v)}
            hitSlop={tokens.space.md}
          >
            <Icon name={visivel ? 'eye-off' : 'eye'} color="textMuted" size={tokens.size.iconSm} />
          </Pressable>
        )}
      </View>
      {error ? (
        <Text variant="caption" color="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="textMuted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
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
  },
  input: {
    flex: 1,
    fontSize: tokens.font.size.body,
    paddingVertical: tokens.space.sm,
  },
});
