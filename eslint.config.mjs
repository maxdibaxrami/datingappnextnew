import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    '.next/**',
    'coverage/**',
    'next-env.d.ts',
    'src/types/database.generated.ts',
  ]),
  {
    files: [
      'src/core/**/*.ts',
      'src/css/**/*.ts',
      'src/mockEnv.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]);
