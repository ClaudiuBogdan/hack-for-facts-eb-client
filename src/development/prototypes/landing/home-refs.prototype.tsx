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
    joined: {
      title: 'Joined search',
      component: LandingRefsJoined,
      // The key is `joined` rather than `landing-joined` because the harness
      // prints the `?v=` above the page: `?v=landing-joined` wraps to two lines
      // where `?v=landing` does not, which pushed the field 16px down and left
      // the two variants being compared at different scroll positions. That was
      // enough, once, to change which side the panel landed on.
      note: 'Field and results as one grey surface: no gap, no seam line under the field, and the divider below the header is the single line between the query and the answers. The shadow carries the elevation, the focus ring steps aside while the panel is open, and the join follows the panel if it flips above the field.',
    },
  },
} satisfies PrototypeDefinition
