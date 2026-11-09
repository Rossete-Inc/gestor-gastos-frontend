// API pública da feature de autenticação. Tudo que não está aqui é privado.
export { CadastroForm } from './components/CadastroForm';
export { ConfirmarForm } from './components/ConfirmarForm';
export { LoginForm } from './components/LoginForm';
export { useSair } from './api/mutacoes';
export { useIniciarSessao, useSessao } from './sessao/useSessao';
export type { EstadoSessao, StatusSessao } from './sessao/sessao';
