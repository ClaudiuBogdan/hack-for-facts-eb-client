import type { PrototypeDefinition } from '@/development/harness/entry'
import {
  FIELD_RECT_COUNT,
  LandingRefsIntroOnly,
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
 * after load; they differ only in whether hovering the hero fires a ripple from
 * the pointer. Everything obeys the same constraints — `opacity` and
 * `transform` only, one-shot so nothing loops or stays resident, no
 * `will-change` across ~990 elements, delays precomputed rather than derived
 * per frame, and reduced motion honoured before a listener is even attached.
 * The reasoning is in `home-refs.field-animation.tsx` and
 * `home-refs.field-ripple.ts`.
 */
export const prototype = {
  title: 'Landing page rewrite',
  spec: 'docs/user-stories/landing-page.md',
  variants: {
    ripple: {
      title: 'Intro wave, then ripple on hover',
      component: LandingRefsRipple,
      note: `Wave travels inward once, ${FIELD_RECT_COUNT} cells per side. Hovering the hero sends a ripple out from the pointer, rate-limited to one per 900ms and gated on pointer travel.`,
    },
    intro: {
      title: 'Intro wave only',
      component: LandingRefsIntroOnly,
      note: 'The same wave on load with no hover behaviour at all — the quieter option, and the baseline for judging whether the ripple earns its JavaScript.',
    },
  },
  compare: ['ripple', 'intro'],
} satisfies PrototypeDefinition
