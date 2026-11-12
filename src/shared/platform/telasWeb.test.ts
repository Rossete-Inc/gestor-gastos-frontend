import { enableScreens } from 'react-native-screens';

import { prepararTelas } from './telasWeb';

jest.mock('react-native-screens', () => ({ enableScreens: jest.fn() }));

it('liga o react-native-screens para esconder as telas inativas na web', () => {
  prepararTelas();
  expect(enableScreens).toHaveBeenCalledWith(true); // => abas fora de foco com display: none
});
