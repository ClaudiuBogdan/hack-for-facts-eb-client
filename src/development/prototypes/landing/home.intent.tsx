import { Link } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import { Briefcase, Building2, Gavel, Landmark, Scale } from 'lucide-react'
import { DomainIndex, FeaturedBand, LandingSearch, PROTOTYPE_MARKER } from './home.shared'
import { visibleGroups } from './home.data'

/**
 * Intent — the hero asks what the reader is looking for, and each answer is a
 * jump into that domain's own search, not into its landing page.
 *
 * This is a real navigational difference from `index`, not a relabelling: four
 * of the five intents route to a search surface that already exists
 * (`/procurement/search`, `/companies/search`, `/legislation/search`,
 * `/justitie/cautare`). The fifth, "bugetul localității mele", has no search of
 * its own and goes to `/map`. The reader spends one click instead of two, and
 * lands somewhere that takes a query.
 *
 * The honest caveat: this shape wants a single cross-domain input, and one
 * already exists — `EntitySearchPage` at `/experimental/search`, which searches
 * firme, instituții, legi, contracte, licitații and PNRR together. It is live
 * but parked behind an experimental prefix and under active work. If that lands
 * as the primary search, this row of scopes collapses into one input with a
 * scope selector, and the variant gets stronger rather than obsolete.
 */

type Intent = {
  readonly label: string
  readonly to: LinkProps['to']
  readonly icon: typeof Landmark
}

const INTENTS: readonly Intent[] = [
  { label: 'Un contract public', to: '/procurement/search', icon: Landmark },
  { label: 'O firmă', to: '/companies/search', icon: Briefcase },
  { label: 'O lege', to: '/legislation/search', icon: Scale },
  { label: 'Un dosar în instanță', to: '/justitie/cautare', icon: Gavel },
  { label: 'Bugetul localității mele', to: '/map', icon: Building2 },
]

function IntentChip({ intent }: { readonly intent: Intent }) {
  const Icon = intent.icon

  return (
    <Link
      to={intent.to}
      preload="intent"
      className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-card-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      {intent.label}
    </Link>
  )
}

export function LandingIntent() {
  const groups = visibleGroups()

  return (
    <div className="w-full px-4 py-10" data-dev-marker={PROTOTYPE_MARKER}>
      <div className="mx-auto flex w-full max-w-5xl flex-col space-y-10">
        <div className="flex flex-col items-center space-y-3 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Ce vrei să afli?
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Caută o instituție publică după nume sau CUI — sau începe de la ce
            urmărești.
          </p>
        </div>

        <LandingSearch className="mx-auto max-w-3xl" />

        <div className="flex flex-wrap justify-center gap-2">
          {INTENTS.map((intent) => (
            <IntentChip key={intent.label} intent={intent} />
          ))}
        </div>

        <FeaturedBand />

        <DomainIndex groups={groups} />
      </div>
    </div>
  )
}
