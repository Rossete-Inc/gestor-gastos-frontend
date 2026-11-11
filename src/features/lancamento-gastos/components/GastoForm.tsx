import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/shared/api';
import { mascararDataBR } from '@/shared/lib';
import {
  Badge,
  Banner,
  Button,
  Carregando,
  ConfirmDialog,
  MoneyField,
  Screen,
  Select,
  Switch,
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
  ROTULO_DO_GRUPO,
  grupoDaCategoria,
  paraGastoIn,
  valoresIniciais,
  type CategoriasPorGrupo,
  type Gasto,
  type GastoFormInput,
} from '../model/gasto';

type Props = {
  /** Sem id: novo gasto. Com id: edição, com a opção de excluir. */
  id?: string;
  onConcluido: () => void;
  onVoltar: () => void;
};

// Tela Novo gasto / Editar gasto (spec lancamento-gastos, "Lançar gasto",
// "Editar gasto" e "Excluir gasto"). Carrega as categorias e, na edição, o
// gasto; o formulário só monta depois, já com os valores certos.
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
      gasto={tela.data.gasto}
      onConcluido={onConcluido}
      onVoltar={onVoltar}
    />
  );
}

const campos = ['valorCentavos', 'data', 'categoriaId', 'descricao'] as const;

type FormProps = {
  titulo: string;
  categorias: CategoriasPorGrupo;
  gasto?: Gasto;
  onConcluido: () => void;
  onVoltar: () => void;
};

function Formulario({ titulo, categorias, gasto, onConcluido, onVoltar }: FormProps) {
  const criar = useCriarGasto();
  const atualizar = useAtualizarGasto(gasto?.id ?? '');
  const excluir = useExcluirGasto();
  const salvar = gasto ? atualizar : criar;
  const [confirmando, setConfirmando] = useState(false);

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

  const enviar = handleSubmit((dados) =>
    salvar.mutate(paraGastoIn(dados), { onSuccess: onConcluido, onError: aoFalhar }),
  );

  const confirmarExclusao = () => {
    if (!gasto) return;
    excluir.mutate(gasto.id, {
      onSuccess: () => {
        setConfirmando(false);
        onConcluido();
      },
      onError: () => setConfirmando(false),
    });
  };

  const erro = salvar.error && salvar.error.errors.length === 0 ? salvar.error : excluir.error;
  const grupo = grupoDaCategoria(categorias, useWatch({ control, name: 'categoriaId' }));

  return (
    <Screen
      title={titulo}
      onBack={onVoltar}
      footer={<Button label="Salvar gasto" onPress={enviar} loading={salvar.isPending} />}
    >
      {erro && <Banner tone={erro.status === 0 ? 'offline' : 'error'} message={mensagem(erro)} />}
      <Controller
        control={control}
        name="valorCentavos"
        render={({ field }) => (
          <MoneyField
            label="Valor"
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
      <Controller
        control={control}
        name="recorrente"
        render={({ field }) => (
          <Switch
            label="Gasto recorrente"
            hint="Marque para contas fixas mensais."
            value={field.value}
            onValueChange={field.onChange}
          />
        )}
      />
      {gasto && (
        <Button
          label="Excluir gasto"
          icon="trash"
          variant="ghost"
          onPress={() => setConfirmando(true)}
        />
      )}
      <ConfirmDialog
        visible={confirmando}
        title="Excluir gasto?"
        message="O gasto deixa de aparecer na lista e nos totais."
        confirmLabel="Excluir"
        loading={excluir.isPending}
        onConfirm={confirmarExclusao}
        onCancel={() => setConfirmando(false)}
      />
    </Screen>
  );
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
});
