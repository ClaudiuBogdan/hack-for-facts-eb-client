import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { EntitySearchInput } from '@/components/entities/EntitySearch'
import { QuickEntityAccess } from '@/components/entities/QuickEntityAccess'
import { CampaignLandingShareCard } from '@/features/campaigns/buget/components/CampaignAccessShareCard'
import { ParliamentPromoCard } from '@/features/parliament/components/parliament-promo-card'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import type { LandingEntry, LandingGroup } from './home.data'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
export const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

/**
 * Everything below is shared by all three variants on purpose. The comparison
 * is about information architecture, so the search input, the quick-access
 * chips and the promo band are invariants — only their placement moves.
 */

/** The one act the landing exists for. Unchanged from the shipped page. */
export function LandingSearch({ className }: { readonly className?: string }) {
  const isMobile = useIsMobile()

  return (
    <div className={cn('w-full space-y-6', className)}>
      <EntitySearchInput
        placeholder="Caută o instituție după nume sau CUI..."
        selectionBehavior="navigate-to-preferred-entity"
        autoFocus={!isMobile}
        scrollToTopOnFocus={isMobile}
      />
      <QuickEntityAccess />
    </div>
  )
}

/**
 * The promo slot, given a shape instead of two components dropped inline.
 * Both gate themselves and render null when their dataset is not served, so
 * the band disappears rather than leaving a labelled hole.
 */
export function FeaturedBand({ className }: { readonly className?: string }) {
  return (
    <div className={cn('w-full space-y-4', className)}>
      <CampaignLandingShareCard className="w-full" />
      <ParliamentPromoCard className="w-full" />
    </div>
  )
}

/** Muted label → the band's content. The three-tier hierarchy's first tier. */
export function SectionBand({
  title,
  children,
  className,
}: {
  readonly title: string
  readonly children: ReactNode
  readonly className?: string
}) {
  return (
    <section className={cn('w-full', className)}>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

/**
 * One surface. Flat, bordered, one accent on hover — no gradient overlay, no
 * shadow, no scale transform, no preview image. The blurb is the point: it says
 * what the sidebar's bare label cannot.
 */
export function DomainTile({ entry }: { readonly entry: LandingEntry }) {
  const Icon = entry.icon

  return (
    <Link
      to={entry.to}
      preload="intent"
      className="group flex h-full items-start gap-3 rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-card-foreground group-hover:underline">
          {entry.title}
        </span>
        <span className="mt-1 block text-sm leading-snug text-muted-foreground">
          {entry.blurb}
        </span>
      </span>
    </Link>
  )
}

/** The grouped index of everything the platform holds. */
export function DomainIndex({ groups }: { readonly groups: readonly LandingGroup[] }) {
  return (
    <div className="w-full space-y-8">
      {groups.map((group) => (
        <SectionBand key={group.key} title={group.title}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.entries.map((entry) => (
              <DomainTile key={entry.title} entry={entry} />
            ))}
          </div>
        </SectionBand>
      ))}
    </div>
  )
}
