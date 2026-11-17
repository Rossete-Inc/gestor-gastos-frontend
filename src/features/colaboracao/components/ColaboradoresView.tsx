import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/shared/api';
import {
  ActionSheet,
  Banner,
  Button,
  Carregando,
  ConfirmDialog,
  Screen,
  SegmentedControl,
  Text,
  TextField,
  UserList,
  UserRow,
  tokens,
} from '@/shared/ui';

import {
  useCancelarConvite,
  useColaboradores,
  useConvidar,
  useMudarPapel,
  useRemoverColaborador,
} from '../api/queries';
import {
  ConviteSchema,
  PAPEIS,
  ROTULO_DO_PAPEL,
  mensagemDeErro,
  tomDoErro,
  type ConviteForm,
} from '../model/colaboracao';
import type { PapelColaborador } from '../model/contaAtiva';

type Props = { onVoltar: () => void };

type Membro = { userId: string; nome: string; email: string; papel: PapelColaborador };

// Gestão pelo dono (spec colaboracao, "Convidar colaborador", "Limite" e
// "Gestão pelo dono"): membros e convites pendentes, o convite por e-mail e,
// por pessoa, mudar o papel, remover ou cancelar o convite.
export function ColaboradoresView({ onVoltar }: Props) {
  const lista = useColaboradores();
  const mudar = useMudarPapel();
  const remover = useRemoverColaborador();
  const cancelar = useCancelarConvite();
  const [escolhido, setEscolhido] = useState<Membro | null>(null);
  const [aRemover, setARemover] = useState<Membro | null>(null);
  const [aCancelar, setACancelar] = useState<string | null>(null);

  if (lista.isPending) return <Carregando label="Carregando colaboradores…" />;

  const erroDeAcao = mudar.error ?? remover.error ?? cancelar.error;
  const ocupadas = lista.data ? lista.data.membros.length + lista.data.convites.length : 0;

  return (
    <Screen title="Colaboradores" onBack={onVoltar}>
      {lista.isError ? (
        <>
          <Banner
            tone={tomDoErro(lista.error)}
            message={mensagemDeErro(lista.error, 'Não foi possível carregar os colaboradores.')}
          />
          <Button label="Tentar de novo" variant="secondary" onPress={() => lista.refetch()} />
        </>
      ) : (
        <>
          <Text color="textMuted">
            Quem você convidar vê a sua conta. Editor lança, edita e exclui; Leitor só consulta.
          </Text>
          {erroDeAcao && (
            <Banner
              tone={tomDoErro(erroDeAcao)}
              message={mensagemDeErro(erroDeAcao, 'Não foi possível concluir.')}
            />
          )}
          <Text variant="label" color="textMuted" accessibilityRole="header">
            {`Pessoas (${ocupadas} de ${lista.data.limite})`}
          </Text>
          {ocupadas === 0 ? (
            <Text color="textMuted">Ninguém colabora na sua conta ainda.</Text>
          ) : (
            <UserList>
              {lista.data.membros.map((m) => (
                <UserRow
                  key={m.userId}
                  nome={m.nome}
                  email={m.email}
                  papel={{ label: ROTULO_DO_PAPEL[m.papel], tone: 'brand' }}
                  status={{ label: 'Ativo', tone: 'success' }}
                  accessibilityHint="Mudar o papel ou remover"
                  onPress={() => setEscolhido(m)}
                />
              ))}
              {lista.data.convites.map((c) => (
                <UserRow
                  key={c.email}
                  nome={c.email}
                  email="Ainda não aceitou"
                  papel={{ label: ROTULO_DO_PAPEL[c.papel], tone: 'neutral' }}
                  status={{ label: 'Convite pendente', tone: 'warning' }}
                  accessibilityHint="Cancelar o convite"
                  onPress={() => setACancelar(c.email)}
                />
              ))}
            </UserList>
          )}
          {ocupadas < lista.data.limite ? (
            <FormConvite />
          ) : (
            <Text color="textMuted">
              {`A conta chegou ao limite de ${lista.data.limite} pessoas, contando os convites pendentes.`}
            </Text>
          )}
        </>
      )}

      <ActionSheet
        visible={escolhido !== null}
        title={escolhido?.nome ?? ''}
        subtitle={escolhido ? ROTULO_DO_PAPEL[escolhido.papel] : undefined}
        acoes={
          escolhido
            ? [
                ...PAPEIS.filter((p) => p.valor !== escolhido.papel).map((p) => ({
                  label: `Mudar para ${p.label}`,
                  onPress: () => {
                    mudar.mutate({ userId: escolhido.userId, papel: p.valor });
                    setEscolhido(null);
                  },
                })),
                {
                  label: 'Remover da conta',
                  danger: true,
                  onPress: () => {
                    setARemover(escolhido);
                    setEscolhido(null);
                  },
                },
              ]
            : []
        }
        onCancel={() => setEscolhido(null)}
      />
      <ConfirmDialog
        visible={aRemover !== null}
        title="Remover colaborador?"
        message={`${aRemover?.nome ?? ''} perde o acesso à sua conta. Os gastos que lançou continuam nela.`}
        confirmLabel="Remover"
        loading={remover.isPending}
        onConfirm={() =>
          aRemover && remover.mutate(aRemover.userId, { onSettled: () => setARemover(null) })
        }
        onCancel={() => setARemover(null)}
      />
      <ConfirmDialog
        visible={aCancelar !== null}
        title="Cancelar convite?"
        message={`O convite para ${aCancelar ?? ''} deixa de valer e a vaga é liberada.`}
        confirmLabel="Cancelar convite"
        loading={cancelar.isPending}
        onConfirm={() =>
          aCancelar && cancelar.mutate(aCancelar, { onSettled: () => setACancelar(null) })
        }
        onCancel={() => setACancelar(null)}
      />
    </Screen>
  );
}

// Convite por e-mail (sem notificação: a pessoa vê o convite ao entrar).
function FormConvite() {
  const convidar = useConvidar();
  const [enviado, setEnviado] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ConviteForm>({
    resolver: zodResolver(ConviteSchema),
    defaultValues: { email: '', papel: 'EDITOR' },
  });

  const enviar = handleSubmit((dados) => {
    setEnviado(null);
    convidar.mutate(dados, {
      onSuccess: (c) => {
        setEnviado(c.email);
        reset({ email: '', papel: dados.papel });
      },
      // O erro de validação do e-mail (inclusive o próprio) volta para o campo.
      onError: (e) => {
        const campo = e instanceof ApiError ? e.errors.find((f) => f.field === 'email') : undefined;
        if (campo) setError('email', { message: campo.message });
      },
    });
  });

  return (
    <View style={styles.form}>
      <Text variant="subtitle" accessibilityRole="header">
        Convidar
      </Text>
      {enviado && (
        <Banner
          tone="success"
          message={`Convite enviado para ${enviado}. A pessoa vê o convite ao entrar no app.`}
        />
      )}
      {convidar.isError && (
        <Banner
          tone={tomDoErro(convidar.error)}
          message={mensagemDeErro(convidar.error, 'Não foi possível convidar.')}
        />
      )}
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            label="E-mail"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="papel"
        render={({ field }) => (
          <SegmentedControl
            label="Papel"
            opcoes={PAPEIS}
            valor={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <Button label="Enviar convite" icon="mail" loading={convidar.isPending} onPress={enviar} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: tokens.space.md, marginTop: tokens.space.md },
});
