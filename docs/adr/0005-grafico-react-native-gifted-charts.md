# 0005 - react-native-gifted-charts para gráficos

- **Status:** Aceito
- **Data:** 2026-11-04 (proposta), 2026-11-11 (aceito, na tarefa 9.3)

> Proposto no `gestor-gastos-infra-base` antes deste repositório existir e movido para cá ao ser aceito (ADR 0006 do infra-base).

## Contexto

O painel precisa de gráfico de pizza por categoria, com as visões Todos, Cartão e Fixo (spec painel-gastos). Os guardrails exigem ADR para bibliotecas novas e que elas funcionem em web e nativo.

## Decisão

Usar `react-native-gifted-charts` (renderiza com `react-native-svg`), encapsulado pelo componente `PieChart` em `shared/ui`. Nenhum outro arquivo importa a biblioteca.

## Alternativas consideradas

| Alternativa                            | Prós                                            | Contras                                      |
| -------------------------------------- | ----------------------------------------------- | -------------------------------------------- |
| react-native-gifted-charts (escolhida) | Web e nativo via SVG; pizza/donut prontos; leve | API menos flexível que D3                    |
| victory-native (Skia)                  | Animações ricas                                 | Na web exige CanvasKit (bundle pesado)       |
| SVG próprio com react-native-svg       | Zero dependência extra                          | Mais código para manter (legenda, interação) |

## Trade-offs

- **Ganhamos:** gráfico pronto e consistente nas duas plataformas.
- **Perdemos:** controle fino de animações.
- **Quando reconsiderar:** se precisarmos de gráficos complexos ou a lib deixar de ser mantida.

## Consequências

- Dependências novas, instaladas com `npx expo install`: `react-native-gifted-charts`, `react-native-svg` e `expo-linear-gradient` (peer da biblioteca).
- Manutenção conferida antes de instalar: versão 1.4.81, publicada em 2026-10-05.
- `PieChart` em `shared/ui` recebe só valor e cor de cada fatia. Os dados chegam já agregados pelo BFF (`/telas/dashboard`), com os percentuais calculados lá pelo maior resto; a legenda (`LegendItem`) fica fora do gráfico.
- Trocar de biblioteca é mexer só em `shared/ui/PieChart.tsx`.
