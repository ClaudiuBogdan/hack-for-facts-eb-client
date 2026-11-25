import type { CSSProperties } from 'react'

/**
 * The charts' categorical colours (owner, 25 November 2026: more colour,
 * still clean): the data-viz reference palette in its validated order —
 * blue, orange, aqua, yellow, magenta, green — each with its dark-mode step,
 * plus the red that is blue's opposite for falls. Every set used here passes
 * the palette validator's adjacent-pair checks in both modes (light: CVD ΔE
 * ≥ 9.1, normal vision ≥ 19.6; dark: 8.4 and 19.3). Three light steps sit
 * under 3:1 on the page, so the charts label their marks.
 *
 * Put `VIZ_PALETTE` on a chart's root; read a colour with `hue(slot)`.
 */
export const VIZ_PALETTE = [
  '[--viz-1:#2a78d6] [--viz-2:#eb6834] [--viz-3:#1baf7a] [--viz-4:#eda100] [--viz-5:#e87ba4] [--viz-6:#008300] [--viz-fall:#e34948]',
  'dark:[--viz-1:#3987e5] dark:[--viz-2:#d95926] dark:[--viz-3:#199e70] dark:[--viz-4:#c98500] dark:[--viz-5:#d55181] dark:[--viz-6:#0ca30c] dark:[--viz-fall:#e66767]',
].join(' ')

/** Slots 1–6 in order; a later slot folds into grey („the rest"). */
export function hue(slot: number): string {
  return slot >= 1 && slot <= 6 ? `var(--viz-${slot})` : 'hsl(var(--muted-foreground) / 0.4)'
}

export const FALL = 'var(--viz-fall)'

/** A hue as a fill, optionally hatched (the borrowed money's texture, a second cue beside the colour). */
export function fillOf(slot: number, hatched = false): CSSProperties {
  const color = hue(slot)
  return hatched
    ? { backgroundImage: `repeating-linear-gradient(135deg, ${color} 0 3px, color-mix(in oklab, ${color} 30%, transparent) 3px 7px)` }
    : { backgroundColor: color }
}
