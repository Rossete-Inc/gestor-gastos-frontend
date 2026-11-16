import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { Banner, Button, Screen, TextField } from '@/shared/ui';

import { useAlterarSenha } from '../api/mutacoes';
import { TrocaSenhaSchema, type TrocaSenhaInput } from '../model/formularios';

type Props = {
  onVoltar: () => void;
  /**
   * A senha mudou, mas o novo login falhou e a sessão foi encerrada: a tela
   * leva ao login com o aviso (design.md, "Encerrar as outras sessões").
   */
  onSessaoEncerrada: () => void;
};

const campos = [
  { name: 'senhaAtual', label: 'Senha atual', autoComplete: 'current-password' },
  { name: 'novaSenha', label: 'Nova senha', autoComplete: 'new-password' },
  { name: 'confirmacao', label: 'Confirme a nova senha', autoComplete: 'new-password' },
] as const;

// Spec autenticacao, "Alteração de senha", aberta pelo Perfil.
export function AlterarSenhaForm({ onVoltar, onSessaoEncerrada }: Props) {
  const alterar = useAlterarSenha();
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<TrocaSenhaInput>({
    resolver: zodResolver(TrocaSenhaSchema),
    defaultValues: { senhaAtual: '', novaSenha: '', confirmacao: '' },
  });

  const enviar = handleSubmit((dados) =>
    alterar.mutate(dados, {
      onSuccess: () => reset(),
      onError: (erro) => {
        if (erro.codigo === 'senha_alterada_relogin') onSessaoEncerrada();
        if (erro.codigo === 'senha_atual_incorreta') {
          setError('senhaAtual', { message: erro.message });
        }
      },
    }),
  );

  // A senha atual errada aparece no próprio campo; o resto vira banner.
  const erroGeral =
    alterar.error && alterar.error.codigo !== 'senha_atual_incorreta' ? alterar.error : null;

  return (
    <Screen title="Alterar senha" onBack={onVoltar}>
      {alterar.isSuccess && (
        <Banner
          tone="success"
          message="Senha alterada. Os outros dispositivos foram desconectados."
        />
      )}
      {erroGeral && <Banner tone="error" message={erroGeral.message} />}
      {campos.map((c, i) => (
        <Controller
          key={c.name}
          control={control}
          name={c.name}
          render={({ field }) => (
            <TextField
              label={c.label}
              icon="lock"
              password
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors[c.name]?.message}
              autoComplete={c.autoComplete}
              onSubmitEditing={i === campos.length - 1 ? () => enviar() : undefined}
            />
          )}
        />
      ))}
      <Button label="Salvar nova senha" onPress={enviar} loading={alterar.isPending} />
    </Screen>
  );
}
