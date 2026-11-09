// API pública do client do BFF.
// - bff: funções e tipos gerados pelo orval a partir de openapi/bff.yaml.
// - bffSchemas: schemas Zod gerados, para validar o que chega da API.
export * as bff from './generated/bff';
export type * from './generated/bff';
export * as bffSchemas from './generated/bff.zod';
export { ApiError, configurarAutenticacao } from './http';
export type { Autenticacao, ErroDeCampo } from './http';
export { criarQueryClient, deveRepetir, queryClient } from './queryClient';
