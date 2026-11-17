import { ActionSheet } from '@/shared/ui';

import type { Escopo } from '../model/gasto';

type Props = {
  /** null = fechado. */
  acao: 'salvar' | 'excluir' | null;
  /** Posição do gasto, como "Parcela 3/10" ou "Recorrente". */
  posicao: string;
  onEscolher: (escopo: Escopo) => void;
  onCancel: () => void;
};

// Alcance da edição ou da exclusão num parcelamento ou recorrência (spec
// parcelamentos-recorrencias, "Alcance da edição e da exclusão em séries").
export function EscopoSerieDialog({ acao, posicao, onEscolher, onCancel }: Props) {
  const excluir = acao === 'excluir';
  return (
    <ActionSheet
      visible={acao !== null}
      title={excluir ? 'Excluir quais gastos?' : 'Alterar quais gastos?'}
      subtitle={posicao}
      acoes={[
        { label: 'Só esta', onPress: () => onEscolher('ESTA'), danger: excluir },
        { label: 'Esta e as próximas', onPress: () => onEscolher('PROXIMAS'), danger: excluir },
        { label: 'Todas', onPress: () => onEscolher('TODAS'), danger: excluir },
      ]}
      onCancel={onCancel}
    />
  );
}
