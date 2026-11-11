import Feather from '@expo/vector-icons/Feather';

import { tokens, type CorToken } from './tokens';

// Os ícones do Figma (página Componentes, frame Ícones) têm os nomes do
// Feather. "wallet" não existe no Feather e fica como "credit-card".
const nomes = {
  'pie-chart': 'pie-chart',
  list: 'list',
  tag: 'tag',
  user: 'user',
  plus: 'plus',
  'chevron-left': 'chevron-left',
  'chevron-right': 'chevron-right',
  'chevron-down': 'chevron-down',
  'credit-card': 'credit-card',
  repeat: 'repeat',
  shield: 'shield',
  'log-out': 'log-out',
  trash: 'trash-2',
  mail: 'mail',
  lock: 'lock',
  eye: 'eye',
  'eye-off': 'eye-off',
  'wifi-off': 'wifi-off',
  'alert-circle': 'alert-circle',
  'check-circle': 'check-circle',
  'more-vertical': 'more-vertical',
  inbox: 'inbox',
  wallet: 'credit-card',
  edit: 'edit-2',
  check: 'check',
} as const satisfies Record<string, keyof typeof Feather.glyphMap>;

export type IconName = keyof typeof nomes;

type Props = {
  name: IconName;
  color?: CorToken;
  /** Cor que é dado e não token de UI, como a cor de uma categoria. */
  colorValue?: string;
  size?: number;
};

/** Ícone decorativo; quem precisa de rótulo é o componente que o contém. */
export function Icon({ name, color = 'text', colorValue, size = tokens.size.icon }: Props) {
  return (
    <Feather
      name={nomes[name]}
      size={size}
      color={colorValue ?? tokens.color[color]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
