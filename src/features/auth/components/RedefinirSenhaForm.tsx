import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { Banner, Button, Text, TextField } from '@/shared/ui';

import { useEsqueciSenha, useRedefinirSenha } from '../api/mutacoes';
import { RedefinirSenhaSchema, type RedefinirSenhaInput } from '../model/formularios';

type Props = {
  email: string;
  /** Senha redefinida: a tela volta ao login com o e-mail preenchido. */
  onRedefinida: () => void;
  onVoltar: () => void;
};

// Spec autenticacao, "Recuperação de senha": código + nova senha. A mensagem
// do topo é neutra e não revela se o e-mail tem conta ("E-mail sem conta").
export function RedefinirSenhaForm({ email, onRedefinida, onVoltar }: Props) {
  const redefinir = useRedefinirSenha(email);
  const reenviar = useEsqueciSenha();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RedefinirSenhaInput>({
    resolver: zodResolver(RedefinirSenhaSchema),
    defaultValues: { codigo: '', novaSenha: '', confirmacao: '' },
  });

  const enviar = handleSubmit((dados) => {
    reenviar.reset();
    redefinir.mutate(dados, { onSuccess: onRedefinida });
  });

  const pedirNovo = () => {
    redefinir.reset();
    reenviar.mutate({ email });
  };

  return (
    <>
      <Text variant="display">Nova senha</Text>
      <Banner tone="success" message="Se houver uma conta com este e-mail, enviamos um código." />
      <Text color="textMuted">Digite o código enviado para {email} e escolha a nova senha.</Text>
      {redefinir.error && <Banner tone="error" message={redefinir.error.message} />}
      {reenviar.error && <Banner tone="error" message={reenviar.error.message} />}
      {reenviar.isSuccess && <Banner tone="success" message="Pedimos um novo código." />}
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
          />
        )}
      />
      <Controller
        control={control}
        name="novaSenha"
        render={({ field }) => (
          <TextField
            label="Nova senha"
            icon="lock"
            password
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.novaSenha?.message}
            autoComplete="new-password"
          />
        )}
      />
      <Controller
        control={control}
        name="confirmacao"
        render={({ field }) => (
          <TextField
            label="Confirme a nova senha"
            icon="lock"
            password
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.confirmacao?.message}
            autoComplete="new-password"
            onSubmitEditing={() => enviar()}
          />
        )}
      />
      <Button label="Redefinir senha" onPress={enviar} loading={redefinir.isPending} />
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
