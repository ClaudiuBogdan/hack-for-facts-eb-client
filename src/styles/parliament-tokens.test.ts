import { beforeAll, describe, expect, it } from 'vitest'
import { contrast, readThemeTokens, rgbFromHex, THEME_SELECTORS, type Rgb, type ThemeTokens } from './theme-token-cascade'

/**
 * Parliament's GOV.UK-style skin, and the PNRR-derived frame its hub sections wear, as named tokens
 * (docs/design/parliament-skin-tokens.md). Light values are today's, exactly, so light mode does not move. Each dark
 * value is what dark mode showed where it read, and a readable one where it did not.
 */

/** Slot → [light, dark]. */
const SLOTS = {
  fg: ['#0b0c0c', '#f7f7f2'],
  muted: ['#505a5f', '#a8aaa3'],
  border: ['#b1b4b6', '#e7e7dc'],
  'border-strong': ['#1f1f1f', '#e7e7dc'],
  card: ['#ffffff', '#1b1f1c'],
  surface: ['#f3f2f1', '#30362f'],
  hover: ['#f8f8f8', '#262b27'],
  page: ['#fafaf8', '#111412'],
  'frame-fg': ['#1f1f1f', '#f7f7f2'],
  'frame-muted': ['#6f6f6f', '#a8aaa3'],
  'frame-subtle': ['#e7e7e3', '#30362f'],
  'frame-hover': ['#f0f0ec', '#262b27'],
  link: ['#1d70b8', '#94c1ea'],
  'link-hover': ['#003078', '#b3d3f2'],
  action: ['#1d70b8', '#1d70b8'],
  ink: ['#0b0c0c', '#0b0c0c'],
  icon: ['#372554', '#372554'],
  'commons-fill': ['#006435', '#006435'],
  'senate-fill': ['#9c051a', '#9c051a'],
  'resource-fill': ['#512178', '#512178'],
  resource: ['#512178', '#c4a7e7'],
  commons: ['#006435', '#58b083'],
  senate: ['#9c051a', '#ef8a9a'],
  success: ['#00703c', '#85c99b'],
  error: ['#d4351c', '#f4a196'],
  focus: ['#3b82f6', '#60a5fa'],
  accent: ['#b6ff00', '#b6ff00'],
  'ramp-1': ['#d2e2f1', '#4d7299'],
  'ramp-2': ['#a3c6e3', '#6290c0'],
  'ramp-3': ['#5e94c9', '#86b3e0'],
  'ramp-4': ['#1d70b8', '#c0dcf7'],
  'initials-1': ['#f3f2f1', '#30362f'],
  'initials-2': ['#ede7f6', '#33293f'],
  'initials-3': ['#e8f5e9', '#22352a'],
  'initials-4': ['#fff3e0', '#3d3122'],
  'accent-fg': ['#1f1f1f', '#1f1f1f'],
  'resource-heading': ['#372554', '#f7f7f2'],
  'bill-heading': ['#121847', '#f7f7f2'],
  conflict: ['#912b88', '#d8a3d0'],
  notice: ['#fdf3e3', '#30362f'],
  'notice-fg': ['#6b4a08', '#f7f7f2'],
  'notice-edge': ['#b58840', '#e7e7dc'],
  highlight: ['#ffdd00', '#ffdd00'],
  inactive: ['#c5c7c9', '#8f958f'],
  'ramp-0': ['#f3f2f1', '#2a302a'],
  'ramp-edge': ['#e5e5e0', '#e7e7dc'],
  'accent-focus': ['#3b82f6', '#1d4ed8'],
  abstain: ['#f47738', '#f8a26c'],
  faint: ['#b1b4b6', '#a8aaa3'],
} as const satisfies Record<string, readonly [string, string]>
type Slot = keyof typeof SLOTS

/** Text colours, and the surfaces text sits on. */
const TEXT: readonly Slot[] = ['fg', 'muted', 'link', 'link-hover', 'resource', 'resource-heading', 'bill-heading', 'commons', 'senate', 'success', 'error', 'conflict', 'abstain', 'faint', 'frame-fg', 'frame-muted']
const SURFACES: readonly Slot[] = ['page', 'card', 'hover', 'surface']
/** Dark mode is new work, so it is held to AA on the frame's surfaces too. Light mode is today's, measured on the page's. */
const DARK_SURFACES: readonly Slot[] = [...SURFACES, 'frame-subtle', 'frame-hover']
/** Fills that carry white text, and so keep one colour in both themes. */
const WHITE_TEXT_FILLS: readonly Slot[] = ['action', 'ink', 'icon', 'commons-fill', 'senate-fill', 'resource-fill']
/** Text that only ever sits on one fill: [text, fill]. */
const OWN_FILL_PAIRS: readonly (readonly [Slot, Slot])[] = [
  ['accent-fg', 'accent'], // the lime filter chip
  ['highlight', 'ink'], // the heat map's dark tooltip
  ['notice-fg', 'notice'], // the stenogram notice
]
/** Light pairs that fail AA today; pinned, so a change to either side is noticed, not hidden. */
const KNOWN_LIGHT_FAILURES = new Map<string, number>([
  ['error on surface', 4.34],
  // The frame's captions sit on the frame's own surfaces; on the GOV.UK grey band they miss by a hair.
  ['frame-muted on surface', 4.49],
  // The vote table's abstention figures and its faint zero counts: light, as drawn today.
  ...(['page', 'card', 'hover', 'surface'] as const).flatMap((surface) => [
    [`abstain on ${surface}`, { page: 2.66, card: 2.78, hover: 2.62, surface: 2.49 }[surface]] as const,
    [`faint on ${surface}`, { page: 1.99, card: 2.08, hover: 1.96, surface: 1.86 }[surface]] as const,
  ]),
])

/** `ramp-1` is `parliament.ramp.1` in the config, so `bg-parliament-ramp-1`; `frame-fg` likewise. */
const PROBES = [...Object.keys(SLOTS).flatMap((slot) => [`text-parliament-${slot}`, `bg-parliament-${slot}`]), 'bg-parliament-link/5', 'border-parliament-border', 'ring-parliament-focus']

let tokens: ThemeTokens

beforeAll(async () => {
  tokens = await readThemeTokens({ probes: PROBES, tracked: (name) => name.startsWith('parliament-') })
}, 30_000)

const value = (theme: 'light' | 'dark', slot: Slot) => rgbFromHex(tokens[theme].get(`parliament-${slot}`), `parliament-${slot} (${theme})`)
const WHITE = rgbFromHex('#ffffff', 'white')
/** `color` at `alpha` over `under`, as the browser composites a translucent colour. */
const over = (color: Rgb, alpha: number, under: Rgb): Rgb => [0, 1, 2].map((i) => color[i] * alpha + under[i] * (1 - alpha)) as unknown as Rgb

describe('the parliament tokens', () => {
  it('are declared only as plain :root and .dark tokens, in one layer, under no condition, never !important', () => {
    expect(tokens.placements.length).toBeGreaterThan(0)
    for (const { name, selectors, layer, conditions } of tokens.placements) {
      expect(THEME_SELECTORS, `${name} selectors`).toContainEqual([...selectors])
      expect(conditions, `${name} conditions`).toEqual([])
      expect(layer, `${name} layer`).toBe(tokens.placements[0].layer)
    }
    expect(tokens.importantDecls).toEqual([])
  })

  it('hold exactly the designed light and dark values, each declared in both themes, and no slot the design does not name', () => {
    for (const [slot, [light, dark]] of Object.entries(SLOTS)) {
      expect(tokens.light.get(`parliament-${slot}`), `${slot} light`).toBe(light)
      expect(tokens.dark.get(`parliament-${slot}`), `${slot} dark`).toBe(dark)
    }
    // Declared, not inherited: a slot missing from `.dark` would otherwise pass wherever its two values are equal.
    const slots = (names: ReadonlySet<string>) => [...names].map((name) => name.slice('parliament-'.length)).sort()
    expect(slots(tokens.declared.light)).toEqual(Object.keys(SLOTS).sort())
    expect(slots(tokens.declared.dark)).toEqual(Object.keys(SLOTS).sort())
  })

  it('read at AA in dark mode: every text colour on every surface', () => {
    for (const text of TEXT) {
      for (const surface of DARK_SURFACES) {
        expect(contrast(value('dark', text), value('dark', surface)), `${text} on ${surface} (dark)`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('keep the link’s faded hover (link/80) at AA in dark mode on every surface', () => {
    // Light mode's `/80` hover is today's and misses (3.3–3.6:1); dark mode is new work.
    for (const surface of DARK_SURFACES) {
      const under = value('dark', surface)
      expect(contrast(over(value('dark', 'link'), 0.8, under), under), `link/80 on ${surface} (dark)`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keep text at AA on the fills that carry it, in both themes', () => {
    for (const theme of ['light', 'dark'] as const) {
      for (const fill of WHITE_TEXT_FILLS) {
        expect(contrast(WHITE, value(theme, fill)), `white on ${fill} (${theme})`).toBeGreaterThanOrEqual(4.5)
      }
      for (const [text, fill] of OWN_FILL_PAIRS) {
        expect(contrast(value(theme, text), value(theme, fill)), `${text} on ${fill} (${theme})`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('read at AA in light mode too, except the pinned pairs that fail today', () => {
    for (const text of TEXT) {
      for (const surface of SURFACES) {
        const pair = `${text} on ${surface}`
        const ratio = contrast(value('light', text), value('light', surface))
        const known = KNOWN_LIGHT_FAILURES.get(pair)
        if (known === undefined) expect(ratio, `${pair} (light)`).toBeGreaterThanOrEqual(4.5)
        else expect(ratio, `${pair} (light), a known failure`).toBeCloseTo(known, 2)
      }
    }
  })

  it('draw the dark heat map as a readable ramp: steps rise from the empty cell, and a counted cell stands at 3:1 without an edge', () => {
    const card = value('dark', 'card')
    const steps = (['ramp-0', 'ramp-1', 'ramp-2', 'ramp-3', 'ramp-4'] as const).map((slot) => contrast(value('dark', slot), card))
    for (let i = 1; i < steps.length; i++) expect(steps[i], `ramp-${i} stands further from the card than ramp-${i - 1}`).toBeGreaterThan(steps[i - 1])
    for (let i = 1; i <= 4; i++) {
      // Counted cells are links and buttons with no border of their own: the fill is their boundary.
      expect(steps[i], `ramp-${i} on the card (dark)`).toBeGreaterThanOrEqual(3)
      expect(contrast(value('dark', `ramp-${i}` as Slot), value('dark', 'ramp-0')), `ramp-${i} vs the empty cell`).toBeGreaterThanOrEqual(1.5)
    }
    // Empty cells carry an edge instead.
    expect(contrast(value('dark', 'ramp-edge'), card), 'cell edge on the card (dark)').toBeGreaterThanOrEqual(3)
  })

  it('mark a vacant seat at 3:1 as drawn, at the hemicycle’s 70% opacity (dark)', () => {
    const card = value('dark', 'card')
    expect(contrast(over(value('dark', 'inactive'), 0.7, card), card)).toBeGreaterThanOrEqual(3)
  })

  it('keep the lime chip’s focus ring at 3:1 on the chip, in both themes', () => {
    for (const theme of ['light', 'dark'] as const) {
      expect(contrast(value(theme, 'accent-focus'), value(theme, 'accent')), `accent-focus on accent (${theme})`).toBeGreaterThanOrEqual(3)
    }
  })

  it('are Tailwind colours: each class emits its variable, and an opacity step mixes it', () => {
    const emits = (cls: string, property: string, slot: string) =>
      expect(tokens.emitted, cls).toMatch(new RegExp(`\\.${cls.replace(/-/g, '\\-')}\\s*\\{\\s*${property}:\\s*var\\(--parliament-${slot.replace(/-/g, '\\-')}\\)`))
    for (const slot of Object.keys(SLOTS)) {
      emits(`text-parliament-${slot}`, 'color', slot)
      emits(`bg-parliament-${slot}`, 'background-color', slot)
    }
    emits('border-parliament-border', 'border-color', 'border')
    expect(tokens.emitted).toMatch(/\.ring-parliament-focus\s*\{[^}]*--tw-ring-color:\s*var\(--parliament-focus\)/)
    expect(tokens.emitted).toMatch(/\.bg-parliament-link\\\/5\s*\{[^}]*color-mix\(in oklab, var\(--parliament-link\) 5%, transparent\)/)
  })
})
