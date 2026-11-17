// API pública da feature de colaboração (change colaboradores, ADR 0010).
export { AcoesDaConta } from './components/AcoesDaConta';
export { BarraDaConta } from './components/BarraDaConta';
export { ColaboradoresView } from './components/ColaboradoresView';
export { ConvitesView } from './components/ConvitesView';
export { colaboracaoKeys, useContas } from './api/queries';
export {
  useContaAtiva,
  useIniciarContaAtiva,
  useMeuId,
  usePodeEscrever,
} from './hooks/useContaAtiva';
export type { ContaAtivaInfo, PapelNaConta } from './hooks/useContaAtiva';
export type { ContaAlheia, PapelColaborador } from './model/contaAtiva';
