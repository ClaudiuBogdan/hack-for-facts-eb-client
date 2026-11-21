// Which parts of the code the global stylesheet's size comes from.
//
//   node docs/performance/2026-11-17-landing/tools/css-attribution.mjs            # totals and areas
//   DETAIL=src:features/learning node docs/performance/2026-11-17-landing/tools/css-attribution.mjs
//
// Compiles `src/index.css` with Tailwind's own engine (`@tailwindcss/node` and the oxide scanner, as the Vite plugin
// does) and minifies with the plugin's own optimizer. It then reports:
//   - the stylesheet the production image ships: every scanned file except the paths `.dockerignore` keeps out of
//     the Docker build context (prototypes, for instance), since the image is built from that context;
//   - for each source area (`src/features/<x>`, `src/components/<x>`, `src/content/<x>`, `src/lib`, …), the bytes
//     the shipped stylesheet would lose if that area's files were gone: classes used by any other shipped file,
//     docs and tests included, stay;
//   - with DETAIL=<area>, the same number for one area, and its own classes by utility family and variant (only
//     classes that produce CSS are counted).
// Tailwind's compiler accumulates candidates across `build()` calls, so every measurement compiles afresh.
// Per-file attribution uses the scanner's per-file extraction, which omits theme variables referenced directly
// (`var(--color-x)`): such a variable is credited to no area. Prints only; writes nothing.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const require = createRequire(path.join(repo, 'package.json'))
const { compile, optimize } = await import(require.resolve('@tailwindcss/node'))
const { Scanner } = require('@tailwindcss/oxide')

process.chdir(repo)
const input = fs.readFileSync('src/index.css', 'utf8')
const build = async (candidates) => (await compile(input, { base: path.join(repo, 'src'), onDependency: () => {} })).build(candidates)
const minified = (css) => optimize(css, { minify: true }).code.length

/** Repository-relative, with `/`. */
const repoPath = (file) => path.relative(repo, file).split(path.sep).join('/')

/** The plain path prefixes `.dockerignore` excludes (globs and file patterns are not needed here). */
const dockerIgnored = fs
  .readFileSync('.dockerignore', 'utf8')
  .split('\n')
  .map((line) => line.trim().replace(/\/$/, ''))
  .filter((line) => line && !line.startsWith('#') && !/[*!]/.test(line))
const shipped = (rel) => !dockerIgnored.some((prefix) => rel === prefix || rel.startsWith(`${prefix}/`))

/** The area a shipped file belongs to. */
function areaOf(rel) {
  if (!rel.startsWith('src/')) return rel.split('/')[0]
  const area = rel.match(/^src\/(features\/[^/]+|components\/[^/]+|content\/[^/]+|[^/]+)/)
  return `src:${area ? area[1] : 'root'}`
}

const first = await compile(input, { base: path.join(repo, 'src'), onDependency: () => {} })
const sources = []
if (first.root === null) sources.push({ base: repo, pattern: '**/*', negated: false })
else if (first.root !== 'none') sources.push({ ...first.root, negated: false })
sources.push(...first.sources)
const scanner = new Scanner({ sources })
scanner.scan()

/** For each candidate, the areas of the shipped files that use it. */
const areasOf = new Map()
for (const file of scanner.files) {
  const rel = repoPath(file)
  if (!shipped(rel)) continue
  let content
  try {
    content = fs.readFileSync(file, 'utf8')
  } catch {
    continue
  }
  for (const { candidate } of scanner.getCandidatesWithPositions({ content, extension: path.extname(file).slice(1) })) {
    if (!areasOf.has(candidate)) areasOf.set(candidate, new Set())
    areasOf.get(candidate).add(areaOf(rel))
  }
}
const all = [...areasOf.keys()]
const total = minified(await build(all))
console.log(`shipped stylesheet: ${total} bytes minified (${all.length} candidates in shipped files)`)

/** What the shipped stylesheet loses without `area`'s files, and the candidates only it uses. */
async function removal(area) {
  const own = all.filter((c) => areasOf.get(c).size === 1 && areasOf.get(c).has(area))
  const ownSet = new Set(own)
  return { bytes: total - minified(await build(all.filter((c) => !ownSet.has(c)))), own }
}

if (!process.env.DETAIL) {
  const areas = [...new Set([...areasOf.values()].flatMap((set) => [...set]))]
  const rows = []
  for (const area of areas) rows.push([area, (await removal(area)).bytes])
  console.log('bytes the shipped stylesheet loses without each area:')
  for (const [area, bytes] of rows.sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(String(bytes).padStart(8), area)
} else {
  const area = process.env.DETAIL
  const { bytes, own } = await removal(area)
  const css = await build(own)
  const emitting = own.filter((c) => css.includes(`.${c.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`)}`))
  console.log(`${area}: the shipped stylesheet loses ${bytes} bytes without it; ${emitting.length} of its ${own.length} own candidates produce CSS`)
  const family = new Map()
  const variant = new Map()
  for (const c of emitting) {
    const utility = c.split(':').at(-1).replace(/\[.*$/, '[…]').split('-').slice(0, 2).join('-')
    family.set(utility, (family.get(utility) ?? 0) + 1)
    const v = c.includes(':') ? c.split(':').slice(0, -1).join(':') : '(none)'
    variant.set(v, (variant.get(v) ?? 0) + 1)
  }
  const top = (map) =>
    [...map]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([k, n]) => `${k} ${n}`)
      .join(' | ')
  console.log(`by utility family: ${top(family)}`)
  console.log(`by variant: ${top(variant)}`)
}
