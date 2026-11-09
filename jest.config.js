const preset = require('jest-expo/jest-preset');

// Sem isto, o setup do jest-expo troca o fetch global pelo stub do expo/fetch,
// e o MSW não consegue responder. Precisa valer antes do setup do preset, por
// isso fica aqui: os workers do Jest herdam o ambiente deste processo.
process.env.EXPO_PUBLIC_USE_RN_FETCH = '1';

// O MSW 3 e parte das dependências dele só publicam ESM. O Jest do jest-expo
// carrega CommonJS, então esses pacotes também passam pelo Babel.
const esmDoMsw = [
  'msw',
  '@msw',
  '@mswjs',
  '@open-draft',
  'rettime',
  'cookie',
  'headers-polyfill',
  'set-cookie-parser',
  'until-async',
  'outvariant',
  'strict-event-emitter',
  'is-node-process',
  'tough-cookie',
  'tldts',
  'tldts-core',
  'type-fest',
  'path-to-regexp',
  'statuses',
  'graphql',
];

const [padraoExpo, ...outrosPadroes] = preset.transformIgnorePatterns;

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  // O mesmo Babel do preset também para .mjs (rettime, @mswjs/interceptors).
  transform: { ...preset.transform, '\\.mjs$': preset.transform['\\.[jt]sx?$'] },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transformIgnorePatterns: [
    padraoExpo.replace('(?!(', `(?!(${esmDoMsw.join('|')}|`),
    ...outrosPadroes,
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/shared/api/generated/**', '!src/app/**'],
};
