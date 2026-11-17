import { fireEvent, render, screen } from '@testing-library/react-native';

import { esmaecer, variantDoValorCentro } from './PieChart';
import {
  Badge,
  Banner,
  Button,
  ExpenseItem,
  Header,
  MenuItem,
  PieChart,
  Screen,
  Text,
  TextField,
  TopoDaTela,
} from './index';

describe('Button', () => {
  it('chama onPress e expõe papel e rótulo acessíveis', async () => {
    const onPress = jest.fn();
    await render(<Button label="Entrar" onPress={onPress} icon="lock" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('desabilitado não responde ao toque', async () => {
    const onPress = jest.fn();
    await render(<Button label="Entrar" onPress={onPress} disabled />);
    const botao = screen.getByRole('button', { name: 'Entrar' });
    await fireEvent.press(botao);
    expect(onPress).not.toHaveBeenCalled();
    expect(botao).toBeDisabled();
  });

  it('carregando mostra o indicador e bloqueia novos toques', async () => {
    const onPress = jest.fn();
    await render(<Button label="Salvar" onPress={onPress} loading variant="secondary" />);
    expect(screen.getByTestId('button-loading')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeBusy();
  });

  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)(
    'renderiza a variante %s',
    async (v) => {
      await render(<Button label={v} onPress={() => {}} variant={v} />);
      expect(screen.getByText(v)).toBeOnTheScreen();
    },
  );
});

describe('TextField', () => {
  it('liga rótulo ao campo e repassa o texto digitado', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="E-mail" onChangeText={onChangeText} icon="mail" />);
    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'ana@x.com');
    expect(onChangeText).toHaveBeenCalledWith('ana@x.com');
  });

  it('mostra o erro como alerta', async () => {
    await render(<TextField label="Senha" error="Mínimo de 8 caracteres" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Mínimo de 8 caracteres');
  });

  it('mostra a dica quando não há erro', async () => {
    await render(<TextField label="Senha" hint="Use letras e números" />);
    expect(screen.getByText('Use letras e números')).toBeOnTheScreen();
  });

  it('senha começa oculta e o botão alterna a visibilidade', async () => {
    await render(<TextField label="Senha" password />);
    expect(screen.getByLabelText('Senha')).toHaveProp('secureTextEntry', true);
    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(screen.getByLabelText('Senha')).toHaveProp('secureTextEntry', false);
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toBeOnTheScreen();
  });

  it('desabilitado não é editável', async () => {
    await render(<TextField label="E-mail" disabled />);
    expect(screen.getByLabelText('E-mail')).toHaveProp('editable', false);
  });

  it('repassa foco e saída do campo', async () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    await render(<TextField label="E-mail" onFocus={onFocus} onBlur={onBlur} />);
    await fireEvent(screen.getByLabelText('E-mail'), 'focus');
    await fireEvent(screen.getByLabelText('E-mail'), 'blur');
    expect(onFocus).toHaveBeenCalled();
    expect(onBlur).toHaveBeenCalled();
  });
});

describe('Header e Screen', () => {
  it('Header com voltar', async () => {
    const onBack = jest.fn();
    await render(<Header title="Perfil" onBack={onBack} />);
    expect(screen.getByRole('header', { name: 'Perfil' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('Header só com título não tem voltar', async () => {
    await render(<Header title="Painel" />);
    expect(screen.queryByRole('button', { name: 'Voltar' })).toBeNull();
  });

  it('Screen mostra título e conteúdo', async () => {
    await render(
      <Screen title="Perfil" centered>
        <Text>conteúdo</Text>
      </Screen>,
    );
    expect(screen.getByRole('header', { name: 'Perfil' })).toBeOnTheScreen();
    expect(screen.getByText('conteúdo')).toBeOnTheScreen();
  });
  it('Screen com título mostra o TopoDaTela; sem título, não', async () => {
    await render(
      <TopoDaTela.Provider value={<Text>seletor</Text>}>
        <Screen title="Painel">
          <Text>conteúdo</Text>
        </Screen>
      </TopoDaTela.Provider>,
    );
    expect(screen.getByText('seletor')).toBeOnTheScreen();
    await render(
      <TopoDaTela.Provider value={<Text>seletor</Text>}>
        <Screen centered>
          <Text>login</Text>
        </Screen>
      </TopoDaTela.Provider>,
    );
    expect(screen.queryByText('seletor')).toBeNull();
  });
});

describe('ExpenseItem', () => {
  const base = {
    titulo: 'Almoço',
    detalhe: 'Alimentação',
    valor: 'R$ 45,90',
    cor: '#F97316',
    icone: 'credit-card' as const,
  };

  it('com onPress é um botão', async () => {
    const onPress = jest.fn();
    await render(<ExpenseItem {...base} onPress={onPress} accessibilityHint="Abre" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Almoço, Alimentação, R$ 45,90' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('sem onPress só mostra (modo Leitor)', async () => {
    await render(<ExpenseItem {...base} accessibilityHint="Abre" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByLabelText('Almoço, Alimentação, R$ 45,90')).toBeOnTheScreen();
  });
});

describe('Banner, Badge e MenuItem', () => {
  it.each(['error', 'offline'] as const)('Banner %s é um alerta', async (tone) => {
    await render(<Banner tone={tone} message="Algo aconteceu" />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Algo aconteceu/);
  });

  it('Banner de sucesso não é alerta', async () => {
    await render(<Banner tone="success" message="Conta confirmada" />);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Conta confirmada')).toBeOnTheScreen();
  });

  it('Badge mostra o rótulo', async () => {
    await render(<Badge label="admin" tone="brand" />);
    expect(screen.getByText('admin')).toBeOnTheScreen();
  });

  it('MenuItem chama onPress', async () => {
    const onPress = jest.fn();
    await render(<MenuItem label="Sair" icon="log-out" onPress={onPress} danger />);
    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('PieChart', () => {
  it('mostra no centro o valor inteiro, com centavos', async () => {
    await render(
      <PieChart
        fatias={[{ chave: 'a', valor: 10_060, cor: '#F97316' }]}
        rotuloCentro="Total"
        valorCentro="R$ 100,60"
        accessibilityLabel="Gráfico por categoria: total de R$ 100,60"
      />,
    );
    // O centro é visual: o leitor de tela lê o gráfico pelo rótulo da imagem.
    // A biblioteca desenha o centro em mais de uma camada; basta que apareça.
    const oculto = { includeHiddenElements: true };
    expect(screen.getAllByText('R$ 100,60', oculto).length).toBeGreaterThan(0); // => "R$ 100,60"
    expect(screen.queryByText('R$ 101', oculto)).toBeNull();
  });

  it('mostra o balão só com uma fatia selecionada (spec, "Detalhe da fatia")', async () => {
    const pizza = (selecionada: number | null) => (
      <PieChart
        fatias={[
          { chave: 'a', valor: 3, cor: '#F97316' },
          { chave: 'b', valor: 1, cor: '#0EA5E9' },
        ]}
        rotuloCentro="Total"
        valorCentro="R$ 4,00"
        accessibilityLabel="Gráfico"
        selecionada={selecionada}
        balao={<Text>Detalhe da fatia</Text>}
      />
    );
    const { rerender } = await render(pizza(null));
    expect(screen.queryByText('Detalhe da fatia')).toBeNull();
    await rerender(pizza(1));
    expect(screen.getByText('Detalhe da fatia')).toBeOnTheScreen(); // => balão aberto
  });

  it('esmaece a cor das fatias fora de foco', () => {
    expect(esmaecer('#F97316')).toBe('#F9731655'); // => "#F9731655"
    expect(esmaecer('red')).toBe('red');
  });

  it('diminui a fonte do centro conforme o valor cresce, para caber no furo', () => {
    expect(variantDoValorCentro('R$ 100,60')).toBe('subtitle');
    expect(variantDoValorCentro('R$ 1.234,56')).toBe('body');
    expect(variantDoValorCentro('R$ 123.456,78')).toBe('label');
    expect(variantDoValorCentro('R$ 1.234.567,89')).toBe('caption');
  });
});
