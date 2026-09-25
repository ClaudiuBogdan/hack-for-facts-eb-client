/**
 * Lets a tsx script import the app's arithmetic (`lib/territory-derived.ts`)
 * outside Vite. That module carries its labels with it: it imports the Lingui
 * macros, which only run inside the compiler, and `lib/format.ts`, which
 * reaches `@/lib/i18n` through `@/lib/utils` — whose catalogs load through
 * `import.meta.glob`, which only Vite provides. A script resolves the macros
 * to the stubs Vitest uses (a message is its Romanian source text) and
 * `@/lib/i18n` to the few names `lib/utils` needs. Splitting the arithmetic
 * from its labels would make this unnecessary.
 *
 * `registerHooks` (synchronous, in-thread), not `register`: under tsx the
 * asynchronous hooks never saw these specifiers.
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
