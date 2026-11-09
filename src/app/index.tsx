import { StyleSheet, Text, View } from 'react-native';

import { env } from '@/shared/config';

// Tela provisória da 5.5: confirma que o app sobe e leu o ambiente. Na 5.7
// esta rota passa a redirecionar para o login ou para o app.
export default function Inicio() {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Gestor de Gastos</Text>
      <Text>Ambiente: {env.appEnv}</Text>
      <Text>API: {env.apiUrl}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  titulo: { fontSize: 22, fontWeight: '600' },
});
