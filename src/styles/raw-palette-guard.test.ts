import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * Keeps raw Tailwind palette colours out of the folders that moved onto the
 * design tokens (docs/design/learning-design-tokens.md), and parliament's skin
 * on its own named tokens (docs/design/parliament-skin-tokens.md). Colour there comes from
 * the tokens — `primary`, the neutrals, `status-*`, `chart-1…4` — so a lesson,
 * a challenge or a campaign page looks like the rest of the app in both themes,
 * and the global stylesheet does not carry a shade, an opacity and a `dark:`
 * variant of every hue for them.
 *
 * It reads source text, so it cannot see a class name built at runtime
 * (`bg-${hue}-500`); the design forbids building them, and Tailwind could not
 * generate one either.
 */

const ROOT = resolve(__dirname, '../..')
const GUARDED = ['src/features/learning', 'src/features/campaigns', 'src/features/challenges', 'src/content/learning', 'src/features/parliament']

/**
 * Parliament draws with `--parliament-*`, never PNRR's tokens: PNRR's brutalist skin is quarantined to PNRR
 * (DESIGN.md), so a change there must not move parliament. Any reference counts, in a class or an inline style.
 */
const PNRR_VARIABLE = /--pnrr-[\w-]+/g
const PARLIAMENT = 'src/features/parliament/'

/**
 * The colours in parliament's code that are data, not skin: party brand colours and ballot categories. Hex is allowed
 * inside these declarations only; anywhere else in parliament code (a theme constant, an inline style, a fallback) a
 * colour comes from a `--parliament-*` token.
 */
const PARLIAMENT_DATA_COLOURS: Readonly<Record<string, readonly string[]>> = {
  'src/features/parliament/lib/group-colors.ts': ['GROUP_BRAND_COLORS', 'FALLBACK_PALETTE'],
  'src/features/parliament/lib/group-theme.ts': ['GROUP_BALLOT_COLORS'],
}

/**
 * Parliament files not yet converted (docs/design/parliament-skin-tokens-plan.md, Tasks 4–8). Each batch removes the
 * files it converts; a listed file that is already clean fails, so the list only shrinks. Empty, then deleted, after
 * Task 8.
 */
const PENDING_PARLIAMENT: readonly string[] = [
  'src/features/parliament/components/agenda-dossier-header.tsx',
  'src/features/parliament/components/agenda-item-row.tsx',
  'src/features/parliament/components/agenda-list-card.tsx',
  'src/features/parliament/components/ai-summary-card.tsx',
  'src/features/parliament/components/find-rep-dialog.tsx',
  'src/features/parliament/components/parliament-agenda-detail-page.tsx',
  'src/features/parliament/components/parliament-agenda-page.tsx',
  'src/features/parliament/components/parliament-committee-detail-page.tsx',
  'src/features/parliament/components/parliament-committees-page.tsx',
  'src/features/parliament/components/parliament-debounced-search-input.tsx',
  'src/features/parliament/components/parliament-filter-trigger-button.tsx',
  'src/features/parliament/components/parliament-list-surface.tsx',
  'src/features/parliament/components/parliament-resource-card.tsx',
  'src/features/parliament/components/parliament-shell.tsx',
  'src/features/parliament/components/parliament-speaker-combobox.tsx',
  'src/features/parliament/components/parliament-speeches-filter-sheet.tsx',
  'src/features/parliament/components/parliament-stenogram-controls.tsx',
  'src/features/parliament/components/parliament-stenogram-document.tsx',
  'src/features/parliament/components/parliament-stenogram-failure.tsx',
  'src/features/parliament/components/parliament-stenogram-intervention-rail.tsx',
  'src/features/parliament/components/parliament-stenogram-interventions-view.tsx',
  'src/features/parliament/components/parliament-stenogram-reader-page.tsx',
  'src/features/parliament/components/parliament-stenogram-session-card.tsx',
  'src/features/parliament/components/parliament-stenogram-sessions-view.tsx',
  'src/features/parliament/components/parliament-stenogram-speaker-filter.tsx',
  'src/features/parliament/components/parliament-stenogram-toc.tsx',
  'src/features/parliament/components/parliament-year-combobox.tsx',
]
const pending = new Set(PENDING_PARLIAMENT)

/** The palette families of the installed Tailwind, read from its own theme, so a new family is caught too. */
const FAMILIES = [...new Set([...readFileSync(join(ROOT, 'node_modules/tailwindcss/theme.css'), 'utf8').matchAll(/--color-([a-z]+)-50:/g)].map((m) => m[1]))]

/**
 * A palette colour as a class (`bg-red-500`, `dark:hover:border-t-rose-600/40`,
 * `ring-offset-zinc-950`, `!text-sky-700`) or as a theme variable
 * (`var(--color-zinc-200)`). The class must start a token, after whitespace, a
 * quote, a variant's colon, `!`, `[`, `(`, `,` or `{`, so an identifier that
 * merely contains one (`icon-bg-red-500-label`) is not a class.
 */
const PALETTE = new RegExp(
  String.raw`(?<=^|[\s'"\x60:!\[(,{])[a-z][a-z-]*?-(?:${FAMILIES.join('|')})-\d{2,3}(?:\/\d+|\/\[[^\]]+\])?(?![\w-])|--color-(?:${FAMILIES.join('|')})-\d{2,3}\b`,
  'gm',
)

/**
 * A hex colour in code: in a string, an arbitrary value (`bg-[#1e40af]`) or a
 * style. Not a fragment link (`href="#abc"`). Checked in learning only: the
 * campaign and challenge maps paint MapLibre layers and canvases, which take
 * colour strings, not classes, and are outside this pass. A `#id` inside an
 * arbitrary variant (`has-[#fff]:underline`) is a selector and is skipped here too
 * (see `variantIdOffsets`); `supports-[color:#123456]:underline` is a colour and is not.
 */
const HEX = /(?<!(?:href|to|hash)\s*[:=]\s*['"\x60])(?<=['"\x60(\s:[,])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g
const HEX_GUARDED = 'src/features/learning/'

/**
 * A colour literal: a hex colour, or an `rgb()`/`hsl()`-family function written
 * with numbers. A token read through a variable (`hsl(var(--primary))`,
 * `rgb(var(--x) / 0.5)`) is not a literal.
 */
const COLOUR_LITERAL = String.raw`#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9A-Za-z-])|(?<![A-Za-z0-9-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\((?!\s*var\()`
const LITERAL = new RegExp(COLOUR_LITERAL, 'gi')

/** A colour function written with numbers, anywhere in learning code (inline styles, data files). */
const FUNCTION_LITERAL = /(?<![A-Za-z0-9-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\((?!\s*var\()/gi

/**
 * Tailwind's arbitrary brackets in a class: a utility's value (`bg-[…]`,
 * `shadow-[…]`, `hover:text-[…]/20`) or an arbitrary property starting a class
 * (`[color:…]`, `hover:[background:…]`). Their content has no spaces; a value may
 * hold quotes (`bg-[url('/a.png'),linear-gradient(#123,#456)]`). A JavaScript array
 * (`['#fee2e2']`) or index (`items[0]`) does not follow a utility's `-` or start with a
 * property, so it is not one.
 */
const ARBITRARY = /(?:(?<=[a-z0-9])-\[((?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|[^\]\s'"])+)\]|(?<=^|[\s'"\x60:!{(,])\[([a-zA-Z0-9_-]+:(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|[^\]\s'"])+)\]|(?<=^|[\s'"\x60:!{(,])\[([^\]\s'"\x60]+)\](?=:))/gm

/**
 * A colour literal inside an arbitrary value or property, in any guarded file
 * and folder (MDX included): `bg-[#3565c4]`, `[color:#abc]`,
 * `bg-[linear-gradient(#123456,#abcdef)]`, `shadow-[0_0_4px_#ef4444]`,
 * `shadow-[0_8px_20px_rgba(15,23,42,0.2)]`. Unlike a MapLibre paint string, a
 * class is stylesheet colour and has a token. An arbitrary *variant* (the bracket
 * followed by `:`) is a selector, so a `#id` in it (`has-[#fff]:underline`,
 * `[&_#x]:block`) is skipped; a colour value in it (`supports-[color:#123456]:`)
 * is not.
 */
function arbitraryColours(text: string): string[] {
  const found: string[] = []
  for (const m of text.matchAll(ARBITRARY)) {
    const content = m[1] ?? m[2] ?? m[3]
    const isVariant = text[m.index + m[0].length] === ':'
    const literals = [...content.matchAll(LITERAL)].filter((l) => {
      if (l[0][0] !== '#') return true
      if (/url\(\s*['"]?$/.test(content.slice(0, l.index))) return false // a fragment: `mask-[url(#fade)]`, `url('#fade')`
      return !isVariant || isDeclarationVariant(text, m.index, content)
    })
    if (literals.length > 0) found.push(m[0])
  }
  return found
}

/**
 * What an arbitrary variant's bracket starts with tells a value from a selector: a property
 * (`color:`, `background:`, `--cmp-2:`, `--brandAccent:`) makes the rest a value, so any hex in it is a colour;
 * anything else (`&`, `#`, `.`, `:`, `>`) is a selector, where `#name` is an ID.
 */
const STARTS_WITH_PROPERTY = /^-{0,2}[a-zA-Z][\w-]*:/

/**
 * Whether an arbitrary variant's bracket holds a declaration (`supports-[color:#123456]:`) rather than a selector
 * (`has-[a:is(#abc)]:`, `group-has-[#x]:`, `[&_#x]:`): only a `supports-` variant takes a declaration.
 */
function isDeclarationVariant(text: string, bracketAt: number, content: string): boolean {
  const variant = text.slice(Math.max(0, bracketAt - 24), bracketAt + 1).match(/([\w-]*)-?\[?$/)?.[1] ?? ''
  return /(^|-)supports$/.test(variant.replace(/-$/, '')) && STARTS_WITH_PROPERTY.test(content)
}

/** Absolute offsets of the `#id` selectors inside arbitrary variants (`has-[#a,#b]:underline`). */
function variantIdOffsets(text: string): Set<number> {
  const ids = new Set<number>()
  for (const m of text.matchAll(ARBITRARY)) {
    if (text[m.index + m[0].length] !== ':') continue
    const content = m[1] ?? m[2] ?? m[3]
    if (isDeclarationVariant(text, m.index, content)) continue
    const start = m.index + m[0].indexOf('[') + 1
    for (const l of content.matchAll(/#[0-9A-Za-z-]+/g)) ids.add(start + l.index)
  }
  return ids
}

/** Repository-relative paths, always with `/`, so offenders read the same on every platform. */
function sourceFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(tsx?|mdx?)$/.test(entry.name) ? [path] : []
  })
}

/**
 * The source with its comments, and the initializers of the declarations named in `allowed`, blanked to spaces
 * (offsets kept). Read through the TypeScript parser, so a bracket or a `#172` in a comment, or a nested literal in a
 * data map, cannot shift what is skipped.
 */
function codeOnly(text: string, allowed: readonly string[] = []): string {
  const source = ts.createSourceFile('guarded.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const comments: [number, number][] = []
  const data: [number, number][] = []
  const jsxText: [number, number][] = []
  const found = new Set<string>()
  const commentsAt = (at: number) => [...(ts.getLeadingCommentRanges(text, at) ?? []), ...(ts.getTrailingCommentRanges(text, at) ?? [])]
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) jsxText.push([node.pos, node.end])
    for (const c of [...commentsAt(node.pos), ...commentsAt(node.end)]) comments.push([c.pos, c.end])
    // `{/* … */}`: a comment that is the whole of a JSX expression.
    if (ts.isJsxExpression(node)) for (const c of commentsAt(node.getStart(source) + 1)) comments.push([c.pos, c.end])
    if (ts.isVariableDeclaration(node) && node.initializer && allowed.includes(node.name.getText(source))) {
      found.add(node.name.getText(source))
      data.push([node.initializer.getStart(source), node.initializer.end])
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  for (const name of allowed) if (!found.has(name)) throw new Error(`${name}: declared data colours not found; update PARLIAMENT_DATA_COLOURS`)
  // JSX text that reads like `// …` is text, not a comment.
  const inJsxText = ([from]: [number, number]) => jsxText.some(([a, b]) => from >= a && from < b)
  // TypeScript's offsets count UTF-16 units, as string indexes do: blank by index, not by code point.
  let code = text
  for (const [from, to] of [...comments.filter((range) => !inJsxText(range)), ...data]) {
    code = code.slice(0, from) + code.slice(from, to).replace(/[^\n]/g, ' ') + code.slice(to)
  }
  return code
}

/** Hex and colour functions written in code (comments and the `allowed` data declarations aside). */
function codeColours(text: string, allowed: readonly string[] = []): string[] {
  const code = codeOnly(text, allowed)
  const ids = variantIdOffsets(code)
  // `url('#fade')` names an SVG fragment, not a colour.
  const isFragment = (at: number) => /url\(\s*['"\x60]?$/.test(code.slice(Math.max(0, at - 8), at))
  return [...[...code.matchAll(HEX)].filter((m) => !ids.has(m.index) && !isFragment(m.index)).map((m) => m[0]), ...[...code.matchAll(FUNCTION_LITERAL)].map((m) => m[0])]
}

/**
 * The raw colours in one piece of source text, as the guard sees them in `file`. A parliament file still pending
 * conversion is checked for Tailwind palette classes only: those were never allowed there.
 */
function rawColours(file: string, text: string, isPending = pending.has(file)): string[] {
  const found = [...text.matchAll(PALETTE)].map((m) => m[0])
  if (isPending) return found
  const isCode = /\.tsx?$/.test(file)
  if (file.startsWith(HEX_GUARDED) && isCode) found.push(...codeColours(text))
  found.push(...arbitraryColours(text))
  if (file.startsWith(PARLIAMENT)) {
    // Tests hold party and API fixtures: their classes are checked, their data is not.
    if (isCode && !/\.test\.tsx?$/.test(file)) found.push(...codeColours(text, PARLIAMENT_DATA_COLOURS[file]))
    found.push(...[...text.matchAll(PNRR_VARIABLE)].map((m) => m[0]))
  }
  return found
}

const files = GUARDED.flatMap(sourceFiles)
const coloursIn = (file: string) => rawColours(file, readFileSync(join(ROOT, file), 'utf8'))

describe('raw palette colours', () => {
  it('appear in no guarded file', () => {
    const offenders = files
      .map((file) => ({ file, colours: [...new Set(coloursIn(file))] }))
      .filter(({ colours }) => colours.length > 0)
      .map(({ file, colours }) => `${file}: ${colours.slice(0, 6).join(' ')}${colours.length > 6 ? ' …' : ''}`)
    expect(offenders).toEqual([])
  })

  it('leave no pending parliament file listed once it is clean, or listed twice, or missing', () => {
    // Checked as if not pending: the file must still hold a colour the conversion will remove.
    const unexempted = (file: string) => rawColours(file, readFileSync(join(ROOT, file), 'utf8'), false)
    const parliamentFiles = files.filter((file) => file.startsWith(PARLIAMENT))
    expect(PENDING_PARLIAMENT.filter((file) => !parliamentFiles.includes(file)), 'listed but not a parliament source file').toEqual([])
    expect(PENDING_PARLIAMENT.length, 'listed twice').toBe(pending.size)
    expect(PENDING_PARLIAMENT.filter((file) => unexempted(file).length === 0), 'already clean: remove from PENDING_PARLIAMENT').toEqual([])
  })

  it.each([
    ['a plain class', 'className="bg-red-500"', ['bg-red-500']],
    ['variants, a side border and an opacity', "cn('dark:hover:border-t-rose-600/40')", ['border-t-rose-600/40']],
    ['a ring offset', 'dark:ring-offset-zinc-950', ['ring-offset-zinc-950']],
    ['an important class', 'className="!text-sky-700"', ['text-sky-700']],
    ['an arbitrary opacity', 'bg-emerald-500/[0.35]', ['bg-emerald-500/[0.35]']],
    ['a newer family', 'bg-mist-300', ['bg-mist-300']],
    ['a theme variable', "style={{ color: 'var(--color-zinc-200)' }}", ['--color-zinc-200']],
    ['nothing in an identifier that only contains one', 'const icon-bg-red-500-label = 1', []],
    ['nothing in token classes', 'bg-status-live-bg text-primary border-chart-2', []],
  ])('finds %s', (_, text, expected) => {
    expect(rawColours('src/features/campaigns/x.tsx', text)).toEqual(expected)
  })

  it.each([
    ['an arbitrary-value colour', 'bg-[#1e40af] hover:bg-[#1e3a8a]', ['#1e40af', '#1e3a8a', '-[#1e40af]', '-[#1e3a8a]']],
    ['a quoted colour', "fill: '#3B82F6'", ['#3B82F6']],
    ['nothing in a fragment link', 'href="#abc"', []],
    ['nothing in a #id inside an arbitrary variant', 'has-[#fff]:underline group-has-[#abc]:flex', []],
    ['a colour value inside a variant', 'supports-[color:#123456]:underline', ['#123456', '-[color:#123456]']],
    ['nothing in an ID list inside a variant', 'has-[#abc,#def]:underline', []],
  ])('finds hex in learning: %s', (_, text, expected) => {
    expect(rawColours('src/features/learning/x.tsx', text)).toEqual(expected)
  })
})

describe('colour literals in arbitrary values', () => {
  it.each([
    ['an arbitrary background', 'className="bg-[#3565c4] px-6"', ['-[#3565c4]']],
    ['a variant and a shadow with opacity', 'hover:text-[#c91d00] shadow-[#3565c4]/20', ['-[#c91d00]', '-[#3565c4]']],
    ['the typed colour form, with an opacity', 'text-[color:#abc] bg-[color:#112233]/40', ['-[color:#abc]', '-[color:#112233]']],
    ['an arbitrary property', 'className="[color:#abc] hover:[background:#fff]"', ['[color:#abc]', '[background:#fff]']],
    ['a gradient', 'bg-[linear-gradient(#123456,#abcdef)]', ['-[linear-gradient(#123456,#abcdef)]']],
    ['a hex shadow', 'shadow-[0_0_4px_#ef4444]', ['-[0_0_4px_#ef4444]']],
    ['an rgba shadow', 'shadow-[0_8px_20px_rgba(15,23,42,0.2)]', ['-[0_8px_20px_rgba(15,23,42,0.2)]']],
    ['an rgb value of any colour', 'shadow-[inset_0_1px_0_rgba(255,255,255,0.32)] bg-[rgb(0_0_0)]', ['-[inset_0_1px_0_rgba(255,255,255,0.32)]', '-[rgb(0_0_0)]']],
    ['an hsl literal', 'bg-[hsl(220_80%_35%)] [--accent:hsla(0,0%,0%,0.5)]', ['-[hsl(220_80%_35%)]', '[--accent:hsla(0,0%,0%,0.5)]']],
    ['a colour value inside an arbitrary variant', 'supports-[color:#123456]:underline', ['-[color:#123456]']],
    ['a colour in a custom-property value', 'className="[--cmp-2:#1baf7a] hover:[--cmp-2:#1BAF7A]"', ['[--cmp-2:#1baf7a]', '[--cmp-2:#1BAF7A]']],
    ['an upper-case colour function', 'bg-[RGB(15_23_42)] text-[HSL(220_80%_35%)] shadow-[0_1px_2px_RGBA(0,0,0,0.1)]', ['-[RGB(15_23_42)]', '-[HSL(220_80%_35%)]', '-[0_1px_2px_RGBA(0,0,0,0.1)]']],
    ['a colour after a quoted url', "className=\"dark:bg-[url('/a.png'),linear-gradient(#0b0c0c,#505a5f)]\"", ["-[url('/a.png'),linear-gradient(#0b0c0c,#505a5f)]"]],
    ['a colour after a quoted url with an escaped quote', "bg-[url('/it\\'s.svg'),linear-gradient(#123456,#abcdef)]", ["-[url('/it\\'s.svg'),linear-gradient(#123456,#abcdef)]"]],
    ['a colour after a quoted url holding a bracket', "className=\"bg-[url('/icon[2].png'),linear-gradient(#0b0c0c,#505a5f)]\"", ["-[url('/icon[2].png'),linear-gradient(#0b0c0c,#505a5f)]"]],
  ])('finds %s, in every guarded folder', (_, text, expected) => {
    for (const file of ['src/features/campaigns/x.tsx', 'src/features/challenges/x.tsx', 'src/content/learning/x.mdx']) {
      expect(rawColours(file, text), file).toEqual(expected)
    }
  })

  it('finds them in learning too, where every hex and colour function is already caught', () => {
    expect(rawColours('src/features/learning/x.tsx', 'shadow-[0_8px_20px_rgba(15,23,42,0.2)]')).toEqual(['rgba(', '-[0_8px_20px_rgba(15,23,42,0.2)]'])
  })

  it.each([
    ['a #id inside an arbitrary variant', 'has-[#fff]:underline group-has-[#abc]:flex [&_#x]:block [&_#abc]:hidden'],
    ['a MapLibre paint string', "paint: { 'fill-color': '#ef2d00', 'line-color': 'rgba(15, 23, 42, 0.4)' }"],
    ['a colour scale array', "const SCALE = ['#fee2e2', '#fca5a5'] as const"],
    ['a token read through a variable', 'bg-[hsl(var(--muted))] [--tw-prose-kbd-shadows:hsl(var(--foreground)/0.1)] shadow-[0_0_0_1px_rgb(var(--x)/0.1)]'],
    ['an ID selector list inside a variant', 'has-[#abc,#def]:underline [&_#abc,#def]:hidden'],
    ['a custom property holding a token', '[--cmp-2:var(--chart-2)] [--cmp-3:hsl(var(--chart-3))]'],
    ['a url fragment', "fill-[url(#abcd1)] mask-[url(#fade)] mask-[url('#fade')] fill-[url(\"#g1\")]"],
  ])('leaves %s alone', (_, text) => {
    expect(rawColours('src/features/campaigns/x.tsx', text)).toEqual([])
  })
})

describe('values and selectors in an arbitrary bracket', () => {
  const FILES = ['src/features/campaigns/x.tsx', 'src/features/learning/x.tsx']
  it.each([
    ['a later argument after a property', 'supports-[background:none,#abc]:underline', '#abc'],
    ['a camel-case custom property', '[--brandAccent:#abc]', '#abc'],
    ['a custom property', '[--cmp-2:#1baf7a]', '#1baf7a'],
    ['a typed property', '[color:#abc]', '#abc'],
    ['an upper-case colour function', 'bg-[RGB(15_23_42)]', 'RGB('],
    ['a plain utility hex', 'bg-[#fff]', '#fff'],
    ['a shadow hex', 'shadow-[0_0_4px_#ef4444]', '#ef4444'],
  ])('flags %s', (_, text, colour) => {
    for (const file of FILES) expect(rawColours(file, text).some((c) => c.includes(colour)), file).toBe(true)
  })

  it.each([
    ['an ID list', 'has-[#abc,#def]:underline'],
    ['an ID inside a selector that names an element', 'has-[a:is(#abc)]:underline'],
    ['an ID after a combinator in a list', '[&_#abc,#def]:hidden'],
    ['one ID in a group variant', 'group-has-[#abc]:block'],
    ['a fragment link', 'href="#abc"'],
  ])('leaves %s alone', (_, text) => {
    for (const file of FILES) expect(rawColours(file, text), file).toEqual([])
  })

  it('leaves a MapLibre paint string alone outside learning', () => {
    expect(rawColours('src/features/campaigns/x.tsx', "'fill-color': '#ef2d00'")).toEqual([])
  })
})

describe('parliament', () => {
  const FILE = 'src/features/parliament/components/x.tsx'
  it.each([
    ['a hex class with its dark PNRR partner', 'text-[#0b0c0c] dark:text-[var(--pnrr-fg)]', ['-[#0b0c0c]', '#0b0c0c', '--pnrr-fg']],
    ['a PNRR border', 'dark:border-[var(--pnrr-border)]', ['--pnrr-border']],
    ['a PNRR variable in an inline style', "style={{ background: 'var(--pnrr-card)' }}", ['--pnrr-card']],
    ['a PNRR variable with a fallback, spaces, or the shorthand', "dark:text-[var(--pnrr-fg,var(--parliament-fg))] dark:bg-(--pnrr-card) style={{ color: 'var( --pnrr-muted )' }}", ['--pnrr-fg', '--pnrr-card', '--pnrr-muted']],
    ['a hex shadow', 'shadow-[inset_0_-2px_0_0_#b1b4b6]', ['-[inset_0_-2px_0_0_#b1b4b6]']],
    ['a skin hex in a theme constant', "export const VOTE_DETAIL_SURFACE = '#f3f2f1'", ['#f3f2f1']],
    ['a skin hex in an inline style or a fallback', "style={{ backgroundColor: '#372554' }} groupColors[id] ?? '#505a5f'", ['#372554', '#505a5f']],
    ['a colour after JSX text that looks like a comment', "<div>// <b style={{ color: '#123abc' }} /></div>", ['#123abc']],
    ['a colour after a comment and emoji', "const label = '🙂🙂🙂'\nconst bg = /* fallback */ '#123abc'", ['#123abc']],
    ['a short hex, with or without a letter', "style={{ color: '#000', fill: '#1234', stroke: '#fff' }}", ['#000', '#1234', '#fff']],
  ])('finds %s', (_, text, expected) => {
    expect(rawColours(FILE, text)).toEqual(expected)
  })

  it.each([
    ['token classes', 'text-parliament-muted border-parliament-border-strong bg-parliament-link/5'],
    ['a token inside a bracket', 'shadow-[inset_0_-2px_0_0_var(--parliament-border)]'],
    ['an issue number in a comment', '// see #172\n/* the committee at #172 of 191 */'],
    ['a hex quoted in a comment', "/** warm grey `#f3f2f1` */ const x = 1"],
    ['a JSX comment', '<div>{/* see #172 and #abc */}</div>'],
    ['a quoted url fragment', "<path style={{ mask: \"url('#fade')\" }} />"],
  ])('leaves %s alone', (_, text) => {
    expect(rawColours(FILE, text)).toEqual([])
  })

  it('allows hex only inside the declared data colours, not beside them', () => {
    const groupTheme = "export const GROUP_NOTICE_BG = '#f3f0ff'\nexport const GROUP_BALLOT_COLORS = {\n  pentru: '#1d70b8',\n  impotriva: '#d4351c',\n} as const"
    expect(rawColours('src/features/parliament/lib/group-theme.ts', groupTheme, false)).toEqual(['#f3f0ff'])
    const groupColors = "export const GROUP_BRAND_COLORS: Readonly<Record<string, string>> = {\n  psd: '#E4002B',\n}\nexport const PARLIAMENT_GROUP_FALLBACK_COLOR = '#505a5f'\nconst FALLBACK_PALETTE: readonly string[] = [\n  '#b5651d',\n]"
    expect(rawColours('src/features/parliament/lib/group-colors.ts', groupColors, false)).toEqual(['#505a5f'])
    // A bracket in a comment inside the data cannot hide what follows it.
    const tricky = "export const GROUP_BALLOT_COLORS = {\n  // Opening marker: [\n  pentru: '#1d70b8',\n}\nexport const NEW_SURFACE = '#123abc'"
    expect(rawColours('src/features/parliament/lib/group-theme.ts', tricky, false)).toEqual(['#123abc'])
  })

  it('leaves the fixtures in parliament tests alone, but not their classes', () => {
    expect(rawColours('src/features/parliament/lib/x.test.ts', "expect(color).toBe('#E4002B')")).toEqual([])
    expect(rawColours('src/features/parliament/lib/x.test.tsx', 'className="text-[#0b0c0c]"')).toEqual(['-[#0b0c0c]'])
  })

  it('still finds Tailwind palette classes in a file pending conversion', () => {
    const file = PENDING_PARLIAMENT[0]
    expect(rawColours(file, 'dark:bg-red-500 text-[#0b0c0c]')).toEqual(['bg-red-500'])
  })

  it('does not apply the PNRR rule outside parliament', () => {
    expect(rawColours('src/features/campaigns/x.tsx', 'text-[var(--pnrr-fg)]')).toEqual([])
  })
})

describe('colour functions in learning code', () => {
  it('finds an rgba or hsl literal in an inline style', () => {
    expect(rawColours('src/features/learning/x.tsx', "style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.1)', color: 'hsl(0 0% 10%)' }}")).toEqual(['rgba(', 'hsl('])
  })

  it('leaves a token read through a variable alone', () => {
    expect(rawColours('src/features/learning/x.tsx', "style={{ color: 'hsl(var(--chart-1))' }}")).toEqual([])
  })
})
