import type { PrototypeDefinition } from '@/development/harness/entry'
import {
  LandingRefsArmy,
  LandingRefsClouds,
  LandingRefsLogo,
  LandingRefsRefined,
} from './home-refs.refined'

/**
 * Landing page — the chosen direction.
 *
 * Round one (`landing/home`) decided information architecture: a grouped table
 * of contents over every surface, rather than the shipped four cards or an
 * intent-led hero. This prototype carries that IA into a design derived from
 * ui8.ai/forge, vercel.com/ai-sdk and opentrain.ai.
 *
 * Two earlier variants were removed once this one was chosen. `grid` was the
 * same architecture without the polish; `forge` was the research brief taken
 * literally — a near-black canvas with an orange accent — and it did its job by
 * showing the cost: the shell does not change with the page, so the sidebar,
 * footer, search input and campaign card all stayed light around a black body,
 * and `DESIGN.md` quarantines page-level skins to PNRR and Parliament.
 *
 * Worth keeping in mind while iterating, because it constrains what belongs
 * here: of the three references the brief was written from, only Forge is dark.
 * Vercel's AI SDK page and OpenTrain are both light, and OpenTrain draws its
 * lattice on white. What transferred is structure — the lattice, cells sharing
 * borders, asymmetric section headers, display type, monospace numbering — not
 * the skin.
 */
export const prototype = {
  title: 'Landing page rewrite',
  spec: 'docs/user-stories/landing-page.md',
  /**
   * The four variants differ *only* in the margin pixel field, so a comparison
   * isolates the background and nothing else. Everything above it — the grouped
   * index, the lattice, the frame rules, the restyled search, the hero panel —
   * is the same component in every one.
   */
  variants: {
    refined: {
      title: 'Mono — density decays from the edge',
      component: LandingRefsRefined,
      note: 'The plainest reading. Cells fill in on the 24px module and thin out toward the content.',
    },
    logo: {
      title: 'Logo gradient',
      component: LandingRefsLogo,
      note: 'Same field, filled from a gradient sampled off the app mark — cyan through blue and violet to magenta.',
    },
    army: {
      title: 'Army — camouflage patches',
      component: LandingRefsArmy,
      note: 'Smooth noise quantised into four bands so cells clump into connected patches. Monochrome: olive would import a palette the system does not have.',
    },
    clouds: {
      title: 'Clouds — clearing toward the centre',
      component: LandingRefsClouds,
      note: 'The same noise left continuous, so density and opacity thin together and the field clears rather than stopping.',
    },
  },
  compare: ['refined', 'logo', 'army', 'clouds'],
} satisfies PrototypeDefinition
