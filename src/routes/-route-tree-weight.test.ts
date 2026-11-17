import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * What the browser loads before the first render. Every page loads every route
 * file's eager part (`*.lazy.tsx` aside), so whatever those import at module
 * level is loaded and evaluated on every page. A family whose URL contract has
 * moved to its own lazy module (`docs/route-contracts.md`) lists here the
 * modules that must stay out: its data schemas, its API adapters and its mocks.
 * Each must be reached only through `await import(...)` or a lazy component.
 */
const KEPT_OUT: readonly { readonly family: string; readonly modules: readonly RegExp[] }[] = [
  {
    family: 'legislation',
    modules: [/^src\/schemas\/legal\.ts$/, /^src\/features\/legal\/api\//, /^src\/features\/legal\/mocks\//],
  },
]

/**
 * The start-up roots besides the eager route files: the client entry, Start's
 * options (`#tanstack-start-entry`), the router and its generated tree (which
 * reaches the lazy route files only through `import()`).
 */
const START_UP_ROOTS = ['src/client.tsx', 'src/start.ts', 'src/router.tsx', 'src/routeTree.gen.ts']

const ROOT = path.resolve(__dirname, '../..')
const CODE = ['.ts', '.tsx', '/index.ts', '/index.tsx']
/** Query keys that make Vite hand back a URL or a string instead of running the module. */
const NOT_RUN = new Set(['url', 'raw'])
/** Files that are never code here, whatever the query. */
const ASSET_FILE = /\.(css|svg|png|jpe?g|webp|avif|gif|ico|woff2?|ttf|txt|md|po)$/
/** Files the bundler compiles into code this walk cannot read: reaching one eagerly fails the test. */
const UNREADABLE = /\.(mdx|vue|svelte)$/

/**
 * The file a local specifier names, as Vite resolves it: the `@/` alias, a
 * root-relative `/src/…`, a relative path, an extensionless or `/index` path,
 * and a `.js` written for a `.ts`/`.tsx` file; a query is read apart. Null for
 * a package or an import Vite does not run (`?url`, `?raw`, a stylesheet, an
 * image). Anything else it cannot find is an error, so that an import the walk
 * does not follow never passes unnoticed.
 */
function resolve(from: string, specifier: string): string | null {
  const [pathname = '', query = ''] = specifier.split('?', 2)
  let base: string
  if (pathname.startsWith('@/')) base = path.join(ROOT, 'src', pathname.slice(2))
  else if (pathname.startsWith('/')) base = path.join(ROOT, pathname)
  else if (pathname.startsWith('.')) base = path.resolve(path.dirname(from), pathname)
  else return null // a package
  if (ASSET_FILE.test(pathname) || [...new URLSearchParams(query).keys()].some((key) => NOT_RUN.has(key))) return null
  const candidates = [base, ...CODE.map((extension) => base + extension)]
  if (/\.jsx?$/.test(base)) candidates.push(...['.ts', '.tsx'].map((extension) => base.replace(/\.jsx?$/, extension)))
  const found = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
  if (!found) throw new Error(`${path.relative(ROOT, from)}: cannot resolve "${specifier}"`)
  if (UNREADABLE.test(found)) throw new Error(`${path.relative(ROOT, from)}: "${specifier}" compiles to code this test cannot read; load it lazily`)
  return found
}

/** `import.meta.glob(…, { eager: true })`: Vite turns it into static imports of every match. */
function eagerGlobMatches(file: string, source: ts.SourceFile, call: ts.CallExpression): string[] {
  const [patterns, options] = call.arguments
  const eager =
    options !== undefined &&
    ts.isObjectLiteralExpression(options) &&
    options.properties.some((property) => ts.isPropertyAssignment(property) && property.name.getText(source) === 'eager' && property.initializer.kind === ts.SyntaxKind.TrueKeyword)
  if (!eager || patterns === undefined) return []
  const out: string[] = []
  for (const element of ts.isArrayLiteralExpression(patterns) ? [...patterns.elements] : [patterns]) {
    if (!ts.isStringLiteralLike(element)) throw new Error(`${path.relative(ROOT, file)}: an eager glob with a computed pattern`)
    if (element.text.startsWith('!')) continue
    const cwd = element.text.startsWith('/') ? ROOT : path.dirname(file)
    for (const match of fs.globSync(element.text.replace(/^\//, ''), { cwd })) out.push(path.join(cwd, match))
  }
  return out
}

/**
 * The modules a file loads when it is evaluated: value imports and re-exports
 * (not type-only ones), `require()`, and the matches of eager globs; never
 * `import()` or a lazy glob.
 */
function valueImports(file: string, code = fs.readFileSync(file, 'utf8')): { readonly specifiers: string[]; readonly files: string[] } {
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  const specifiers: string[] = []
  const files: string[] = []
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause
      if (clause?.isTypeOnly) continue
      const named = clause?.namedBindings
      const onlyTypes = clause && !clause.name && named && ts.isNamedImports(named) && named.elements.length > 0 && named.elements.every((element) => element.isTypeOnly)
      if (!onlyTypes) specifiers.push((statement.moduleSpecifier as ts.StringLiteral).text)
    } else if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && !statement.isTypeOnly) {
      const clause = statement.exportClause
      const onlyTypes = clause && ts.isNamedExports(clause) && clause.elements.length > 0 && clause.elements.every((element) => element.isTypeOnly)
      if (!onlyTypes) specifiers.push((statement.moduleSpecifier as ts.StringLiteral).text)
    } else if (ts.isImportEqualsDeclaration(statement) && !statement.isTypeOnly && ts.isExternalModuleReference(statement.moduleReference)) {
      specifiers.push((statement.moduleReference.expression as ts.StringLiteral).text)
    }
  }
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression
      const [first] = node.arguments
      if (ts.isIdentifier(callee) && callee.text === 'require' && first && ts.isStringLiteralLike(first)) specifiers.push(first.text)
      if (ts.isPropertyAccessExpression(callee) && callee.getText(source) === 'import.meta.glob') files.push(...eagerGlobMatches(file, source, node))
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return { specifiers, files }
}

function eagerRouteFiles(): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.tsx?$/.test(entry.name) && !/\.lazy\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) && !entry.name.startsWith('-')) out.push(full)
    }
  }
  walk(path.join(ROOT, 'src/routes'))
  return out
}

/** Every module loaded at start-up, with the chain that first reached it. */
function startUpGraph(): Map<string, readonly string[]> {
  const reached = new Map<string, readonly string[]>()
  const roots = [...START_UP_ROOTS.map((root) => path.join(ROOT, root)), ...eagerRouteFiles()]
  const queue: [string, readonly string[]][] = roots.map((file) => [file, [file]])
  while (queue.length > 0) {
    const [file, chain] = queue.shift()!
    const rel = path.relative(ROOT, file)
    if (reached.has(rel)) continue
    reached.set(rel, chain.map((step) => path.relative(ROOT, step)))
    if (!/\.[mc]?[jt]sx?$/.test(file)) continue // data (JSON): reached, imports nothing
    const { specifiers, files } = valueImports(file)
    for (const next of [...specifiers.map((specifier) => resolve(file, specifier)), ...files]) if (next) queue.push([next, [...chain, next]])
  }
  return reached
}

describe('the start-up graph', () => {
  const graph = startUpGraph()

  it('is walked from the start-up roots and the eager route files', () => {
    for (const root of [...START_UP_ROOTS, 'src/routes/__root.tsx', 'src/schemas/legal-search.ts']) expect(graph.has(root), root).toBe(true)
    expect(graph.size).toBeGreaterThan(200)
  })

  it('follows what the bundler keeps and skips what it drops', () => {
    // Parsed from memory as if it were a route file: nothing is written under src/routes.
    const file = path.join(ROOT, 'src/routes/legislation/probe.tsx')
    const probe = (code: string) => {
      const { specifiers, files } = valueImports(file, code)
      return [...specifiers.map((specifier) => resolve(file, specifier)), ...files].map((found) => found && path.relative(ROOT, found))
    }
    expect(probe("import { a } from '@/schemas/legal.js'")).toEqual(['src/schemas/legal.ts'])
    expect(probe("import '/src/schemas/legal.ts'")).toEqual(['src/schemas/legal.ts'])
    expect(probe("import { a } from '@/schemas/legal.ts?inline&x=1'")).toEqual(['src/schemas/legal.ts'])
    expect(probe("export * from '../../schemas/legal'")).toEqual(['src/schemas/legal.ts'])
    expect(probe("export * as legal from '../../schemas/legal'")).toEqual(['src/schemas/legal.ts'])
    expect(probe("import '@/schemas/legal'")).toEqual(['src/schemas/legal.ts'])
    expect(probe("const legal = require('../../schemas/legal')")).toEqual(['src/schemas/legal.ts'])
    expect(probe("const all = import.meta.glob('/src/schemas/legal.ts', { eager: true })")).toEqual(['src/schemas/legal.ts'])
    expect(probe("const lazy = import.meta.glob('/src/schemas/legal.ts')")).toEqual([])
    expect(
      probe("import type { A } from '@/schemas/legal'\nimport { type B } from '@/schemas/legal'\nexport { type C } from '@/schemas/legal'\nexport type { D } from '@/schemas/legal'"),
    ).toEqual([])
    expect(probe("const m = () => import('@/schemas/legal')")).toEqual([])
    expect(probe("import font from '@/assets/fonts/inter-latin.woff2?url'\nimport text from '@/schemas/legal.ts?raw&x=1'")).toEqual([null, null])
    expect(() => probe("import { a } from '@/schemas/no-such-module'")).toThrow(/cannot resolve/)
  })

  it.each(KEPT_OUT.map(({ family, modules }) => [family, modules] as const))('%s: carries none of its data schemas, API adapters or mocks', (_family, modules) => {
    const carried = [...graph].filter(([rel]) => modules.some((pattern) => pattern.test(rel))).map(([rel, chain]) => `${rel}\n    via ${chain.join('\n     -> ')}`)
    expect(carried, 'import these through `await import(...)` in a loader, or from a lazy component').toEqual([])
  })
})
