import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import type { ApiError } from '@/shared/api';
import { Banner, Button, Screen, SegmentedControl, Text, TextField, tokens } from '@/shared/ui';

import { useCriarCategoria } from '../api/queries';
import {
  CORES,
  CategoriaFormSchema,
  GRUPOS,
  MAX_NOME,
  type CategoriaFormInput,
  type Grupo,
} from '../model/categoria';

type Props = {
  onCriada: () => void;
  onVoltar: () => void;
  /** Grupo já marcado ao abrir, por exemplo vindo do formulário de gasto. */
  grupoInicial?: Grupo;
};

const campos = ['nome', 'grupo', 'cor'] as const;

// Nova categoria personalizada (spec categorias, "Criar categoria").
export function CategoriaForm({ onCriada, onVoltar, grupoInicial = 'CARTAO' }: Props) {
  const criar = useCriarCategoria();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CategoriaFormInput>({
    resolver: zodResolver(CategoriaFormSchema),
    defaultValues: { nome: '', grupo: grupoInicial, cor: CORES[0] },
  });

  // Erros do servidor que são de um campo voltam para o campo; o resto vira
  // banner.
  const aoFalhar = (e: ApiError) => {
    if (e.code === 'categoria_duplicada') {
      setError('nome', { message: 'Já existe uma categoria com esse nome neste grupo.' });
      return;
    }
    for (const f of e.errors) {
      const campo = campos.find((c) => c === f.field);
      if (campo) setError(campo, { message: f.message });
    }
  };

  const enviar = handleSubmit((dados) =>
    criar.mutate(dados, { onSuccess: onCriada, onError: aoFalhar }),
  );

  const erroGeral =
    criar.error && criar.error.code !== 'categoria_duplicada' && criar.error.errors.length === 0;

  return (
    <Screen title="Nova categoria" onBack={onVoltar}>
      {erroGeral && (
        <Banner
          tone={criar.error.status === 0 ? 'offline' : 'error'}
          message={criar.error.detail}
        />
      )}
      <Controller
        control={control}
        name="nome"
        render={({ field }) => (
          <TextField
            label="Nome"
            icon="tag"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.nome?.message}
            maxLength={MAX_NOME}
            autoCapitalize="sentences"
            returnKeyType="done"
            onSubmitEditing={() => enviar()}
          />
        )}
      />
      <Controller
        control={control}
        name="grupo"
        render={({ field }) => (
          <View style={styles.campo}>
            <Text variant="label">Grupo</Text>
            <SegmentedControl
              label="Grupo"
              opcoes={GRUPOS}
              valor={field.value}
              onChange={field.onChange}
            />
          </View>
        )}
      />
      <Controller
        control={control}
        name="cor"
        render={({ field }) => (
          <View style={styles.campo}>
            <Text variant="label">Cor</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="Cor" style={styles.cores}>
              {CORES.map((cor) => {
                const marcada = field.value === cor;
                return (
                  <Pressable
                    key={cor}
                    accessibilityRole="radio"
                    accessibilityLabel={`Cor ${cor}`}
                    accessibilityState={{ checked: marcada }}
                    onPress={() => field.onChange(cor)}
                    style={[styles.amostraAlvo, marcada && styles.marcada]}
                  >
                    {/* A cor é dado da categoria, não token de UI. */}
                    <View style={[styles.amostra, { backgroundColor: cor }]} />
                  </Pressable>
                );
              })}
            </View>
            {errors.cor?.message && (
              <Text variant="caption" color="danger" accessibilityRole="alert">
                {errors.cor.message}
              </Text>
            )}
          </View>
        )}
      />
      <Button label="Criar categoria" onPress={enviar} loading={criar.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  campo: { gap: tokens.space.xs },
  cores: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs },
  amostraAlvo: {
    width: tokens.size.touch,
    height: tokens.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.full,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  marcada: { borderColor: tokens.color.text },
  amostra: {
    width: tokens.size.icon + tokens.space.sm,
    height: tokens.size.icon + tokens.space.sm,
    borderRadius: tokens.radius.full,
  },
});
