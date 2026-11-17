import { router } from 'expo-router';

import { ConvitesView } from '@/features/colaboracao';

const voltar = () => (router.canGoBack() ? router.back() : router.replace('/painel'));

// Convites recebidos; ao aceitar, a conta do dono já fica ativa.
export default function Convites() {
  return <ConvitesView onVoltar={voltar} onAceito={() => router.navigate('/painel')} />;
}
