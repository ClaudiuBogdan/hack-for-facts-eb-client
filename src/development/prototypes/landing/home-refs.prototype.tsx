import type { PrototypeDefinition } from '@/development/harness/entry'
import { FIELD_RECT_COUNT } from './home-refs.pixel-art'
import { LandingRefs, LandingRefsJoined } from './home-refs.refined'

/**
 * Landing page rewrite — one question still open.
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
 *
 * Round five is the only thing still open, and it is not about the library: does
 * the results panel float over the page or attach to the field? Both variants
 * below share every row, state and key binding, so the comparison is about the
 * attachment and nothing else.
 */
export const prototype = {
  title: 'Landing page rewrite',
  spec: 'docs/user-stories/landing-page.md',
  variants: {
    landing: {
      title: 'Landing page',
      component: LandingRefs,
      note: `Results float below the field, 8px clear of it, rising 4px as they fade in. Base UI search with a diacritic-folded match highlight, two-stage Escape, and results that are real links. Intro wave across ${FIELD_RECT_COUNT} cells per side, a ripple on a hero click, and a scroll light closing on the centre of the bottom border.`,
    },
    'landing-joined': {
      title: 'Landing page — joined search',
      component: LandingRefsJoined,
      // Kept to roughly the length of the note above on purpose: the harness
      // prints it over the page, so a note one line longer pushes the field
      // down and the two variants stop being compared at the same scroll
      // position. That difference was enough to change where the panel landed.
      note: 'Field and results as one surface: no gap, the field squares its bottom corners while open, the panel takes no top border, and the seam is the field\'s own bottom border. Fades in place rather than rising, and stays below rather than flipping.',
    },
  },
} satisfies PrototypeDefinition
