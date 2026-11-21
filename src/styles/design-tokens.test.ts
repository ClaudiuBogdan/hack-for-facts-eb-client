import { beforeAll, describe, expect, it } from 'vitest'
import { contrast, parseHslTriple, readThemeTokens, rgbFromHslTriple, THEME_SELECTORS, type ThemeTokens } from './theme-token-cascade'

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

const PROBES = [...STATES.flatMap((state) => [`bg-status-${state}-bg`, `text-status-${state}-fg`, `bg-status-${state}-fg`]), 'bg-status-live-fg/20']

let tokens: ThemeTokens
let emitted = ''
let light: ReadonlyMap<string, string> = new Map()
let dark: ReadonlyMap<string, string> = new Map()

beforeAll(async () => {
  // The status pairs and the surfaces they are measured on.
  tokens = await readThemeTokens({ probes: PROBES, tracked: (name) => name.startsWith('status-') || name === 'card' || name === 'background' })
  ;({ emitted, light, dark } = tokens)
}, 30_000)

describe('the status tokens', () => {
  it('are declared only as plain :root and .dark tokens, in one layer, under no condition', () => {
    // The theme computation above holds only for this shape; anything else must be looked at by hand.
    const placements = tokens.placements.filter(({ name }) => name.startsWith('status-'))
    expect(placements.length).toBeGreaterThan(0)
    for (const { name, selectors, layer, conditions } of placements) {
      expect(THEME_SELECTORS, `${name} selectors`).toContainEqual([...selectors])
      expect(conditions, `${name} conditions`).toEqual([])
      expect(layer, `${name} layer`).toBe(placements[0].layer)
    }
  })

  it('and the surfaces they are measured on, are never declared !important', () => {
    // The values below are replayed in source order; an important declaration would win out of order and
    // make the measured value not the one the browser uses.
    expect(tokens.importantDecls).toEqual([])
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
        expect(parseHslTriple(dark.get(name), name)[0], `${name} hue`).toBe(parseHslTriple(light.get(name), name)[0])
      }
    }
  })

  it.each([
    ['light', () => light],
    ['dark', () => dark],
  ] as const)('read at AA on their container and on the page’s surfaces (%s)', (theme, values) => {
    for (const state of STATES) {
      const fg = rgbFromHslTriple(values().get(`status-${state}-fg`), `status-${state}-fg`)
      for (const surface of [`status-${state}-bg`, 'card', 'background']) {
        const ratio = contrast(fg, rgbFromHslTriple(values().get(surface), surface))
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
