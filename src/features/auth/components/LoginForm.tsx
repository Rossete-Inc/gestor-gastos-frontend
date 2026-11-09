import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { Banner, Button, Text, TextField } from '@/shared/ui';

import { useEntrar } from '../api/mutacoes';
import { LoginSchema, type LoginInput } from '../model/formularios';

type Props = {
  emailInicial?: string;
  /** Mensagem de sucesso vinda de outra tela, por exemplo "conta confirmada". */
  aviso?: string;
  /** Conta pendente de confirmação: a tela leva para a confirmação. */
  onNaoConfirmado: (email: string) => void;
  onCriarConta: () => void;
};

export function LoginForm({ emailInicial = '', aviso, onNaoConfirmado, onCriarConta }: Props) {
  const entrar = useEntrar();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: emailInicial, senha: '' },
  });

  const enviar = handleSubmit((dados) =>
    entrar.mutate(dados, {
      onError: (erro) => {
        if (erro.codigo === 'conta_nao_confirmada') onNaoConfirmado(dados.email);
      },
    }),
  );

  const erro = entrar.error?.codigo === 'conta_nao_confirmada' ? null : entrar.error;

  return (
    <>
      <Text variant="display">Entrar</Text>
      <Text color="textMuted">Acesse seus gastos com e-mail e senha.</Text>
      {aviso && !erro && <Banner tone="success" message={aviso} />}
      {erro && <Banner tone="error" message={erro.message} />}
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
            autoComplete="current-password"
            onSubmitEditing={() => enviar()}
          />
        )}
      />
      <Button label="Entrar" onPress={enviar} loading={entrar.isPending} />
      <Button label="Criar conta" variant="ghost" onPress={onCriarConta} />
    </>
  );
}
