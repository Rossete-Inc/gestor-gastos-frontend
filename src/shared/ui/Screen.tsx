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
};

/** Moldura de tela: área segura, fundo, rolagem e largura máxima na web. */
export function Screen({ children, title, onBack, centered }: Props) {
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  flex: { flex: 1 },
  conteudo: { flexGrow: 1, padding: tokens.space.xl },
  centrado: { justifyContent: 'center' },
  // 480 px: largura do layout mobile do Figma (390) com folga, centralizado na web.
  coluna: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: tokens.space.lg },
});
