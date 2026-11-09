import { Text as RNText, type TextProps } from 'react-native';

import { tokens, type CorToken } from './tokens';

export type TextVariant = 'display' | 'title' | 'subtitle' | 'body' | 'label' | 'caption';

const pesos: Record<TextVariant, keyof typeof tokens.font.weight> = {
  display: 'bold',
  title: 'semibold',
  subtitle: 'semibold',
  body: 'regular',
  label: 'medium',
  caption: 'regular',
};

type Props = TextProps & { variant?: TextVariant; color?: CorToken; align?: 'left' | 'center' };

/** Texto com a escala tipográfica dos tokens. */
export function Text({ variant = 'body', color = 'text', align, style, ...rest }: Props) {
  return (
    <RNText
      {...rest}
      style={[
        {
          fontFamily: tokens.font.family,
          fontSize: tokens.font.size[variant],
          lineHeight: tokens.font.lineHeight[variant],
          fontWeight: tokens.font.weight[pesos[variant]],
          color: tokens.color[color],
          textAlign: align,
        },
        style,
      ]}
    />
  );
}
