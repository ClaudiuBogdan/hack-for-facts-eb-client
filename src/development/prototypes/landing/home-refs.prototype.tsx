import type { PrototypeDefinition } from '@/development/harness/entry'
import {
  FIELD_RECT_COUNT,
  LandingRefsScatter,
  LandingRefsSwell,
  LandingRefsWave,
} from './home-refs.refined'

/**
 * Landing page — the chosen direction, with the margin field's hover animation
 * as the open question.
 *
 * Round one (`landing/home`) settled the information architecture: a grouped
 * table of contents over every surface. Round two settled the skin and the
 * background: the references' structure on this app's own light system, with
 * the margin lattice pixelating into a camouflage field and dispersing into a
 * particle tail toward the centre.
 *
 * The three variants here render an identical page and differ only in how the
 * field responds to hovering the hero. All three obey the same constraints:
 * one-shot on hover so holding the pointer does not loop, `opacity` and
 * `transform` only so the work stays on the compositor, `will-change` promoted
 * inside the hover rule so no layer is held on an idle page, and reduced motion
 * honoured. See `home-refs.field-animation.tsx` for why each of those matters.
 */
export const prototype = {
  title: 'Landing page rewrite',
  spec: 'docs/user-stories/landing-page.md',
  variants: {
    wave: {
      title: 'Wave — travels inward, column by column',
      component: LandingRefsWave,
      note: `Each cell brightens, leans inward and swells once; delay ramps with the column so a wave crosses the field. ${FIELD_RECT_COUNT} cells per side.`,
    },
    scatter: {
      title: 'Scatter — every cell on its own clock',
      component: LandingRefsScatter,
      note: 'Same per-cell animation, delay randomised per cell, so the field crackles rather than sweeping.',
    },
    swell: {
      title: 'Swell — all at once',
      component: LandingRefsSwell,
      note: 'No delay: the whole field brightens and swells together. Cheapest and most abrupt of the three.',
    },
  },
  compare: ['wave', 'scatter', 'swell'],
} satisfies PrototypeDefinition
