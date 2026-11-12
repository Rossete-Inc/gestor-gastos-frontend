import type { z } from 'zod';

import { ApiError, type bffSchemas } from '@/shared/api';
import type { BadgeTone } from '@/shared/ui';

export type Usuario = z.infer<typeof bffSchemas.AtualizarUsuarioResponse>;
export type Papel = Usuario['papel'];
export type Status = Usuario['status'];
export type UsuarioPatch = z.infer<typeof bffSchemas.AtualizarUsuarioBody>;

export const PAPEIS: Record<Papel, { label: string; tone: BadgeTone }> = {
  cliente: { label: 'Cliente', tone: 'neutral' },
  admin: { label: 'Admin', tone: 'brand' },
};

export const STATUS: Record<Status, { label: string; tone: BadgeTone }> = {
  ATIVO: { label: 'Ativo', tone: 'success' },
  BLOQUEADO: { label: 'Bloqueado', tone: 'danger' },
  PENDENTE_CONFIRMACAO: { label: 'Pendente', tone: 'warning' },
  EXCLUIDO: { label: 'Excluído', tone: 'neutral' },
};

export type TipoAcao = 'bloquear' | 'reativar' | 'tornarAdmin' | 'tornarCliente' | 'excluir';

/** Texto do botão e da confirmação de cada ação. */
export type Acao = {
  tipo: TipoAcao;
  label: string;
  danger: boolean;
  titulo: (nome: string) => string;
  mensagem: string;
  confirmar: string;
  /** O que vai para o PATCH; ausente na exclusão. */
  patch?: UsuarioPatch;
};

export const ACOES: Record<TipoAcao, Acao> = {
  bloquear: {
    tipo: 'bloquear',
    label: 'Bloquear',
    danger: true,
    titulo: (n) => `Bloquear ${n}?`,
    mensagem:
      'A pessoa sai de todas as sessões e não consegue entrar até ser reativada. Um acesso já aberto pode durar até 15 minutos.',
    confirmar: 'Bloquear',
    patch: { status: 'BLOQUEADO' },
  },
  reativar: {
    tipo: 'reativar',
    label: 'Reativar',
    danger: false,
    titulo: (n) => `Reativar ${n}?`,
    mensagem: 'A pessoa volta a conseguir entrar no app.',
    confirmar: 'Reativar',
    patch: { status: 'ATIVO' },
  },
  tornarAdmin: {
    tipo: 'tornarAdmin',
    label: 'Tornar admin',
    danger: false,
    titulo: (n) => `Tornar ${n} admin?`,
    mensagem: 'A pessoa ganha acesso à área de usuários a partir do próximo login.',
    confirmar: 'Tornar admin',
    patch: { papel: 'admin' },
  },
  tornarCliente: {
    tipo: 'tornarCliente',
    label: 'Tornar cliente',
    danger: false,
    titulo: (n) => `Tornar ${n} cliente?`,
    mensagem: 'A pessoa perde o acesso à área de usuários a partir do próximo login.',
    confirmar: 'Tornar cliente',
    patch: { papel: 'cliente' },
  },
  excluir: {
    tipo: 'excluir',
    label: 'Excluir conta',
    danger: true,
    titulo: (n) => `Excluir ${n}?`,
    mensagem:
      'A conta é removida na hora, e os gastos e as categorias da pessoa são apagados. Não dá para desfazer.',
    confirmar: 'Excluir',
  },
};

/**
 * Ações que fazem sentido para o usuário, pelas regras da spec: só ATIVO e
 * BLOQUEADO mudam; ninguém bloqueia nem exclui a si mesmo. As regras que
 * dependem dos outros perfis (último admin) ficam com o users-service.
 */
export function acoesPara(u: Usuario, meuId: string | undefined): Acao[] {
  if (u.status !== 'ATIVO' && u.status !== 'BLOQUEADO') return [];
  const euMesmo = u.id === meuId;
  const tipos: TipoAcao[] = [];
  if (!euMesmo) tipos.push(u.status === 'ATIVO' ? 'bloquear' : 'reativar');
  tipos.push(u.papel === 'admin' ? 'tornarCliente' : 'tornarAdmin');
  if (!euMesmo) tipos.push('excluir');
  return tipos.map((t) => ACOES[t]);
}

/** Mensagem para os erros das rotas /admin/*. */
export function mensagemDeErro(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Não foi possível concluir. Tente de novo.';
  switch (e.code) {
    case 'somente_admin':
      // O perfil já diz admin, mas o token ainda não: o papel novo vale a
      // partir do próximo login (spec, "Promover a admin").
      return 'Seu acesso de administrador vale a partir do próximo login. Saia e entre de novo.';
    case 'ultimo_admin':
      return 'O app precisa de pelo menos um administrador ativo. Promova outra pessoa antes.';
    case 'bloquear_a_si_mesmo':
      return 'Você não pode bloquear a sua própria conta.';
    case 'excluir_a_si_mesmo':
      return 'Você não pode excluir a sua própria conta.';
    case 'transicao_invalida':
      return 'Esta conta não pode mais ser alterada.';
    case 'usuario_nao_encontrado':
      return 'Esta conta não existe mais. A lista foi atualizada.';
    case 'cursor_invalido':
      return 'A lista mudou desde que você abriu. Recarregue para ver a versão atual.';
    case 'operacao_desconhecida':
      return 'Esta ação ainda não está disponível neste ambiente.';
    default:
      return e.detail;
  }
}

export const tomDoErro = (e: unknown) =>
  e instanceof ApiError && e.status === 0 ? ('offline' as const) : ('error' as const);
