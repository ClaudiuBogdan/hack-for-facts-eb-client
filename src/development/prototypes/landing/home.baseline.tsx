import { Link } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import mapPreview from '@/assets/images/map.png'
import chartPreview from '@/assets/images/chart.png'
import entityAnalyticsPreview from '@/assets/images/entity-analytics.png'
import morePreview from '@/assets/images/more-to-come.png'
import { FeaturedBand, LandingSearch, PROTOTYPE_MARKER } from './home.shared'

/**
 * Baseline — the shipped page's structure, re-skinned onto the system.
 *
 * It exists to isolate the question: is today's landing page wrong because of
 * how it looks, or because of what it offers? Nothing here is new. The hero is
 * still a wordmark, the search is still the primary act, and the same four
 * cards still stand for the whole platform. What changed is only what
 * `DESIGN.md` forbids outright — the gradient-clipped title with its magenta
 * drop-shadow glow, the `rounded-2xl` cards, `shadow-lg`/`hover:scale`, the
 * gradient image overlay, and the hardcoded `slate-*` ramp that made dark mode
 * a second set of overrides.
 *
 * If this reads as sufficient, the problem was the skin. If it still reads as a
 * four-room house with twenty rooms behind it, the problem is the architecture.
 */

type PreviewCard = {
  readonly title: string
  readonly description: string
  readonly to: LinkProps['to']
  readonly image: string
}

const CARDS: readonly PreviewCard[] = [
  {
    title: 'Hartă',
    description: 'Explorează datele pe hartă.',
    to: '/map',
    image: mapPreview,
  },
  {
    title: 'Buget național',
    description: 'Explorează bugetul de stat.',
    to: '/budget-explorer',
    image: morePreview,
  },
  {
    title: 'Analiza entităților',
    description: 'Explorează instituțiile după valori agregate.',
    to: '/entity-analytics',
    image: entityAnalyticsPreview,
  },
  {
    title: 'Grafice',
    description: 'Explorează datele prin grafice.',
    to: '/charts',
    image: chartPreview,
  },
]

/** The shipped `PageCard`, flattened: border and fill instead of shadow and gradient. */
function FlatPageCard({ card }: { readonly card: PreviewCard }) {
  return (
    <Link
      to={card.to}
      preload="intent"
      className="group relative block h-full w-full overflow-hidden rounded-lg border bg-card transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
    >
      <img
        src={card.image}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="pointer-events-none absolute right-0 top-1/2 h-full w-auto max-w-none -translate-y-1/2 translate-x-1/6 object-cover opacity-15 transition-opacity duration-300 group-hover:opacity-30"
      />
      <div className="relative flex h-full flex-col justify-center p-6 text-left md:w-3/5">
        <h3 className="text-base font-semibold text-card-foreground group-hover:underline">
          {card.title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
      </div>
    </Link>
  )
}

export function LandingBaseline() {
  return (
    <div className="w-full px-4 py-10" data-dev-marker={PROTOTYPE_MARKER}>
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center space-y-10 text-center">
        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Transparenta.eu
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            <code className="mr-2">[trans.paˈren.t͡sə]</code>
            <span>Străveziu, limpede</span>
          </p>
        </div>

        <LandingSearch className="max-w-3xl" />

        <FeaturedBand />

        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
          {CARDS.map((card) => (
            <FlatPageCard key={card.title} card={card} />
          ))}
        </div>
      </div>
    </div>
  )
}
