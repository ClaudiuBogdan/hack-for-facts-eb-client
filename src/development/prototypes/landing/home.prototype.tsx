import type { PrototypeDefinition } from '@/development/harness/entry'
import { gatedEntryTitles } from './home.data'
import { LandingBaseline } from './home.baseline'
import { LandingIndex } from './home.index'
import { LandingIntent } from './home.intent'

/**
 * Landing page rewrite — `src/routes/index.tsx`.
 *
 * The question: the shipped landing offers four surfaces (Hartă, Buget, Entități,
 * Grafice) out of roughly fifteen the app now serves, and its hero breaks three
 * `DESIGN.md` rules outright (gradient-clipped text with a drop-shadow glow,
 * `shadow-lg` cards at `rounded-2xl`, a hardcoded `slate-*` ramp). Two things are
 * wrong at once, so the variants separate them: `baseline` fixes only the skin,
 * `index` and `intent` change what the page offers.
 *
 * Invariant across all three: the entity search box, the quick-access chips, and
 * the promo band — so the comparison is information architecture, nothing else.
 * SEO/head metadata is not prototyped; it stays in the route.
 */

const gated = gatedEntryTitles()

export const prototype = {
  title: 'Landing page rewrite',
  spec: 'docs/user-stories/landing-page.md',
  variants: {
    baseline: {
      title: 'Baseline — same page, on-system',
      component: LandingBaseline,
      note: 'Shipped structure with the gradient, shadows and slate ramp removed. Isolates skin from architecture.',
    },
    index: {
      title: 'Index — search, then a grouped table of contents',
      component: LandingIndex,
      note: 'Every surface listed, grouped by the question it answers, one line each on what it holds.',
    },
    intent: {
      title: 'Intent — start from what you are looking for',
      component: LandingIntent,
      note: 'Hero asks the question; scopes jump straight into each domain’s own search. Index still below.',
    },
  },
  compare: ['baseline', 'index', 'intent'],
} satisfies PrototypeDefinition

/**
 * Gates mirror the shipped ones (`nav-main.tsx`, `ParliamentPromoCard`), so with
 * no mock flags set these tiles are absent from `index` and `intent` — the same
 * way the sidebar hides them today. Currently hidden: {gated}.
 */
export const GATED_ENTRIES = gated
