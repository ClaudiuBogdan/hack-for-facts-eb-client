import js from '@eslint/js'
import globals from 'globals'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import { createNodeResolver, importX } from 'eslint-plugin-import-x'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '.output',
      '.vercel',
      'Library',
      'dist',
      'playwright-report',
      'test-results',
      'tmp',
      'src/locales/**/*.js',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'import-x': importX,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          noWarnOnMultipleProjects: true,
          project: ['./tsconfig.app.json', './tsconfig.node.json'],
        }),
        createNodeResolver(),
      ],
    },
    rules: {
      'import-x/no-cycle': ['error', { ignoreExternal: true }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  // TanStack Router lazy route files commonly export both components and
  // non-component values (e.g., loaders, route definitions). Disable the
  // react-refresh warning for those files.
  {
    files: [
      '**/*.lazy.tsx',
      '**/routes/**/*.{ts,tsx}',
      'src/development/**/*.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // `/development/*` is a local-only prototyping surface (docs/design/prototyping.md).
  // Nothing outside it may import it: production builds must be able to drop the
  // whole directory. `no-restricted-paths` matches `target` against the importing
  // file, so the prototypes' own sibling imports are excluded here rather than by
  // narrowing `from`. It does not see `import.meta.glob`, which is how the route
  // stubs reach the harness.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/development/**'],
    rules: {
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src',
              from: './src/development',
              message:
                'Nothing outside src/development may import it. Promote by moving the code into src/features/.',
            },
          ],
        },
      ],
    },
  },
  // Relax `no-explicit-any` in test files – test utilities often need `any`
  // for mock objects, cast-through values, etc.
  {
    files: ['**/*.test.{ts,tsx}', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // Relax `no-explicit-any` for E2E/integration test utilities
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
