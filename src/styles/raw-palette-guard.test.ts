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
 * arbitrary variant (`has-[#fff]:underline`) is a selector and is skipped here too:
 * the `]` after it is followed by `:`.
 */
const HEX = /(?<!(?:href|to|hash)\s*[:=]\s*['"\x60])(?<=['"\x60(\s:[,])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])(?!\]:)/g
const HEX_GUARDED = 'src/features/learning/'

/**
 * A hex colour as a Tailwind arbitrary value in a class (`bg-[#3565c4]`,
 * `hover:text-[#c91d00]`, `shadow-[#3565c4]/20`, the typed `text-[color:#abc]`).
 * A `#id` inside an arbitrary variant (`has-[#x]:underline`) is a selector, not a
 * colour, and is skipped: the `]` of a value is not followed by `:`. Checked in
 * every guarded file type (MDX included) and folder: unlike a MapLibre paint string, it is a stylesheet class and has a
 * token.
 */
const HEX_CLASS = /(?<=[a-z])-\[(?:[a-z-]+:)?#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\](?:\/(?:\d+|\[[^\]]+\]))?(?![:/])/g

/** Repository-relative paths, always with `/`, so offenders read the same on every platform. */
function sourceFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(tsx?|mdx?)$/.test(entry.name) ? [path] : []
  })
}

/** The raw colours in one piece of source text, as the guard sees them in `file`. */
function rawColours(file: string, text: string): string[] {
  const found = [...text.matchAll(PALETTE)].map((m) => m[0])
  if (file.startsWith(HEX_GUARDED) && /\.tsx?$/.test(file)) found.push(...[...text.matchAll(HEX)].map((m) => m[0]))
  if (!(file.startsWith(HEX_GUARDED) && /\.tsx?$/.test(file))) found.push(...[...text.matchAll(HEX_CLASS)].map((m) => m[0]))
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
    ['an arbitrary-value colour', 'bg-[#1e40af] hover:bg-[#1e3a8a]', ['#1e40af', '#1e3a8a']],
    ['a quoted colour', "fill: '#3B82F6'", ['#3B82F6']],
    ['nothing in a fragment link', 'href="#abc"', []],
    ['nothing in a #id inside an arbitrary variant', 'has-[#fff]:underline group-has-[#abc]:flex', []],
  ])('finds hex in learning: %s', (_, text, expected) => {
    expect(rawColours('src/features/learning/x.tsx', text)).toEqual(expected)
  })
})

describe('hex colours in class names', () => {
  it.each([
    ['an arbitrary background', 'className="bg-[#3565c4] px-6"', ['-[#3565c4]']],
    ['a variant and a shadow with opacity', 'hover:text-[#c91d00] shadow-[#3565c4]/20', ['-[#c91d00]', '-[#3565c4]/20']],
  ])('finds %s in a campaigns file', (_, text, expected) => {
    expect(rawColours('src/features/campaigns/x.tsx', text)).toEqual(expected)
  })

  it('finds a hex value in guarded MDX', () => {
    expect(rawColours('src/content/learning/x.mdx', '<div className="bg-[#fff] p-2" />')).toEqual(['-[#fff]'])
  })

  it('finds the typed colour form, with an opacity', () => {
    expect(rawColours('src/features/campaigns/x.tsx', 'text-[color:#abc] bg-[color:#112233]/40')).toEqual(['-[color:#abc]', '-[color:#112233]/40'])
  })

  it('leaves a #id inside an arbitrary variant alone', () => {
    expect(rawColours('src/features/campaigns/x.tsx', 'has-[#fff]:underline group-has-[#abc]:flex [&_#x]:block')).toEqual([])
  })

  it('leaves a MapLibre paint string outside learning alone', () => {
    expect(rawColours('src/features/campaigns/x.tsx', "paint: { 'fill-color': '#ef2d00' }")).toEqual([])
  })
})
