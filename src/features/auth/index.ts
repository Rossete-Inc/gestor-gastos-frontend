// API pública da feature de autenticação. Tudo que não está aqui é privado.
export { AlterarSenhaForm } from './components/AlterarSenhaForm';
export { CadastroForm } from './components/CadastroForm';
export { ConfirmarForm } from './components/ConfirmarForm';
export { EsqueciSenhaForm } from './components/EsqueciSenhaForm';
export { LoginForm } from './components/LoginForm';
export { RedefinirSenhaForm } from './components/RedefinirSenhaForm';
export { useSair } from './api/mutacoes';
export { useIniciarSessao, useSessao } from './sessao/useSessao';
export type { EstadoSessao, StatusSessao } from './sessao/sessao';
