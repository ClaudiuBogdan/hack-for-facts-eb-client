import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { compile } from '@tailwindcss/node'
import postcss from 'postcss'
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * The status tokens are DESIGN.md's data-trust palette: each state pairs a tinted
 * container (`-bg`) with a dark label (`-fg`) that must read at AA on it, and on
 * the page's own surfaces, in both themes.
 *
 * Measured from what Tailwind actually emits for `src/index.css` through the
 * repository's `@config`, parsed as CSS: the light theme is every `:root` rule in
 * order, and the dark theme is the light one with every `.dark` rule over it, as
 * the cascade resolves them on `<html class="dark">`. So a dark token deleted,
 * overridden later, or never exposed as a Tailwind colour fails here.
 */

const STATES = ['live', 'mock', 'partial', 'blocked'] as const
type State = (typeof STATES)[number]

/** DESIGN.md's light values, exactly. */
const DESIGN_LIGHT: Record<State, { readonly bg: string; readonly fg: string }> = {
  live: { bg: '142 60% 94%', fg: '142 70% 25%' },
  mock: { bg: '0 0% 95%', fg: '0 0% 25%' },
  partial: { bg: '35 90% 93%', fg: '28 90% 28%' },
  blocked: { bg: '0 80% 96%', fg: '0 72% 38%' },
}

const SRC = resolve(__dirname, '..')
const PROBES = [...STATES.flatMap((state) => [`bg-status-${state}-bg`, `text-status-${state}-fg`, `bg-status-${state}-fg`]), 'bg-status-live-fg/20']

let emitted = ''
let light: ReadonlyMap<string, string> = new Map()
let dark: ReadonlyMap<string, string> = new Map()

/** Every declaration of a measured token (the status pairs and the surfaces they sit on) marked `!important`. */
const importantDecls: string[] = []
const MEASURED = (name: string) => name.startsWith('status-') || name === 'card' || name === 'background'

/** Where each status variable is declared: the rule's selectors, its layer, and any condition around it. */
const placements: { readonly name: string; readonly selectors: readonly string[]; readonly layer: string; readonly conditions: readonly string[] }[] = []

beforeAll(async () => {
  const compiler = await compile(readFileSync(resolve(SRC, 'index.css'), 'utf8'), { base: SRC, onDependency: () => {} })
  emitted = compiler.build(PROBES)
  // `:root` and `.dark` both match `<html class="dark">` with equal specificity, so in dark mode
  // the later declaration wins, whichever of the two rules it is in: replay both in source order.
  const lightTokens = new Map<string, string>()
  const darkTokens = new Map<string, string>()
  postcss.parse(emitted).walkRules((rule) => {
    const isRoot = rule.selectors.includes(':root')
    const isDark = rule.selectors.includes('.dark')
    rule.walkDecls(/^--/, (decl) => {
      const name = decl.prop.slice(2)
      // `!important` outranks source order, which the replay below assumes decides every value.
      if (decl.important && MEASURED(name)) importantDecls.push(`${rule.selectors.join(', ')} { ${decl.prop}: ${decl.value} !important }`)
      if (name.startsWith('status-')) {
        const ancestors: { readonly type: string; readonly name?: string; readonly params?: string }[] = []
        for (let node = rule.parent; node && node.type !== 'root'; node = node.parent) ancestors.push(node as never)
        placements.push({
          name,
          selectors: rule.selectors,
          layer: ancestors
            .filter((n) => n.type === 'atrule' && n.name === 'layer')
            .map((n) => n.params)
            .join(' '),
          conditions: ancestors.filter((n) => n.type === 'atrule' && n.name !== 'layer').map((n) => `@${n.name} ${n.params}`),
        })
      }
      if (isRoot) lightTokens.set(name, decl.value.trim())
      if (isRoot || isDark) darkTokens.set(name, decl.value.trim())
    })
  })
  light = lightTokens
  dark = darkTokens
}, 30_000)

/** An `H S% L%` triple, checked to be in range before anything is computed from it. */
function hsl(value: string | undefined, name: string): readonly [number, number, number] {
  const match = value?.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/)
  if (!match) throw new Error(`${name} is not an "H S% L%" triple: ${value}`)
  const [h, s, l] = match.slice(1).map(Number)
  if (h >= 360 || s > 100 || l > 100) throw new Error(`${name} is out of range: ${value}`)
  return [h, s, l]
}

/** WCAG 2.2 relative luminance. */
function luminance([h, s, l]: readonly [number, number, number]): number {
  const sat = s / 100
  const light = l / 100
  const channel = (n: number) => {
    const k = (n + h / 30) % 12
    return light - sat * Math.min(light, 1 - light) * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear(channel(0)) + 0.7152 * linear(channel(8)) + 0.0722 * linear(channel(4))
}

function contrast(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('the status tokens', () => {
  it('are declared only as plain :root and .dark tokens, in one layer, under no condition', () => {
    // The theme computation above holds only for this shape; anything else must be looked at by hand.
    expect(placements.length).toBeGreaterThan(0)
    for (const { name, selectors, layer, conditions } of placements) {
      expect([[':root'], ['html', ':root'], ['.dark']], `${name} selectors`).toContainEqual([...selectors])
      expect(conditions, `${name} conditions`).toEqual([])
      expect(layer, `${name} layer`).toBe(placements[0].layer)
    }
  })

  it('and the surfaces they are measured on, are never declared !important', () => {
    // The values below are replayed in source order; an important declaration would win out of order and
    // make the measured value not the one the browser uses.
    expect(importantDecls).toEqual([])
  })

  it('use DESIGN.md’s light values', () => {
    for (const state of STATES) {
      expect(light.get(`status-${state}-bg`), state).toBe(DESIGN_LIGHT[state].bg)
      expect(light.get(`status-${state}-fg`), state).toBe(DESIGN_LIGHT[state].fg)
    }
  })

  it('keep each hue in dark mode, at their own lightness', () => {
    for (const state of STATES) {
      for (const part of ['bg', 'fg'] as const) {
        const name = `status-${state}-${part}`
        expect(dark.get(name), `${name} is declared for .dark`).not.toBe(light.get(name))
        expect(hsl(dark.get(name), name)[0], `${name} hue`).toBe(hsl(light.get(name), name)[0])
      }
    }
  })

  it.each([
    ['light', () => light],
    ['dark', () => dark],
  ] as const)('read at AA on their container and on the page’s surfaces (%s)', (theme, tokens) => {
    for (const state of STATES) {
      const fg = hsl(tokens().get(`status-${state}-fg`), `status-${state}-fg`)
      for (const surface of [`status-${state}-bg`, 'card', 'background']) {
        const ratio = contrast(fg, hsl(tokens().get(surface), surface))
        expect(ratio, `status-${state}-fg on ${surface} (${theme})`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('are Tailwind colours: each class emits its variable, and an opacity step mixes it', () => {
    for (const state of STATES) {
      expect(emitted).toMatch(new RegExp(`\\.bg-status-${state}-bg\\s*\\{\\s*background-color:\\s*hsl\\(var\\(--status-${state}-bg\\)\\)`))
      expect(emitted).toMatch(new RegExp(`\\.text-status-${state}-fg\\s*\\{\\s*color:\\s*hsl\\(var\\(--status-${state}-fg\\)\\)`))
      // A solid status mark fills with the label colour.
      expect(emitted).toMatch(new RegExp(`\\.bg-status-${state}-fg\\s*\\{\\s*background-color:\\s*hsl\\(var\\(--status-${state}-fg\\)\\)`))
    }
    expect(emitted).toMatch(/\.bg-status-live-fg\\\/20\s*\{[^}]*color-mix\(in oklab, hsl\(var\(--status-live-fg\)\) 20%, transparent\)/)
  })
})
