// ESLint (flat config): regras do Expo, Prettier e as fronteiras
// app → features → shared dos guardrails do app.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier/flat');

const importProfundoDeFeature = {
  group: ['@/features/*/*'],
  message: 'Importe outra feature apenas pelo index.ts (ex.: @/features/auth).',
};

module.exports = defineConfig([
  expoConfig,
  prettier,
  {
    ignores: ['dist/*', '.expo/*', 'coverage/*', 'src/shared/api/generated/**', 'scripts/*.py'],
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/features/**', '@/app/**'],
              message: 'shared não pode depender de features nem de app.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/app/**'], message: 'features não podem depender de rotas.' },
            importProfundoDeFeature,
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [importProfundoDeFeature] }],
    },
  },
]);
