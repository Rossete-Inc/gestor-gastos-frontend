import { preferencias } from '@/shared/platform';

import { contaAtiva, reiniciarContaAtiva, type ContaAlheia } from './contaAtiva';

const CHAVE = 'gestor-gastos.conta-ativa';
const ana: ContaAlheia = { donoId: 'ana', nomeDono: 'Ana', papel: 'EDITOR' };

beforeEach(async () => {
  reiniciarContaAtiva();
  await preferencias.remove(CHAVE);
});

it('começa na própria conta e lê a escolha guardada (spec, "ao reabrir")', async () => {
  await preferencias.set(CHAVE, JSON.stringify(ana));
  expect(contaAtiva.obter().carregada).toBe(false);
  await contaAtiva.iniciar();
  expect(contaAtiva.obter()).toEqual({ conta: ana, acessoPerdido: null, carregada: true });
  expect(contaAtiva.donoId()).toBe('ana');
  // Ler de novo não muda nada.
  await preferencias.remove(CHAVE);
  await contaAtiva.iniciar();
  expect(contaAtiva.donoId()).toBe('ana');
});

it.each(['{x', JSON.stringify({ donoId: 'ana', nomeDono: 'Ana', papel: 'DONO' }), '42'])(
  'guardado inválido (%s) vale a própria conta',
  async (texto) => {
    await preferencias.set(CHAVE, texto);
    await contaAtiva.iniciar();
    expect(contaAtiva.obter().conta).toBeNull();
  },
);

it('escolher guarda a conta, avisa os assinantes e diz se mudou', async () => {
  const ouvinte = jest.fn();
  const parar = contaAtiva.assinar(ouvinte);
  expect(await contaAtiva.escolher(ana)).toBe(true);
  expect(ouvinte).toHaveBeenCalled();
  expect(JSON.parse((await preferencias.get(CHAVE)) ?? '')).toEqual(ana);
  expect(await contaAtiva.escolher(ana)).toBe(false);
  expect(await contaAtiva.escolher(null)).toBe(true);
  expect(await preferencias.get(CHAVE)).toBeNull();
  parar();
});

it('perder volta para a própria conta com o aviso, só se for a conta ativa', async () => {
  await contaAtiva.escolher(ana);
  expect(await contaAtiva.perder('outra')).toBe(false);
  expect(await contaAtiva.perder('ana')).toBe(true);
  expect(contaAtiva.obter()).toMatchObject({ conta: null, acessoPerdido: 'Ana' });
  expect(await preferencias.get(CHAVE)).toBeNull();
  contaAtiva.dispensarAviso();
  expect(contaAtiva.obter().acessoPerdido).toBeNull();
});

it('sincronizar atualiza o papel ou perde a conta que saiu da lista', async () => {
  expect(await contaAtiva.sincronizar([ana])).toBe(false);
  await contaAtiva.escolher(ana);
  const leitor = { ...ana, papel: 'LEITOR' as const };
  expect(await contaAtiva.sincronizar([leitor])).toBe(false);
  expect(contaAtiva.obter().conta).toEqual(leitor);
  expect(JSON.parse((await preferencias.get(CHAVE)) ?? '').papel).toBe('LEITOR');
  expect(await contaAtiva.sincronizar([leitor])).toBe(false);
  expect(await contaAtiva.sincronizar([])).toBe(true);
  expect(contaAtiva.obter()).toMatchObject({ conta: null, acessoPerdido: 'Ana' });
});

it('limpar (logout) volta para a própria conta sem aviso', async () => {
  await contaAtiva.escolher(ana);
  await contaAtiva.limpar();
  expect(contaAtiva.obter()).toMatchObject({ conta: null, acessoPerdido: null });
  expect(await preferencias.get(CHAVE)).toBeNull();
});
