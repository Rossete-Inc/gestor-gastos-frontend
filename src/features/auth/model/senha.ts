// Política de senha da spec `autenticacao` (a mesma do User Pool): mínimo de
// 8 caracteres, com letra maiúscula, letra minúscula e número.

const regras: { teste: (s: string) => boolean; descricao: string }[] = [
  { teste: (s) => s.length >= 8, descricao: 'ter pelo menos 8 caracteres' },
  { teste: (s) => /[A-Z]/.test(s), descricao: 'ter uma letra maiúscula' },
  { teste: (s) => /[a-z]/.test(s), descricao: 'ter uma letra minúscula' },
  { teste: (s) => /\d/.test(s), descricao: 'ter um número' },
];

/** Regras que a senha não atende, já em texto para o usuário. */
export function regrasNaoAtendidas(senha: string): string[] {
  return regras.filter((r) => !r.teste(senha)).map((r) => r.descricao);
}

/** "A senha precisa ter pelo menos 8 caracteres e ter uma letra maiúscula." */
export function descreverRegras(faltando: string[]): string {
  if (faltando.length === 0) return '';
  const lista =
    faltando.length === 1
      ? faltando[0]
      : `${faltando.slice(0, -1).join(', ')} e ${faltando[faltando.length - 1]}`;
  return `A senha precisa ${lista}.`;
}

// regrasNaoAtendidas('abc123')
// // => [ 'ter pelo menos 8 caracteres', 'ter uma letra maiúscula' ]
