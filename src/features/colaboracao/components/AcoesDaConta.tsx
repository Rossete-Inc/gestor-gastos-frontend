import { useState } from 'react';

import { Banner, ConfirmDialog, MenuItem } from '@/shared/ui';

import { useContas, useSairDaConta } from '../api/queries';
import { useContaAtiva } from '../hooks/useContaAtiva';
import { mensagemDeErro, tomDoErro } from '../model/colaboracao';

type Props = {
  onColaboradores: () => void;
  onConvites: () => void;
  /** Depois de sair da conta alheia (volta para a própria). */
  onSaiu: () => void;
};

// Itens do Perfil ligados à conta: "Colaboradores" para o dono (na própria
// conta), "Convites" e, numa conta alheia, "Sair desta conta" (spec
// colaboracao, "Sair de uma conta").
export function AcoesDaConta({ onColaboradores, onConvites, onSaiu }: Props) {
  const ativa = useContaAtiva();
  const contas = useContas();
  const sair = useSairDaConta();
  const [confirmando, setConfirmando] = useState(false);
  const convites = contas.data?.convites.length ?? 0;

  return (
    <>
      {sair.isError && (
        <Banner
          tone={tomDoErro(sair.error)}
          message={mensagemDeErro(sair.error, 'Não foi possível sair da conta.')}
        />
      )}
      {ativa.propria && <MenuItem label="Colaboradores" icon="users" onPress={onColaboradores} />}
      <MenuItem
        label={convites > 0 ? `Convites (${convites})` : 'Convites'}
        icon="mail"
        onPress={onConvites}
      />
      {ativa.conta && (
        <MenuItem
          label={`Sair da conta de ${ativa.conta.nomeDono}`}
          icon="log-out"
          danger
          onPress={() => setConfirmando(true)}
        />
      )}
      <ConfirmDialog
        visible={confirmando}
        title="Sair desta conta?"
        message={`Você deixa de ver a conta de ${ativa.conta?.nomeDono ?? ''}. Os gastos que você lançou continuam nela.`}
        confirmLabel="Sair da conta"
        loading={sair.isPending}
        onConfirm={() => {
          const donoId = ativa.conta?.donoId;
          if (!donoId) return;
          sair.mutate(donoId, {
            onSuccess: onSaiu,
            onSettled: () => setConfirmando(false),
          });
        }}
        onCancel={() => setConfirmando(false)}
      />
    </>
  );
}
