import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/shared/api';
import {
  brParaISO,
  brParaMes,
  formatarCentavos,
  mascararDataBR,
  mascararMesBR,
  mesDaFatura,
  previaParcelas,
  rotuloCurtoDoMes,
} from '@/shared/lib';
import {
  Badge,
  Banner,
  Button,
  Carregando,
  ConfirmDialog,
  MoneyField,
  Screen,
  SegmentedControl,
  Select,
  Text,
  TextField,
  tokens,
  type SecaoSelect,
} from '@/shared/ui';

import {
  useAtualizarGasto,
  useCriarGasto,
  useExcluirGasto,
  useTelaGastoForm,
} from '../api/queries';
import {
  GastoFormSchema,
  MAX_DESCRICAO,
  MODOS_DE_PARCELA,
  ROTULO_DO_GRUPO,
  TIPOS_DE_LANCAMENTO,
  grupoDaCategoria,
  inteiro,
  novaChave,
  paraGastoIn,
  seloDaSerie,
  valoresIniciais,
  type Cartao,
  type CategoriasPorGrupo,
  type Escopo,
  type Gasto,
  type GastoFormInput,
} from '../model/gasto';
import { EscopoSerieDialog } from './EscopoSerieDialog';

type Props = {
  /** Sem id: novo gasto. Com id: edição, com a opção de excluir. */
  id?: string;
  onConcluido: () => void;
  onVoltar: () => void;
};

// Tela Novo gasto / Editar gasto (spec lancamento-gastos, "Lançar gasto",
// "Editar gasto" e "Excluir gasto"). Carrega as categorias, os cartões
// ativos e, na edição, o gasto; o formulário só monta depois, já com os
// valores certos.
export function GastoForm({ id, onConcluido, onVoltar }: Props) {
  const tela = useTelaGastoForm(id);
  const titulo = id ? 'Editar gasto' : 'Novo gasto';

  if (tela.isPending) return <Carregando label="Carregando…" />;
  if (tela.isError) {
    const naoEncontrado = tela.error instanceof ApiError && tela.error.status === 404;
    return (
      <Screen title={titulo} onBack={onVoltar}>
        <Banner
          tone={tela.error instanceof ApiError && tela.error.status === 0 ? 'offline' : 'error'}
          message={
            naoEncontrado
              ? 'Este gasto não existe mais.'
              : tela.error instanceof ApiError
                ? tela.error.detail
                : 'Não foi possível abrir o formulário.'
          }
        />
        {!naoEncontrado && (
          <Button label="Tentar de novo" variant="secondary" onPress={() => tela.refetch()} />
        )}
      </Screen>
    );
  }
  return (
    <Formulario
      titulo={titulo}
      categorias={tela.data.categorias}
      cartoes={tela.data.cartoes}
      gasto={tela.data.gasto}
      onConcluido={onConcluido}
      onVoltar={onVoltar}
    />
  );
}

const campos = [
  'valorCentavos',
  'data',
  'categoriaId',
  'cartaoId',
  'descricao',
  'parcelas',
  'parcelaAtual',
  'mesFinal',
] as const;

type FormProps = {
  titulo: string;
  categorias: CategoriasPorGrupo;
  cartoes: readonly Cartao[];
  gasto?: Gasto;
  onConcluido: () => void;
  onVoltar: () => void;
};

function Formulario({ titulo, categorias, cartoes, gasto, onConcluido, onVoltar }: FormProps) {
  const criar = useCriarGasto();
  const atualizar = useAtualizarGasto(gasto?.id ?? '');
  const excluir = useExcluirGasto();
  const salvar = gasto ? atualizar : criar;
  const [confirmando, setConfirmando] = useState(false);
  // Num gasto de série, salvar e excluir pedem o alcance antes.
  const [escopoPara, setEscopoPara] = useState<'salvar' | 'excluir' | null>(null);
  const [pendente, setPendente] = useState<GastoFormInput | null>(null);
  // Uma chave por formulário: reenviar depois de uma falha de rede não
  // duplica o lançamento (o serviço devolve o mesmo gasto).
  const [chave] = useState(novaChave);
  const posicao = gasto?.serie ? posicaoDaSerie(gasto) : null;

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<GastoFormInput>({
    resolver: zodResolver(GastoFormSchema),
    defaultValues: valoresIniciais(gasto),
  });

  // Erros de campo do servidor voltam para o campo; o resto vira banner.
  const aoFalhar = (e: ApiError) => {
    for (const f of e.errors) {
      const campo = campos.find((c) => c === f.field);
      if (campo) setError(campo, { message: f.message });
    }
  };

  const grupo = grupoDaCategoria(categorias, useWatch({ control, name: 'categoriaId' }));
  const cartaoId = useWatch({ control, name: 'cartaoId' });
  const data = useWatch({ control, name: 'data' });
  const tipo = useWatch({ control, name: 'tipo' });
  const modoParcela = useWatch({ control, name: 'modoParcela' });
  const valor = useWatch({ control, name: 'valorCentavos' });
  const parcelas = useWatch({ control, name: 'parcelas' });
  const parcelaAtual = useWatch({ control, name: 'parcelaAtual' });
  const mesFinal = useWatch({ control, name: 'mesFinal' });

  const gravar = (dados: GastoFormInput, escopo?: Escopo) => {
    const opcoes = { onSuccess: onConcluido, onError: aoFalhar };
    if (gasto)
      atualizar.mutate({ dados: paraGastoIn(dados), ...(escopo ? { escopo } : {}) }, opcoes);
    else criar.mutate(paraGastoIn(dados, chave), opcoes);
  };

  const enviar = handleSubmit((dados) => {
    // Categoria de cartão exige cartão (spec, "Gasto de cartão sem cartão");
    // o BFF confere de novo.
    if (grupoDaCategoria(categorias, dados.categoriaId) === 'CARTAO' && !dados.cartaoId) {
      setError('cartaoId', { message: 'Escolha o cartão.' });
      return;
    }
    if (gasto?.serie) {
      setPendente(dados);
      setEscopoPara('salvar');
      return;
    }
    gravar(dados);
  });

  const excluirGasto = (escopo?: Escopo) => {
    if (!gasto) return;
    excluir.mutate(
      { id: gasto.id, ...(escopo ? { escopo } : {}) },
      {
        onSuccess: () => {
          setConfirmando(false);
          onConcluido();
        },
        onError: () => setConfirmando(false),
      },
    );
  };

  const escolherEscopo = (escopo: Escopo) => {
    const acao = escopoPara;
    setEscopoPara(null);
    if (acao === 'excluir') excluirGasto(escopo);
    else if (pendente) gravar(pendente, escopo);
  };

  const erro = salvar.error && salvar.error.errors.length === 0 ? salvar.error : excluir.error;
  const fatura = faturaPrevista(cartoes, cartaoId, data);
  const parcelado = !gasto && tipo === 'PARCELADO';
  const previa = parcelado
    ? textoDaPrevia(
        previaParcelas({
          modo: modoParcela,
          valorCentavos: valor,
          parcelas: inteiro(parcelas) ?? 0,
          parcelaAtual: inteiro(parcelaAtual) ?? 1,
          mesFinal: brParaMes(mesFinal) ?? '',
          primeiroMes: mesDaCompra(cartoes, cartaoId, data) ?? '',
        }),
      )
    : null;

  return (
    <Screen
      title={titulo}
      onBack={onVoltar}
      footer={<Button label="Salvar gasto" onPress={enviar} loading={salvar.isPending} />}
    >
      {erro && <Banner tone={erro.status === 0 ? 'offline' : 'error'} message={mensagem(erro)} />}
      {posicao && (
        <View style={styles.grupo}>
          <Text variant="caption" color="textMuted">
            {gasto?.serie?.tipo === 'PARCELAMENTO' ? 'Parcelamento' : 'Recorrência'}
          </Text>
          <Badge label={posicao} tone="neutral" style={styles.selo} />
        </View>
      )}
      {!gasto && (
        <Controller
          control={control}
          name="tipo"
          render={({ field }) => (
            <SegmentedControl
              label="Como lançar"
              opcoes={TIPOS_DE_LANCAMENTO}
              valor={field.value}
              onChange={field.onChange}
            />
          )}
        />
      )}
      {parcelado && (
        <Controller
          control={control}
          name="modoParcela"
          render={({ field }) => (
            <SegmentedControl
              label="Informar"
              opcoes={MODOS_DE_PARCELA}
              valor={field.value}
              onChange={field.onChange}
            />
          )}
        />
      )}
      <Controller
        control={control}
        name="valorCentavos"
        render={({ field }) => (
          <MoneyField
            label={
              parcelado ? (modoParcela === 'TOTAL' ? 'Valor total' : 'Valor da parcela') : 'Valor'
            }
            centavos={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={errors.valorCentavos?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="categoriaId"
        render={({ field }) => (
          <Select
            label="Categoria"
            placeholder="Escolha a categoria"
            valor={field.value || null}
            secoes={secoes(categorias)}
            onChange={field.onChange}
            error={errors.categoriaId?.message}
          />
        )}
      />
      {grupo && (
        // O grupo não se escolhe: é o da categoria (spec, "Lançar gasto").
        <View style={styles.grupo}>
          <Text variant="caption" color="textMuted">
            Grupo
          </Text>
          <Badge
            label={ROTULO_DO_GRUPO[grupo]}
            tone={grupo === 'CARTAO' ? 'cartao' : 'fixo'}
            style={styles.selo}
          />
        </View>
      )}
      {grupo && (
        <Controller
          control={control}
          name="cartaoId"
          render={({ field }) => (
            <Select
              label={grupo === 'CARTAO' ? 'Cartão' : 'Pagar no cartão (opcional)'}
              placeholder="Escolha o cartão"
              valor={grupo === 'CARTAO' ? field.value || null : field.value}
              secoes={secoesDeCartao(cartoes, grupo === 'FIXO')}
              onChange={field.onChange}
              error={errors.cartaoId?.message}
            />
          )}
        />
      )}
      {grupo === 'CARTAO' && cartoes.length === 0 && (
        <Text variant="caption" color="textMuted">
          Cadastre um cartão na aba Cartões para lançar gastos de cartão.
        </Text>
      )}
      <Controller
        control={control}
        name="data"
        render={({ field }) => (
          <TextField
            label="Data"
            placeholder="DD/MM/AAAA"
            value={field.value}
            onChangeText={(t) => field.onChange(mascararDataBR(t))}
            onBlur={field.onBlur}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={10}
            error={errors.data?.message}
            {...(fatura ? { hint: `Entra na fatura de ${fatura}` } : {})}
          />
        )}
      />
      <Controller
        control={control}
        name="descricao"
        render={({ field }) => (
          <TextField
            label="Descrição"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            maxLength={MAX_DESCRICAO}
            autoCapitalize="sentences"
            hint={`Opcional · até ${MAX_DESCRICAO} caracteres`}
            error={errors.descricao?.message}
          />
        )}
      />
      {parcelado && (
        <View style={styles.linha}>
          {modoParcela === 'PARCELA' && (
            <View style={styles.metade}>
              <Controller
                control={control}
                name="parcelaAtual"
                render={({ field }) => (
                  <TextField
                    label="Parcela atual"
                    placeholder="1"
                    value={field.value}
                    onChangeText={(t) => field.onChange(t.replace(/\D/g, '').slice(0, 2))}
                    onBlur={field.onBlur}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    error={errors.parcelaAtual?.message}
                  />
                )}
              />
            </View>
          )}
          <View style={styles.metade}>
            <Controller
              control={control}
              name="parcelas"
              render={({ field }) => (
                <TextField
                  label={modoParcela === 'PARCELA' ? 'Total de parcelas' : 'Parcelas'}
                  placeholder="3"
                  value={field.value}
                  onChangeText={(t) => field.onChange(t.replace(/\D/g, '').slice(0, 2))}
                  onBlur={field.onBlur}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  error={errors.parcelas?.message}
                />
              )}
            />
          </View>
        </View>
      )}
      {((parcelado && modoParcela === 'PARCELA') || (!gasto && tipo === 'RECORRENTE')) && (
        <Controller
          control={control}
          name="mesFinal"
          render={({ field }) => (
            <TextField
              label={parcelado ? 'Ou mês da última parcela' : 'Mês final (opcional)'}
              placeholder="MM/AAAA"
              value={field.value}
              onChangeText={(t) => field.onChange(mascararMesBR(t))}
              onBlur={field.onBlur}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={7}
              hint={
                parcelado
                  ? 'A fatura da última parcela, se não souber o total.'
                  : 'Repete todo mês, no mesmo dia, até este mês ou até você encerrar.'
              }
              error={errors.mesFinal?.message}
            />
          )}
        />
      )}
      {previa && (
        <Text testID="previa-parcelas" variant="body" style={styles.previa}>
          {previa}
        </Text>
      )}
      {gasto && (
        <Button
          label="Excluir gasto"
          icon="trash"
          variant="ghost"
          onPress={() => (gasto.serie ? setEscopoPara('excluir') : setConfirmando(true))}
        />
      )}
      <ConfirmDialog
        visible={confirmando}
        title="Excluir gasto?"
        message="O gasto deixa de aparecer na lista e nos totais."
        confirmLabel="Excluir"
        loading={excluir.isPending}
        onConfirm={() => excluirGasto()}
        onCancel={() => setConfirmando(false)}
      />
      {posicao && (
        <EscopoSerieDialog
          acao={escopoPara}
          posicao={posicao}
          onEscolher={escolherEscopo}
          onCancel={() => setEscopoPara(null)}
        />
      )}
    </Screen>
  );
}

function secoesDeCartao(cartoes: readonly Cartao[], comSemCartao: boolean): SecaoSelect[] {
  const opcoes = cartoes.map((c) => ({ valor: c.id, label: c.apelido, cor: c.cor }));
  return [{ opcoes: comSemCartao ? [{ valor: '', label: 'Sem cartão' }, ...opcoes] : opcoes }];
}

/** "dez/2026": a fatura em que o gasto vai entrar, se cartão e data valerem. */
function faturaPrevista(cartoes: readonly Cartao[], cartaoId: string, data: string): string | null {
  const c = cartoes.find((x) => x.id === cartaoId);
  const iso = brParaISO(data);
  if (!c || !iso) return null;
  const mes = mesDaFatura(iso, c.diaFechamento, c.diaVencimento);
  return mes ? rotuloCurtoDoMes(mes) : null;
}

/** Mês de referência (AAAA-MM) da compra: o da fatura, ou o da data. */
function mesDaCompra(cartoes: readonly Cartao[], cartaoId: string, data: string): string | null {
  const iso = brParaISO(data);
  if (!iso) return null;
  const c = cartoes.find((x) => x.id === cartaoId);
  return c ? mesDaFatura(iso, c.diaFechamento, c.diaVencimento) : iso.slice(0, 7);
}

/** "3× de R$ 400,00 · dez/2026 a fev/2027", com a 1ª diferente se houver resto. */
function textoDaPrevia(p: ReturnType<typeof previaParcelas>): string | null {
  if (!p || !p.primeiroMes) return null;
  const meses = `${rotuloCurtoDoMes(p.primeiroMes)} a ${rotuloCurtoDoMes(p.ultimoMes)}`;
  const valores =
    p.valorPrimeira === p.valorParcela
      ? `${p.criadas}× de ${formatarCentavos(p.valorParcela)}`
      : `1ª de ${formatarCentavos(p.valorPrimeira)} e ${p.criadas - 1}× de ${formatarCentavos(p.valorParcela)}`;
  return `${valores} · ${meses}`;
}

/** "Parcela 3/10" ou "Recorrente". */
function posicaoDaSerie(g: Gasto): string {
  const selo = seloDaSerie(g.serie) ?? '';
  return g.serie?.tipo === 'PARCELAMENTO' ? `Parcela ${selo}` : selo;
}

function secoes(cats: CategoriasPorGrupo): SecaoSelect[] {
  return (['CARTAO', 'FIXO'] as const).map((g) => ({
    titulo: ROTULO_DO_GRUPO[g],
    opcoes: cats[g].map((c) => ({ valor: c.id, label: c.nome, cor: c.cor })),
  }));
}

function mensagem(e: ApiError): string {
  if (e.status === 404) return 'Este gasto não existe mais.';
  return e.detail;
}

const styles = StyleSheet.create({
  grupo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    marginTop: -tokens.space.sm,
  },
  selo: { alignSelf: 'center' },
  linha: { flexDirection: 'row', gap: tokens.space.md },
  metade: { flex: 1 },
  previa: { fontWeight: tokens.font.weight.semibold },
});
