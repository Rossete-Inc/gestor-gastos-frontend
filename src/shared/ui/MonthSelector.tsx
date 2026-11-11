import { Pressable, StyleSheet, View } from 'react-native';

import { rotuloDoMes, somarMeses } from '@/shared/lib';

import { Icon } from './Icon';
import { Text } from './Text';
import { tokens } from './tokens';

// Componente MonthSelector da referência: "< Novembro de 2026 >".
type Props = {
  /** Mês no formato AAAA-MM. */
  mes: string;
  onChange: (mes: string) => void;
};

export function MonthSelector({ mes, onChange }: Props) {
  return (
    <View style={styles.container}>
      <Seta
        label="Mês anterior"
        icone="chevron-left"
        onPress={() => onChange(somarMeses(mes, -1))}
      />
      <Text variant="subtitle" accessibilityRole="header" style={styles.rotulo}>
        {rotuloDoMes(mes)}
      </Text>
      <Seta
        label="Próximo mês"
        icone="chevron-right"
        onPress={() => onChange(somarMeses(mes, 1))}
      />
    </View>
  );
}

function Seta({
  label,
  icone,
  onPress,
}: {
  label: string;
  icone: 'chevron-left' | 'chevron-right';
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.seta}
    >
      <Icon name={icone} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center' },
  rotulo: { flex: 1, textAlign: 'center', fontWeight: tokens.font.weight.bold },
  seta: {
    width: tokens.size.touch,
    height: tokens.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
