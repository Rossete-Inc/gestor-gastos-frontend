import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Fab, MoneyField, MonthSelector, Screen, Select, Switch, TabBar, Text } from './index';

// Sem medidas iniciais, o SafeAreaProvider não renderiza os filhos no Jest.
const metricas = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe('MonthSelector', () => {
  it('mostra o mês e navega para trás e para frente, atravessando o ano', async () => {
    function Teste() {
      const [mes, setMes] = useState('2026-12');
      return <MonthSelector mes={mes} onChange={setMes} />;
    }
    await render(<Teste />);
    expect(screen.getByRole('header', { name: 'Dezembro de 2026' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(screen.getByRole('header', { name: 'Janeiro de 2027' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Mês anterior' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(screen.getByRole('header', { name: 'Novembro de 2026' })).toBeOnTheScreen();
  });
});

describe('Select', () => {
  const secoes = [
    { titulo: 'Cartão', opcoes: [{ valor: 'a', label: 'Alimentação', cor: '#F97316' }] },
    { titulo: 'Fixo', opcoes: [{ valor: 'l', label: 'Luz' }] },
  ];

  it('abre a lista, escolhe e fecha', async () => {
    const onChange = jest.fn();
    await render(
      <Select
        label="Categoria"
        placeholder="Escolha"
        valor={null}
        secoes={secoes}
        onChange={onChange}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Categoria: Escolha' }));
    expect(screen.getByText('Fixo')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Luz' }));
    expect(onChange).toHaveBeenCalledWith('l');
    expect(screen.queryByRole('radio', { name: 'Luz' })).toBeNull();
  });

  it('mostra a opção escolhida e o erro', async () => {
    await render(
      <Select
        label="Categoria"
        valor="a"
        secoes={secoes}
        onChange={jest.fn()}
        error="Escolha a categoria."
      />,
    );
    expect(screen.getByRole('button', { name: 'Categoria: Alimentação' })).toBeOnTheScreen();
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha a categoria.');
  });

  it('fecha ao tocar fora sem escolher', async () => {
    const onChange = jest.fn();
    await render(<Select label="Categoria" valor="a" secoes={secoes} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Categoria: Alimentação' }));
    expect(screen.getByRole('radio', { name: 'Alimentação' })).toBeChecked();
    await fireEvent.press(screen.getByLabelText('Fechar'));
    expect(screen.queryByRole('radio', { name: 'Luz' })).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('MoneyField', () => {
  it('máscara de moeda em centavos', async () => {
    function Teste() {
      const [c, setC] = useState(0);
      return <MoneyField label="Valor" centavos={c} onChange={setC} />;
    }
    await render(<Teste />);
    const campo = screen.getByLabelText('Valor');
    expect(campo).toHaveDisplayValue('R$ 0,00');
    await fireEvent.changeText(campo, 'R$ 0,004');
    expect(campo).toHaveDisplayValue('R$ 0,04');
    // Cada tecla entra pela direita: "R$ 0,04" + "5" => R$ 0,45.
    await fireEvent.changeText(campo, 'R$ 0,045');
    expect(campo).toHaveDisplayValue('R$ 0,45');
    await fireEvent.changeText(campo, '150000');
    expect(campo).toHaveDisplayValue('R$ 1.500,00');
  });

  it('mostra o erro', async () => {
    await render(
      <MoneyField label="Valor" centavos={0} onChange={jest.fn()} error="Informe um valor." />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Informe um valor.');
  });
});

describe('Switch, Fab e TabBar', () => {
  it('Switch alterna com rótulo acessível', async () => {
    const onValueChange = jest.fn();
    await render(
      <Switch
        label="Gasto recorrente"
        hint="Contas fixas."
        value={false}
        onValueChange={onValueChange}
      />,
    );
    expect(screen.getByText('Contas fixas.')).toBeOnTheScreen();
    await fireEvent(screen.getByLabelText('Gasto recorrente'), 'valueChange', true);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('Fab chama a ação', async () => {
    const onPress = jest.fn();
    await render(<Fab label="Novo gasto" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Novo gasto' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('TabBar marca a aba ativa e navega', async () => {
    const irPerfil = jest.fn();
    await render(
      <SafeAreaProvider initialMetrics={metricas}>
        <TabBar
          itens={[
            { chave: 'g', label: 'Gastos', icon: 'list', ativo: true, onPress: jest.fn() },
            { chave: 'p', label: 'Perfil', icon: 'user', ativo: false, onPress: irPerfil },
          ]}
        />
      </SafeAreaProvider>,
    );
    expect(screen.getByRole('tab', { name: 'Gastos' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Perfil' })).not.toBeSelected();
    await fireEvent.press(screen.getByRole('tab', { name: 'Perfil' }));
    expect(irPerfil).toHaveBeenCalled();
  });

  it('Screen mostra rodapé e sobreposição fora da rolagem', async () => {
    await render(
      <Screen title="T" footer={<Text>rodapé</Text>} overlay={<Text>flutuante</Text>}>
        <Text>conteúdo</Text>
      </Screen>,
    );
    expect(screen.getByText('rodapé')).toBeOnTheScreen();
    expect(screen.getByText('flutuante')).toBeOnTheScreen();
  });
});
