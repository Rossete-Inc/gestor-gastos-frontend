import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { Banner, Button, Text, TextField } from '@/shared/ui';

import { useEsqueciSenha } from '../api/mutacoes';
import { EsqueciSenhaSchema, type EsqueciSenhaInput } from '../model/formularios';

type Props = {
  emailInicial?: string;
  /** Código pedido: a tela leva para a redefinição com o e-mail informado. */
  onCodigoEnviado: (email: string) => void;
  onVoltar: () => void;
};

// Spec autenticacao, "Recuperação de senha" > "Solicitar código". A resposta
// é a mesma com ou sem conta para o e-mail (useEsqueciSenha).
export function EsqueciSenhaForm({ emailInicial = '', onCodigoEnviado, onVoltar }: Props) {
  const esqueci = useEsqueciSenha();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EsqueciSenhaInput>({
    resolver: zodResolver(EsqueciSenhaSchema),
    defaultValues: { email: emailInicial },
  });

  const enviar = handleSubmit((dados) =>
    esqueci.mutate(dados, { onSuccess: () => onCodigoEnviado(dados.email) }),
  );

  return (
    <>
      <Text variant="display">Esqueci minha senha</Text>
      <Text color="textMuted">
        Informe o e-mail da sua conta. Enviaremos um código para criar uma nova senha.
      </Text>
      {esqueci.error && <Banner tone="error" message={esqueci.error.message} />}
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
            onSubmitEditing={() => enviar()}
          />
        )}
      />
      <Button label="Enviar código" onPress={enviar} loading={esqueci.isPending} />
      <Button label="Voltar para o login" variant="ghost" onPress={onVoltar} />
    </>
  );
}
