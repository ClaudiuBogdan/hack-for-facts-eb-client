import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Keeps raw Tailwind palette colours out of the folders that moved onto the
 * design tokens (docs/design/learning-design-tokens.md). Colour there comes from
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
const GUARDED = ['src/features/learning', 'src/features/campaigns', 'src/features/challenges', 'src/content/learning']

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
 * (see `isIdSelector`); `supports-[color:#123456]:underline` is a colour and is not.
 */
const HEX = /(?<!(?:href|to|hash)\s*[:=]\s*['"\x60])(?<=['"\x60(\s:[,])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g
const HEX_GUARDED = 'src/features/learning/'

/**
 * A colour literal: a hex colour, or an `rgb()`/`hsl()`-family function written
 * with numbers. A token read through a variable (`hsl(var(--primary))`,
 * `rgb(var(--x) / 0.5)`) is not a literal.
 */
const COLOUR_LITERAL = String.raw`#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9A-Za-z-])|(?<![A-Za-z0-9-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\((?!\s*var\()`
const LITERAL = new RegExp(COLOUR_LITERAL, 'g')

/** A colour function written with numbers, anywhere in learning code (inline styles, data files). */
const FUNCTION_LITERAL = /(?<![A-Za-z0-9-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\((?!\s*var\()/g

/**
 * Tailwind's arbitrary brackets in a class: a utility's value (`bg-[…]`,
 * `shadow-[…]`, `hover:text-[…]/20`) or an arbitrary property starting a class
 * (`[color:…]`, `hover:[background:…]`). Their content has no spaces or quotes,
 * so a JavaScript array (`['#fee2e2']`) or index (`items[0]`) is not one.
 */
const ARBITRARY = /(?:(?<=[a-z0-9])-\[([^\]\s'"\x60]+)\]|(?<=^|[\s'"\x60:!{(,])\[([a-z-]+:[^\]\s'"\x60]+)\])/gm

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
    const content = m[1] ?? m[2]
    const isVariant = text[m.index + m[0].length] === ':'
    const literals = [...content.matchAll(LITERAL)].filter((l) => {
      if (l[0][0] !== '#') return true
      if (content.slice(Math.max(0, l.index - 4), l.index) === 'url(') return false // a fragment: `mask-[url(#fade)]`
      return !isVariant || /[:(,]/.test(content[l.index - 1] ?? '')
    })
    if (literals.length > 0) found.push(m[0])
  }
  return found
}

/** Repository-relative paths, always with `/`, so offenders read the same on every platform. */
function sourceFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(tsx?|mdx?)$/.test(entry.name) ? [path] : []
  })
}

/** A `#id` selector inside an arbitrary variant: `[#fff]:` with the `#` right after the bracket. */
function isIdSelector(text: string, start: number, length: number): boolean {
  return text[start - 1] === '[' && text.slice(start + length, start + length + 2) === ']:'
}

/** The raw colours in one piece of source text, as the guard sees them in `file`. */
function rawColours(file: string, text: string): string[] {
  const found = [...text.matchAll(PALETTE)].map((m) => m[0])
  if (file.startsWith(HEX_GUARDED) && /\.tsx?$/.test(file)) {
    found.push(...[...text.matchAll(HEX)].filter((m) => !isIdSelector(text, m.index, m[0].length)).map((m) => m[0]))
    found.push(...[...text.matchAll(FUNCTION_LITERAL)].map((m) => m[0]))
  }
  found.push(...arbitraryColours(text))
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
    ['a url fragment', 'fill-[url(#abcd1)] mask-[url(#fade)]'],
  ])('leaves %s alone', (_, text) => {
    expect(rawColours('src/features/campaigns/x.tsx', text)).toEqual([])
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
