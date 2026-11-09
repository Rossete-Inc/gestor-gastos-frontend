import { defineConfig } from 'orval';

// Gera o client do BFF a partir da cópia fixada do contrato (openapi/bff.yaml).
// Os arquivos em src/shared/api/generated nunca são editados à mão.
export default defineConfig({
  bff: {
    input: './openapi/bff.yaml',
    output: {
      target: './src/shared/api/generated/bff.ts',
      client: 'fetch',
      mode: 'single',
      override: {
        mutator: { path: './src/shared/api/http.ts', name: 'httpMutator' },
        fetch: { includeHttpResponseReturnType: false },
      },
    },
  },
  bffZod: {
    input: './openapi/bff.yaml',
    output: {
      target: './src/shared/api/generated/bff.zod.ts',
      client: 'zod',
      mode: 'single',
    },
  },
});
