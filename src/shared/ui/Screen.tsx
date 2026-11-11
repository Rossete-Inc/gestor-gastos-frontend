import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Header } from './Header';
import { tokens } from './tokens';

type Props = {
  children: ReactNode;
  /** Mostra o Header com este título. */
  title?: string;
  onBack?: () => void;
  /** Centraliza o conteúdo na vertical, como nas telas de login. */
  centered?: boolean;
  /** Fixo abaixo da rolagem, como o "Salvar gasto" da referência. */
  footer?: ReactNode;
  /** Sobreposto à tela, fora da rolagem, como o FAB. */
  overlay?: ReactNode;
};

/** Moldura de tela: área segura, fundo, rolagem e largura máxima na web. */
export function Screen({ children, title, onBack, centered, footer, overlay }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        {title && <Header title={title} onBack={onBack} />}
        <ScrollView
          contentContainerStyle={[styles.conteudo, centered && styles.centrado]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.coluna}>{children}</View>
        </ScrollView>
        {footer && (
          <View style={styles.rodape}>
            <View style={styles.coluna}>{footer}</View>
          </View>
        )}
        {overlay}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  flex: { flex: 1 },
  conteudo: { flexGrow: 1, padding: tokens.space.xl },
  centrado: { justifyContent: 'center' },
  rodape: { paddingHorizontal: tokens.space.xl, paddingVertical: tokens.space.lg },
  // 480 px: largura do layout mobile do Figma (390) com folga, centralizado na web.
  coluna: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: tokens.space.lg },
});
