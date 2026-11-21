import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type {
  ParliamentChamber,
  ParliamentMembersSearch,
} from '@/schemas/parliament'
import { useParliamentChamberComposition } from '../hooks/use-parliament-data'
import { getChamberLabel } from '../lib/formatting'
import {
  PARLIAMENT_CAMERA_MARK,
  PARLIAMENT_SENAT_MARK,
  parliamentHubSectionBodyClassName,
  parliamentHubSectionClassName,
  parliamentHubSectionHeaderClassName,
} from '../lib/hub-theme'
import { ChamberHemicycle } from './chamber-hemicycle'
import { PartyLegendGrid } from './party-legend-grid'

type Props = {
  readonly chamber: ParliamentChamber
  readonly search: ParliamentMembersSearch
}

/** Chamber composition section with hemicycle chart and party legend */
export function ChamberCompositionSection({ chamber, search }: Props) {
  const { data: composition, isLoading } = useParliamentChamberComposition(
    chamber,
    search,
  )
  // The left rule carries no text: it is a mark, so it takes the flipping chamber colour.
  const accentColor =
    chamber === 'camera' ? PARLIAMENT_CAMERA_MARK : PARLIAMENT_SENAT_MARK

  if (isLoading || !composition) {
    return (
      <section className={parliamentHubSectionClassName}>
        <div
          className={parliamentHubSectionHeaderClassName}
          style={{ borderLeftWidth: '4px', borderLeftColor: accentColor }}
        >
          <Skeleton className="h-5 w-48" />
        </div>
        <div className={parliamentHubSectionBodyClassName}>
          <Skeleton className="mx-auto h-64 w-full max-w-3xl rounded-none" />
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-none" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={parliamentHubSectionClassName}>
      <div
        className={parliamentHubSectionHeaderClassName}
        style={{ borderLeftWidth: '4px', borderLeftColor: accentColor }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-widest text-parliament-muted">
            {getChamberLabel(chamber)}
          </h2>
          {composition.hasActiveFilters ? (
            <span className="text-xs font-semibold text-parliament-frame-muted">
              {composition.activeSeatCount} / {composition.totalSeats} evidențiate
            </span>
          ) : null}
        </div>
      </div>
      <div className={cn(parliamentHubSectionBodyClassName, 'pt-4 pb-5')}>
        <ChamberHemicycle composition={composition} />
        <div className="mt-6">
          <PartyLegendGrid composition={composition} />
        </div>
      </div>
    </section>
  )
}
