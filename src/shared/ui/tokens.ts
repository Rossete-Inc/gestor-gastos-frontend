// Tokens do design system.
//
// PROVISÓRIOS: o Figma MCP atingiu o limite do plano Starter antes da leitura
// das variáveis (arquivo 4d4L6ZY0vCBjriiN5bPjDx, página Fundamentos). Os
// nomes seguem as coleções do Figma; os valores seguem as telas exportadas em
// Gestor_de_Gastos_App (marca índigo, grupo Cartão violeta, Fixo azul-céu),
// na paleta Tailwind. Quando o Figma liberar, troque só os valores aqui:
// nenhum componente usa cor ou medida literal.

const paleta = {
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate700: '#334155',
  slate900: '#0F172A',
  white: '#FFFFFF',
  emerald50: '#ECFDF5',
  emerald600: '#059669',
  emerald700: '#047857',
  red50: '#FEF2F2',
  red600: '#DC2626',
  red700: '#B91C1C',
  amber50: '#FFFBEB',
  amber700: '#B45309',
  indigo50: '#EEF2FF',
  indigo600: '#4F46E5',
  indigo700: '#4338CA',
  violet50: '#F5F3FF',
  violet600: '#7C3AED',
  sky50: '#F0F9FF',
  sky700: '#0369A1',
} as const;

export const tokens = {
  color: {
    bg: paleta.slate50,
    surface: paleta.white,
    surfaceMuted: paleta.slate100,
    border: paleta.slate200,
    borderStrong: paleta.slate300,
    text: paleta.slate900,
    textMuted: paleta.slate500,
    textSubtle: paleta.slate400,
    textOnBrand: paleta.white,
    brand: paleta.indigo600,
    brandPressed: paleta.indigo700,
    brandSoft: paleta.indigo50,
    danger: paleta.red600,
    dangerPressed: paleta.red700,
    dangerSoft: paleta.red50,
    success: paleta.emerald700,
    successSoft: paleta.emerald50,
    warning: paleta.amber700,
    warningSoft: paleta.amber50,
    focus: paleta.indigo600,
    cartao: paleta.violet600,
    cartaoSoft: paleta.violet50,
    fixo: paleta.sky700,
    fixoSoft: paleta.sky50,
    disabled: paleta.slate200,
    textDisabled: paleta.slate400,
    // Fundo escurecido atrás de diálogos: slate900 com 50% de opacidade.
    overlay: 'rgba(15, 23, 42, 0.5)',
  },
  space: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 6, md: 10, lg: 16, full: 999 },
  font: {
    // Inter no Figma; a fonte do sistema até a fonte ser carregada no app.
    family: undefined as string | undefined,
    size: { caption: 12, label: 14, body: 16, subtitle: 18, title: 22, display: 28 },
    weight: { regular: '400', medium: '500', semibold: '600', bold: '700' },
    lineHeight: { caption: 16, label: 20, body: 24, subtitle: 26, title: 28, display: 34 },
  },
  size: { touch: 48, icon: 24, iconSm: 18, input: 48, header: 56 },
} as const;

export type Tokens = typeof tokens;
export type CorToken = keyof Tokens['color'];
