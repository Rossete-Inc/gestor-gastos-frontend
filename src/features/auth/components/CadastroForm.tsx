import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { Banner, Button, Text, TextField } from '@/shared/ui';

import { useCadastrar } from '../api/mutacoes';
import { CadastroSchema, type CadastroInput } from '../model/formularios';

type Props = {
  /** Conta criada como pendente: a tela leva para a confirmação do e-mail. */
  onCadastrado: (email: string) => void;
  onJaTenhoConta: () => void;
};

export function CadastroForm({ onCadastrado, onJaTenhoConta }: Props) {
  const cadastrar = useCadastrar();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CadastroInput>({
    resolver: zodResolver(CadastroSchema),
    defaultValues: { nome: '', email: '', senha: '' },
  });

  const enviar = handleSubmit((dados) =>
    cadastrar.mutate(dados, { onSuccess: () => onCadastrado(dados.email) }),
  );

  return (
    <>
      <Text variant="display">Criar conta</Text>
      <Text color="textMuted">Enviaremos um código para confirmar seu e-mail.</Text>
      {cadastrar.error && <Banner tone="error" message={cadastrar.error.message} />}
      <Controller
        control={control}
        name="nome"
        render={({ field }) => (
          <TextField
            label="Nome"
            icon="user"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.nome?.message}
            autoComplete="name"
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            label="E-mail"
            icon="mail"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.email?.message}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
          />
        )}
      />
      <Controller
        control={control}
        name="senha"
        render={({ field }) => (
          <TextField
            label="Senha"
            icon="lock"
            password
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.senha?.message}
            hint="Mínimo de 8 caracteres, com maiúscula, minúscula e número."
            autoComplete="new-password"
          />
        )}
      />
      <Button label="Criar conta" onPress={enviar} loading={cadastrar.isPending} />
      <Button label="Já tenho conta" variant="ghost" onPress={onJaTenhoConta} />
    </>
  );
}
