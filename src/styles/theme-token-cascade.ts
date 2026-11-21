import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { compile } from '@tailwindcss/node'
import postcss from 'postcss'

/**
 * Test support for the token tests in this folder: what Tailwind emits for `src/index.css` through the repository's
 * `@config`, and the custom properties each theme resolves to.
 *
 * The light theme is every `:root` rule in order. The dark theme is the light one with every `.dark` rule over it,
 * because `:root` and `.dark` both match `<html class="dark">` with equal specificity, so the later declaration wins
 * whichever rule it is in. That replay holds only while the tracked tokens are plain `:root`/`.dark` declarations,
 * in one layer, under no condition and never `!important`; `placements` and `importantDecls` let a test assert it.
 */

const SRC = resolve(__dirname, '..')

export type TokenPlacement = {
  readonly name: string
  readonly selectors: readonly string[]
  readonly layer: string
  readonly conditions: readonly string[]
}

export type ThemeTokens = {
  /** The CSS Tailwind emitted for the probe classes, with the theme's own rules. */
  readonly emitted: string
  /** Every custom property as the light theme resolves it. */
  readonly light: ReadonlyMap<string, string>
  /** Every custom property as the dark theme resolves it (light, with `.dark` over it). */
  readonly dark: ReadonlyMap<string, string>
  /** The tracked names each theme's own rules declare, so a token missing from `.dark` is seen, not inherited. */
  readonly declared: { readonly light: ReadonlySet<string>; readonly dark: ReadonlySet<string> }
  /** Where each tracked token is declared. */
  readonly placements: readonly TokenPlacement[]
  /** Every tracked declaration marked `!important`, which would win out of source order. */
  readonly importantDecls: readonly string[]
}

type Ancestor = { readonly type: string; readonly name?: string; readonly params?: string; readonly selectors?: string[]; readonly parent?: Ancestor }

/** Compiles `src/index.css` with `probes` as the candidates, and replays both themes' custom properties. */
export async function readThemeTokens({ probes, tracked }: { readonly probes: readonly string[]; readonly tracked: (name: string) => boolean }): Promise<ThemeTokens> {
  const compiler = await compile(readFileSync(resolve(SRC, 'index.css'), 'utf8'), { base: SRC, onDependency: () => {} })
  const emitted = compiler.build([...probes])
  const light = new Map<string, string>()
  const dark = new Map<string, string>()
  const declared = { light: new Set<string>(), dark: new Set<string>() }
  const placements: TokenPlacement[] = []
  const importantDecls: string[] = []
  postcss.parse(emitted).walkDecls(/^--/, (decl) => {
    // Every ancestor from the declaration up, so an at-rule nested inside `.dark { … }` counts as a condition too.
    const ancestors: Ancestor[] = []
    for (let node = decl.parent as Ancestor | undefined; node && node.type !== 'root'; node = node.parent) ancestors.push(node)
    const rule = ancestors.find((n) => n.type === 'rule')
    const selectors = rule?.selectors ?? []
    const isRoot = selectors.includes(':root')
    const isDark = selectors.includes('.dark')
    const name = decl.prop.slice(2)
    if (tracked(name)) {
      if (decl.important) importantDecls.push(`${selectors.join(', ')} { ${decl.prop}: ${decl.value} !important }`)
      placements.push({
        name,
        selectors,
        layer: ancestors
          .filter((n) => n.type === 'atrule' && n.name === 'layer')
          .map((n) => n.params)
          .join(' '),
        conditions: ancestors.filter((n) => n.type === 'atrule' && n.name !== 'layer').map((n) => `@${n.name} ${n.params}`),
      })
      if (isRoot) declared.light.add(name)
      if (isDark) declared.dark.add(name)
    }
    if (isRoot) light.set(name, decl.value.trim())
    if (isRoot || isDark) dark.set(name, decl.value.trim())
  })
  return { emitted, light, dark, declared, placements, importantDecls }
}

/** The selectors a tracked token may be declared under for the replay to hold. */
export const THEME_SELECTORS: readonly (readonly string[])[] = [[':root'], ['html', ':root'], ['.dark']]

/** sRGB channels in 0–1. */
export type Rgb = readonly [number, number, number]

/** An `H S% L%` triple as numbers, checked to be in range. */
export function parseHslTriple(value: string | undefined, name: string): readonly [number, number, number] {
  const match = value?.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/)
  if (!match) throw new Error(`${name} is not an "H S% L%" triple: ${value}`)
  const [h, s, l] = match.slice(1).map(Number)
  if (h >= 360 || s > 100 || l > 100) throw new Error(`${name} is out of range: ${value}`)
  return [h, s, l]
}

/** An `H S% L%` triple as sRGB. */
export function rgbFromHslTriple(value: string | undefined, name: string): Rgb {
  const [h, s, l] = parseHslTriple(value, name)
  const sat = s / 100
  const lightness = l / 100
  const channel = (n: number) => {
    const k = (n + h / 30) % 12
    return lightness - sat * Math.min(lightness, 1 - lightness) * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return [channel(0), channel(8), channel(4)]
}

/** A `#rrggbb` colour as sRGB. */
export function rgbFromHex(value: string | undefined, name: string): Rgb {
  const match = value?.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/)
  if (!match) throw new Error(`${name} is not a lower-case #rrggbb colour: ${value}`)
  return [parseInt(match[1], 16) / 255, parseInt(match[2], 16) / 255, parseInt(match[3], 16) / 255]
}

/** WCAG 2.2 relative luminance. */
function luminance([r, g, b]: Rgb): number {
  const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

/** WCAG 2.2 contrast ratio. */
export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
