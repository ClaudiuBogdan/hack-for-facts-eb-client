/**
 * Lets a tsx script import the app's pure modules (`lib/territory-derived.ts`)
 * outside Vite: the Lingui macros only run inside the compiler, so a script
 * resolves them to the stubs Vitest uses, where a message is its Romanian
 * source text. `@/lib/i18n` loads its catalogs through `import.meta.glob`,
 * which only Vite provides; a script gets the few names `lib/utils` needs.
 *
 *   node --import tsx --import ./scripts/lib/lingui-macro-stubs.mjs scripts/<script>.ts
 */
import { registerHooks } from 'node:module'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '../..')
const STUBS = {
  '@lingui/core/macro': 'src/test/mocks/lingui-core-macro.ts',
  '@lingui/core': 'src/test/mocks/lingui-core.ts',
  '@/lib/i18n': 'scripts/lib/i18n-stub.ts',
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const stub = STUBS[specifier]
    if (stub) return { url: pathToFileURL(resolvePath(ROOT, stub)).href, shortCircuit: true }
    return nextResolve(specifier, context)
  },
})
