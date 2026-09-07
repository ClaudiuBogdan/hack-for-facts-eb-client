import type { PrototypeDefinition } from '@/development/harness/entry'
import { FIELD_RECT_COUNT } from './home-refs.pixel-art'
import { LandingRefs } from './home-refs.refined'

/**
 * Landing page rewrite — settled.
 *
 * Round one (`landing/home`) settled the information architecture: a grouped
 * table of contents over every surface. Round two settled the skin, the
 * background and the illustrations. Round three settled the motion — the intro
 * wave, the click ripple and the scroll light turned out to occupy different
 * moments rather than compete, so the page carries all three.
 *
 * Round four settled the hero search. Four implementations were built on this
 * same page and measured against each other — a hand-rolled combobox on Radix
 * Popover, cmdk, downshift, and Base UI `Autocomplete`. Base UI won and the
 * other three are gone; the comparison, the measurements and the reasoning are
 * in `docs/design/landing-search-comparison.md` so the question does not get
 * reopened from scratch.
 */
export const prototype = {
  title: 'Landing page rewrite',
  spec: 'docs/user-stories/landing-page.md',
  variants: {
    landing: {
      title: 'Landing page',
      component: LandingRefs,
      note: `Base UI search with a diacritic-folded match highlight, two-stage Escape, and results that are real links. Intro wave across ${FIELD_RECT_COUNT} cells per side, a ripple on a hero click, and a scroll light closing on the centre of the bottom border.`,
    },
  },
} satisfies PrototypeDefinition
