import type { PrototypeDefinition } from '@/development/harness/entry'
import { FIELD_RECT_COUNT } from './home-refs.pixel-art'
import {
  LandingRefsIntroOnly,
  LandingRefsLights,
  LandingRefsRipple,
} from './home-refs.refined'

/**
 * Landing page — the chosen direction.
 *
 * Round one (`landing/home`) settled the information architecture: a grouped
 * table of contents over every surface. Round two settled the skin and the
 * background: the references' structure on this app's own light system, with
 * the margin lattice pixelating into a camouflage field and dispersing into a
 * particle tail toward the centre.
 *
 * What is left open is motion. Both variants play the same intro wave shortly
 * after load; they differ only in whether clicking the hero fires a ripple from
 * that point. Hover triggers nothing — a click is rare enough that each cell
 * can be given its own delay *and* amplitude in one pass, which is what makes
 * the crest read as a travelling disturbance rather than a flash. Everything
 * obeys the same constraints — `opacity` and `transform` only, one-shot so
 * nothing loops or stays resident, no `will-change` across ~990 elements, and
 * reduced motion honoured before a listener is even attached.
 * The reasoning is in `home-refs.field-animation.tsx` and
 * `home-refs.field-motion.ts`.
 */
export const prototype = {
  title: 'Landing page rewrite',
  spec: 'docs/user-stories/landing-page.md',
  variants: {
    ripple: {
      title: 'Intro wave, then ripple on click',
      component: LandingRefsRipple,
      note: `Wave travels inward once on load, ${FIELD_RECT_COUNT} cells per side. Clicking anywhere in the hero sends a ripple out from that point, across both fields, weakening with distance.`,
    },
    lights: {
      title: 'Scroll light on the frame rules',
      component: LandingRefsLights,
      note: 'Dark theme only — additive light on a near-white page is a smudge, not a glow. A head rides each frame rule as a playhead, its trail lengthening with scroll speed and flaring as it crosses a band boundary. Everything else matches the ripple variant.',
    },
    intro: {
      title: 'Intro wave only',
      component: LandingRefsIntroOnly,
      note: 'The same wave on load with no click behaviour at all — the quieter option, and the baseline for judging whether the ripple earns its JavaScript.',
    },
  },
  compare: ['ripple', 'intro'],
} satisfies PrototypeDefinition
