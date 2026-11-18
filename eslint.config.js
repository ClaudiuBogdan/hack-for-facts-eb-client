import js from '@eslint/js'
import globals from 'globals'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import { createNodeResolver, importX } from 'eslint-plugin-import-x'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

// A JSON-LD block's `children` is written into the page as raw HTML (the
// router's `dangerouslySetInnerHTML`), and `JSON.stringify` leaves `<` as it
// is: a `</script>` in a name would close the tag. Every block goes through
// `serializeForInlineScript` (src/lib/inline-script-json.ts), called right
// there, so a string prepared elsewhere cannot slip past the check. It reads
// the object literal only: a `type` or `children` brought in by a spread, a
// `type` held in a variable, or a JSX `<script>` is not seen.
const JSON_LD_CHILDREN = {
  selector:
    "ObjectExpression:has(> Property:matches([key.name='type'], [key.value='type'])[value.value='application/ld+json']) > Property:matches([key.name='children'], [key.value='children']):not([value.type='CallExpression'][value.callee.name='serializeForInlineScript'])",
  message:
    'JSON-LD `children` must be `serializeForInlineScript(node)` from @/lib/inline-script-json: the router writes it into the page as raw HTML.',
}

// Route contract modules (docs/route-contracts.md) are loaded by the route tree
// on every page, so they build nothing when they are evaluated: no call runs at
// module scope except `lazySchema(() => …)`. One entry per
// migrated family; `src/routes/-route-tree-weight.test.ts` lists the same
// families' modules that the route tree must not reach.
const ROUTE_CONTRACT_MODULES = [
  'src/schemas/legal-search.ts',
  'src/schemas/statistics-search.ts',
  'src/schemas/parliament-search.ts',
  'src/schemas/private-company-profile-search.ts',
  'src/features/ngos/registry/registry-search.ts',
  'src/schemas/justice-search.ts',
  'src/schemas/elections-search.ts',
  'src/schemas/private-company-search.ts',
  'src/schemas/entity-search.ts',
  'src/schemas/analytics-filter-search.ts',
  'src/schemas/chart-search.ts',
  'src/schemas/company-analysis-scope-route-contract.ts',
  'src/schemas/alerts-search.ts',
  'src/components/entities/validation.ts',
  'src/features/private-companies/lib/company-analytics-search.ts',
  'src/features/challenges/schemas/challenge-entity-analysis-route-search-schema.ts',
  'src/features/campaigns/buget/schemas/campaign-schema.ts',
  'src/features/campaigns/buget/schemas/timeline-schema.ts',
  'src/features/campaigns/buget/schemas/campaign-route-search-schema.ts',
  'src/features/advanced-map-analytics/api/envelope.ts',
  'src/schemas/chart-defaults.ts',
]
const BUILT_AT_MODULE_SCOPE = {
  // Any call evaluated when the module is (not inside a function), wherever it
  // sits: an initializer, a wrapper (`as`, `satisfies`), an object or array
  // literal, a bare statement. `lazySchema(...)` itself is the one exception;
  // what it is given runs later, inside its function.
  selector:
    ":matches(CallExpression, NewExpression, TaggedTemplateExpression, AwaitExpression, ImportExpression):not(:function *):not(CallExpression[callee.name='lazySchema'])",
  message:
    'A route contract module builds nothing at module scope: wrap the schema in `lazySchema(() => …)` from @/lib/route-contract, or make it a function (docs/route-contracts.md).',
}

export default tseslint.config(
  {
    ignores: [
      '.output',
      '.vercel',
      // Git worktrees other sessions check out under the repo: other
      // branches, linted by their own check, and gone mid-run at times.
      '.claude/worktrees',
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
  // `no-restricted-syntax` for src. A later block for the same files replaces
  // an earlier block's selectors rather than adding to them, so a block for a
  // subset of src repeats every selector that applies there.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', JSON_LD_CHILDREN],
    },
  },
  {
    files: ROUTE_CONTRACT_MODULES,
    rules: {
      'no-restricted-syntax': ['error', JSON_LD_CHILDREN, BUILT_AT_MODULE_SCOPE],
    },
  },
  // Clerk loads only when a session or a Clerk widget needs it
  // (docs/performance/2026-11-17-landing/clerk-on-demand.md). A value import
  // anywhere else would put it back in every visitor's start-up code; types are
  // free.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/auth/clerk-runtime.tsx', '**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@clerk/*'],
              allowTypeImports: true,
              message: 'Clerk loads on demand: import it only in src/lib/auth/clerk-runtime.tsx, and use @/lib/auth elsewhere.',
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
