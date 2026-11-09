import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { Banner, Button, Text, TextField } from '@/shared/ui';

import { useConfirmar, useReenviarCodigo } from '../api/mutacoes';
import { ConfirmacaoSchema, type ConfirmacaoInput } from '../model/formularios';

type Props = {
  email: string;
  /** Conta ativada: a tela leva para o login (spec, "Código correto"). */
  onConfirmado: () => void;
  onVoltar: () => void;
};

export function ConfirmarForm({ email, onConfirmado, onVoltar }: Props) {
  const confirmar = useConfirmar(email);
  const reenviar = useReenviarCodigo(email);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ConfirmacaoInput>({
    resolver: zodResolver(ConfirmacaoSchema),
    defaultValues: { codigo: '' },
  });

  const enviar = handleSubmit((dados) => {
    reenviar.reset();
    confirmar.mutate(dados, { onSuccess: onConfirmado });
  });

  const pedirNovo = () => {
    confirmar.reset();
    reenviar.mutate();
  };

  return (
    <>
      <Text variant="display">Confirme seu e-mail</Text>
      <Text color="textMuted">Digite o código de 6 números que enviamos para {email}.</Text>
      {confirmar.error && <Banner tone="error" message={confirmar.error.message} />}
      {reenviar.error && <Banner tone="error" message={reenviar.error.message} />}
      {reenviar.isSuccess && <Banner tone="success" message="Enviamos um novo código." />}
      <Controller
        control={control}
        name="codigo"
        render={({ field }) => (
          <TextField
            label="Código"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.codigo?.message}
            keyboardType="number-pad"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            onSubmitEditing={() => enviar()}
          />
        )}
      />
      <Button label="Confirmar" onPress={enviar} loading={confirmar.isPending} />
      <Button
        label="Reenviar código"
        variant="secondary"
        onPress={pedirNovo}
        loading={reenviar.isPending}
      />
      <Button label="Voltar para o login" variant="ghost" onPress={onVoltar} />
    </>
  );
}
