import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { ApiError } from '@/shared/api';
import {
  Banner,
  Button,
  Carregando,
  ColorPicker,
  ConfirmDialog,
  MoneyField,
  Screen,
  Select,
  Text,
  TextField,
} from '@/shared/ui';

import {
  useArquivarCartao,
  useAtualizarCartao,
  useCartoes,
  useCriarCartao,
  useExcluirCartao,
} from '../api/queries';
import {
  CartaoFormSchema,
  DIAS,
  MAX_APELIDO,
  paraCartaoIn,
  valoresIniciais,
  type Cartao,
  type CartaoFormInput,
} from '../model/cartao';

type Props = {
  /** Sem id: novo cartão. Com id: edição, com arquivar e excluir. */
  id?: string;
  onConcluido: () => void;
  onVoltar: () => void;
};

// Novo cartão / Editar cartão (spec cartoes-credito, "Cadastro de cartão",
// "Edição de cartão" e "Arquivar e excluir cartão").
export function CartaoForm({ id, onConcluido, onVoltar }: Props) {
  const lista = useCartoes();
  const titulo = id ? 'Editar cartão' : 'Novo cartão';
  if (!id) return <Formulario titulo={titulo} onConcluido={onConcluido} onVoltar={onVoltar} />;

  if (lista.isPending) return <Carregando label="Carregando…" />;
  const cartao = lista.data?.itens.find((c) => c.id === id);
  if (lista.isError || !cartao) {
    return (
      <Screen title={titulo} onBack={onVoltar}>
        <Banner
          tone={lista.error instanceof ApiError && lista.error.status === 0 ? 'offline' : 'error'}
          message={
            lista.isError
              ? lista.error instanceof ApiError
                ? lista.error.detail
                : 'Não foi possível abrir o cartão.'
              : 'Este cartão não existe mais.'
          }
        />
        {lista.isError && (
          <Button label="Tentar de novo" variant="secondary" onPress={() => lista.refetch()} />
        )}
      </Screen>
    );
  }
  return (
    <Formulario titulo={titulo} cartao={cartao} onConcluido={onConcluido} onVoltar={onVoltar} />
  );
}

const campos = ['apelido', 'cor', 'diaFechamento', 'diaVencimento', 'limiteCentavos'] as const;

const opcoesDeDia = [{ opcoes: DIAS.map((d) => ({ valor: String(d), label: `Dia ${d}` })) }];

function Formulario({
  titulo,
  cartao,
  onConcluido,
  onVoltar,
}: {
  titulo: string;
  cartao?: Cartao;
  onConcluido: () => void;
  onVoltar: () => void;
}) {
  const criar = useCriarCartao();
  const atualizar = useAtualizarCartao(cartao?.id ?? '');
  const arquivar = useArquivarCartao(cartao?.id ?? '');
  const excluir = useExcluirCartao(cartao?.id ?? '');
  const salvar = cartao ? atualizar : criar;
  const [confirmando, setConfirmando] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CartaoFormInput>({
    resolver: zodResolver(CartaoFormSchema),
    defaultValues: valoresIniciais(cartao),
  });

  // Erros de campo do servidor (inclusive o apelido repetido) voltam para o
  // campo; o resto vira banner.
  const aoFalhar = (e: ApiError) => {
    for (const f of e.errors) {
      const campo = campos.find((c) => c === f.field);
      if (campo) setError(campo, { message: f.message });
    }
  };

  const enviar = handleSubmit((dados) =>
    salvar.mutate(paraCartaoIn(dados), { onSuccess: onConcluido, onError: aoFalhar }),
  );

  const confirmarExclusao = () =>
    excluir.mutate(undefined, {
      onSuccess: () => {
        setConfirmando(false);
        onConcluido();
      },
      onError: () => setConfirmando(false),
    });

  const erro =
    (salvar.error && salvar.error.errors.length === 0 ? salvar.error : null) ??
    arquivar.error ??
    excluir.error;

  return (
    <Screen
      title={titulo}
      onBack={onVoltar}
      footer={<Button label="Salvar cartão" onPress={enviar} loading={salvar.isPending} />}
    >
      {erro && <Banner tone={erro.status === 0 ? 'offline' : 'error'} message={mensagem(erro)} />}
      {cartao?.arquivado && (
        <Text color="textMuted">Cartão arquivado: ele não aparece no formulário de gasto.</Text>
      )}
      <Controller
        control={control}
        name="apelido"
        render={({ field }) => (
          <TextField
            label="Apelido"
            icon="credit-card"
            placeholder="Ex.: Nubank"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            maxLength={MAX_APELIDO}
            autoCapitalize="words"
            error={errors.apelido?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="diaFechamento"
        render={({ field }) => (
          <Select
            label="Dia de fechamento"
            placeholder="Escolha o dia"
            valor={field.value ? String(field.value) : null}
            secoes={opcoesDeDia}
            onChange={(v) => field.onChange(Number(v))}
            error={errors.diaFechamento?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="diaVencimento"
        render={({ field }) => (
          <Select
            label="Dia de vencimento"
            placeholder="Escolha o dia"
            valor={field.value ? String(field.value) : null}
            secoes={opcoesDeDia}
            onChange={(v) => field.onChange(Number(v))}
            error={errors.diaVencimento?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="limiteCentavos"
        render={({ field }) => (
          <MoneyField
            label="Limite"
            centavos={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={errors.limiteCentavos?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="cor"
        render={({ field }) => (
          <ColorPicker
            label="Cor"
            valor={field.value}
            onChange={field.onChange}
            error={errors.cor?.message}
          />
        )}
      />
      {cartao && (
        <>
          <Button
            label={cartao.arquivado ? 'Reativar cartão' : 'Arquivar cartão'}
            variant="secondary"
            loading={arquivar.isPending}
            onPress={() => arquivar.mutate(!cartao.arquivado, { onSuccess: onConcluido })}
          />
          <Button
            label="Excluir cartão"
            icon="trash"
            variant="ghost"
            onPress={() => setConfirmando(true)}
          />
        </>
      )}
      <ConfirmDialog
        visible={confirmando}
        title="Excluir cartão?"
        message="Só é possível excluir um cartão sem gastos. Com gastos, arquive-o."
        confirmLabel="Excluir"
        loading={excluir.isPending}
        onConfirm={confirmarExclusao}
        onCancel={() => setConfirmando(false)}
      />
    </Screen>
  );
}

function mensagem(e: ApiError): string {
  if (e.code === 'cartao_em_uso')
    return 'Este cartão tem gastos vinculados. Arquive-o em vez de excluir.';
  if (e.status === 404) return 'Este cartão não existe mais.';
  return e.detail;
}
