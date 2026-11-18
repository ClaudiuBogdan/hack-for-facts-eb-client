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
  {
    family: 'statistics',
    modules: [/^src\/schemas\/statistics\.ts$/, /^src\/features\/statistics\/(api|hooks)\//],
  },
  { family: 'entity analytics', modules: [/^src\/lib\/entity-analytics-query\.ts$/] },
  { family: 'parliament', modules: [/^src\/schemas\/parliament\.ts$/] },
  {
    family: 'procurement',
    modules: [/^src\/schemas\/procurement-hub\.ts$/, /^src\/features\/procurement\/lib\/analytics-legacy\.ts$/],
  },
  // The map previews' definitions, which build and parse four map states when they load. The map
  // schemas themselves still load with `/maps/public/$mapId`, whose request must start at the click.
  { family: 'entity page map previews', modules: [/^src\/features\/challenges\/components\/analysis\/challenge-entity-public-maps\.ts$/] },
  { family: 'NGO registry', modules: [/^src\/features\/ngos\/registry\/api\.ts$/] },
  // Reached by the NGO pages' and procurement analytics' heads only for a company's display name.
  {
    family: 'private-company profile',
    modules: [/^src\/schemas\/private-company(-registry|-main-activity)?\.ts$/, /^src\/features\/private-companies\/lib\/company-profile-model\.ts$/],
  },
  { family: 'justice', modules: [/^src\/schemas\/judicial\.ts$/] },
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
 * The route options Start's code splitting moves into their own chunk by
 * default (`defaultCodeSplitGroupings` in `@tanstack/router-plugin`): what only
 * they use is not loaded with the route tree. `loader` and `pendingComponent`
 * stay in the route file.
 */
const SPLIT_OPTIONS = new Set(['component', 'errorComponent', 'notFoundComponent'])

/** The identifiers a node uses, leaving out property names (`a.b`, `{ b: … }`) and the nodes in `skip`. */
function usedNames(node: ts.Node, into: Set<string>, skip: ReadonlySet<ts.Node> = new Set()): void {
  const visit = (current: ts.Node) => {
    if (skip.has(current)) return
    if (ts.isIdentifier(current)) {
      const parent = current.parent
      const isPropertyName =
        (ts.isPropertyAccessExpression(parent) && parent.name === current) || (ts.isPropertyAssignment(parent) && parent.name === current) || (ts.isMethodDeclaration(parent) && parent.name === current)
      if (!isPropertyName) into.add(current.text)
    }
    ts.forEachChild(current, visit)
  }
  visit(node)
}

/** Every name a declaration binds: `x`, and each name a destructuring pattern (`{ a: x, ...rest }`, `[x, y]`) binds. */
function boundNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) return [name.text]
  return name.elements.flatMap((element) => (ts.isOmittedExpression(element) ? [] : boundNames(element.name)))
}

/**
 * In a route file, the names the route tree keeps once Start has split the
 * route's components out: the route options that are not split, what is
 * exported, a top-level statement that is not a declaration, and,
 * transitively, the top-level declarations those use. A declaration only a
 * split component uses is moved out with it, initializer and all. Null when the
 * file declares no route.
 */
function namesKeptAfterSplit(source: ts.SourceFile): Set<string> | null {
  const declarations = new Map<string, ts.Node>()
  const roots: ts.Node[] = []
  const split = new Set<ts.Node>()
  let routeOptions: ts.ObjectLiteralExpression | null = null
  const findRoute = (node: ts.Node) => {
    // `createFileRoute('/x')({ … })`, `createRootRouteWithContext<…>()({ … })`.
    if (ts.isCallExpression(node) && ts.isCallExpression(node.expression) && ts.isIdentifier(node.expression.expression) && /^create\w*Route\w*$/.test(node.expression.expression.text)) {
      const [options] = node.arguments
      if (options && ts.isObjectLiteralExpression(options)) routeOptions = options
    }
    ts.forEachChild(node, findRoute)
  }
  findRoute(source)
  if (!routeOptions) return null
  const options: ts.ObjectLiteralExpression = routeOptions
  const propertyName = (property: ts.ObjectLiteralElementLike) => (property.name && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) ? property.name.text : null)
  // A route that sets its own split groupings is read as unsplit: everything it imports counts.
  const ownGroupings = options.properties.some((property) => propertyName(property) === 'codeSplitGroupings')
  for (const property of ownGroupings ? [] : options.properties) {
    const name = propertyName(property)
    // Only a property's value is moved out; a method (`component() {…}`) stays with the route.
    if (name !== null && SPLIT_OPTIONS.has(name) && (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property))) split.add(property)
  }
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement)) continue
    const exported = ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      declarations.set(statement.name.text, statement)
      if (exported) roots.push(statement)
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        for (const name of boundNames(declaration.name)) declarations.set(name, declaration)
        // A declaration is kept when eager code uses it, or exported; one only the split components use goes with
        // them (the splitter removes it, initializer and imports, from the route file).
        if (exported) roots.push(declaration)
      }
    } else if (ts.isClassDeclaration(statement) && statement.name) {
      declarations.set(statement.name.text, statement)
      roots.push(statement)
    } else if (!ts.isInterfaceDeclaration(statement) && !ts.isTypeAliasDeclaration(statement)) {
      roots.push(statement)
    }
  }
  const kept = new Set<string>()
  const pending = [...roots]
  const scanned = new Set<ts.Node>()
  while (pending.length > 0) {
    const node = pending.pop()!
    if (scanned.has(node)) continue
    scanned.add(node)
    const names = new Set<string>()
    // The route's own declaration runs, its split options do not.
    usedNames(node, names, split)
    for (const name of names) {
      if (kept.has(name)) continue
      kept.add(name)
      const declaration = declarations.get(name)
      if (declaration) pending.push(declaration)
    }
  }
  return kept
}

/**
 * The modules a file loads when it is evaluated: value imports and re-exports
 * (not type-only ones), `require()`, and the matches of eager globs; never
 * `import()` or a lazy glob. In a route file, an import only the split-out
 * components use is not loaded with the route tree.
 */
function valueImports(file: string, code = fs.readFileSync(file, 'utf8')): { readonly specifiers: string[]; readonly files: string[] } {
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  // The root route's component is the app shell, loaded before the first render: Start splits only the other routes'.
  const splits = file.startsWith(path.join(ROOT, 'src/routes') + path.sep) && path.basename(file) !== '__root.tsx'
  const kept = splits ? namesKeptAfterSplit(source) : null
  const specifiers: string[] = []
  const files: string[] = []
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause
      if (clause?.isTypeOnly) continue
      const named = clause?.namedBindings
      const onlyTypes = clause && !clause.name && named && ts.isNamedImports(named) && named.elements.length > 0 && named.elements.every((element) => element.isTypeOnly)
      if (onlyTypes) continue
      if (kept && clause) {
        const bindings = [
          ...(clause.name ? [clause.name.text] : []),
          ...(named && ts.isNamespaceImport(named) ? [named.name.text] : []),
          ...(named && ts.isNamedImports(named) ? named.elements.filter((element) => !element.isTypeOnly).map((element) => element.name.text) : []),
        ]
        if (bindings.length > 0 && !bindings.some((binding) => kept.has(binding))) continue
      }
      specifiers.push((statement.moduleSpecifier as ts.StringLiteral).text)
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

  it('models the splitting Start is configured for: its default groupings', () => {
    // The model above is Start's default (`defaultCodeSplitGroupings`); a configured split changes what the route tree keeps.
    expect(fs.readFileSync(path.join(ROOT, 'vite.config.ts'), 'utf8')).not.toMatch(/codeSplittingOptions|codeSplitGroupings|autoCodeSplitting/u)
  })

  it('leaves out what only the components Start splits off use, and keeps the rest', () => {
    const file = path.join(ROOT, 'src/routes/legislation/probe.tsx')
    const kept = (code: string) => valueImports(file, code).specifiers
    const route = (options: string, rest = '') =>
      `import { createFileRoute } from '@tanstack/react-router'\nimport { a } from '@/lib/a'\nimport { b } from '@/lib/b'\n${rest}\nexport const Route = createFileRoute('/x')({ ${options} })`
    // Only the component uses `a`, directly or through a local function: split off with it.
    expect(kept(route('component: () => a()'))).toEqual(['@tanstack/react-router'])
    expect(kept(route('component: Page, errorComponent: Failed', 'function Page() { return a() }\nconst Failed = () => b()'))).toEqual(['@tanstack/react-router'])
    // The loader, the pending component, the head and the search validation stay in the route file.
    expect(kept(route('loader: () => a(), component: () => b()'))).toEqual(['@tanstack/react-router', '@/lib/a'])
    expect(kept(route('pendingComponent: Pending', 'function Pending() { return a() }'))).toEqual(['@tanstack/react-router', '@/lib/a'])
    expect(kept(route('head: () => headOf(), component: () => b()', 'function headOf() { return a() }'))).toEqual(['@tanstack/react-router', '@/lib/a'])
    // A declaration goes with whoever uses it: the loader keeps it, a split component alone does not.
    expect(kept(route('loader: () => logger, component: () => b()', 'const logger = a()'))).toEqual(['@tanstack/react-router', '@/lib/a'])
    expect(kept(route('component: () => data', 'const data = a()'))).toEqual(['@tanstack/react-router'])
    // A top-level statement runs, and an export stays.
    expect(kept(route('component: () => b()', 'a()'))).toEqual(['@tanstack/react-router', '@/lib/a'])
    expect(kept(route('component: () => b()', 'export function helper() { return a() }'))).toEqual(['@tanstack/react-router', '@/lib/a'])
    // A component written as a method is not split.
    expect(kept(route('component() { return a() }'))).toEqual(['@tanstack/react-router', '@/lib/a'])
    // A destructured declaration the loader uses is kept, its source with it.
    expect(kept(route('loader: () => statuses, component: () => b()', 'const { options: statuses } = a'))).toEqual(['@tanstack/react-router', '@/lib/a'])
    expect(kept(route('loader: () => first, component: () => b()', 'const [, first] = a'))).toEqual(['@tanstack/react-router', '@/lib/a'])
    // A route that sets its own split groupings is not split by this model.
    expect(kept(route('codeSplitGroupings: [], component: () => a()'))).toEqual(['@tanstack/react-router', '@/lib/a'])
    // A side-effect import always stays; a module that declares no route is not split.
    expect(kept("import '@/lib/a'\nexport const x = 1")).toEqual(['@/lib/a'])
    expect(kept("import { a } from '@/lib/a'\nexport const Page = () => a()")).toEqual(['@/lib/a'])
  })

  it.each(KEPT_OUT.map(({ family, modules }) => [family, modules] as const))('%s: carries none of its data schemas, API adapters or mocks', (_family, modules) => {
    const carried = [...graph].filter(([rel]) => modules.some((pattern) => pattern.test(rel))).map(([rel, chain]) => `${rel}\n    via ${chain.join('\n     -> ')}`)
    expect(carried, 'import these through `await import(...)` in a loader, or from a lazy component').toEqual([])
  })
})
