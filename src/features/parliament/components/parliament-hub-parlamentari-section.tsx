import { Link } from '@tanstack/react-router'
import type { ParliamentGroup } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import { getChamberLabel } from '../lib/formatting'
import {
  PARLIAMENT_CHAMBER_LABEL_CLASS_NAMES,
  parliamentHubLinkClassName,
} from '../lib/hub-theme'
import { ParliamentHubSection } from './parliament-hub-section'
import { PartyLegendCard } from './party-legend-card'

type ChamberCounts = {
  readonly camera: number
  readonly senat: number
}

type Props = {
  readonly groups: ReadonlyArray<ParliamentGroup>
  /** CURRENT seats (headline). */
  readonly memberCountByChamber: ChamberCounts
  /** ALL mandate rows incl. superseded (secondary, optional). */
  readonly memberCountByChamberAllMandates?: ChamberCounts
}

function ChamberSummary({
  chamber,
  count,
  totalMandates,
}: {
  readonly chamber: 'camera' | 'senat'
  readonly count: number
  readonly totalMandates?: number
}) {
  // Surface the superseded delta when current < all-mandates (SC-1).
  const superseded =
    typeof totalMandates === 'number' && totalMandates > count
      ? totalMandates - count
      : 0
  return (
    <div className="border-2 border-parliament-border-strong bg-parliament-page p-4">
      <p
        className={cn(
          'text-xs font-black uppercase tracking-wide',
          PARLIAMENT_CHAMBER_LABEL_CLASS_NAMES[chamber],
        )}
      >
        {getChamberLabel(chamber)}
      </p>
      <p className="mt-2 text-3xl font-black tabular-nums leading-none text-parliament-frame-fg">
        {count.toLocaleString('ro-RO')}
      </p>
      <p className="mt-1 text-sm text-parliament-frame-muted">locuri ocupate</p>
      {superseded > 0 ? (
        <p
          className="mt-1 text-xs text-parliament-frame-muted"
          title={`${totalMandates!.toLocaleString('ro-RO')} mandate în total în legislatură, incluzând ${superseded} încheiate (deces/demisie)`}
        >
          {totalMandates!.toLocaleString('ro-RO')} mandate în total
        </p>
      ) : null}
    </div>
  )
}

/** Parliamentary groups and member counts on the Parlament hub */
export function ParliamentHubParlamentariSection({
  groups,
  memberCountByChamber,
  memberCountByChamberAllMandates,
}: Props) {
  const cameraGroups = groups.filter((group) => group.chamber === 'camera')
  const senatGroups = groups.filter((group) => group.chamber === 'senat')

  return (
    <ParliamentHubSection
      id="parliament-hub-parlamentari-heading"
      title="Parlamentari"
      description="Grupurile parlamentare și numărul de membri din Camera Deputaților și Senat."
      action={
        <Link
          to="/parlament"
          search={{ tab: 'grupuri' }}
          className={parliamentHubLinkClassName}
        >
          Vezi componența completă
        </Link>
      }
      bodyClassName="space-y-6 p-5 sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <ChamberSummary
          chamber="camera"
          count={memberCountByChamber.camera}
          totalMandates={memberCountByChamberAllMandates?.camera}
        />
        <ChamberSummary
          chamber="senat"
          count={memberCountByChamber.senat}
          totalMandates={memberCountByChamberAllMandates?.senat}
        />
      </div>

      <div className="space-y-6">
        <section aria-labelledby="parliament-hub-camera-groups-heading">
          <h3
            id="parliament-hub-camera-groups-heading"
            className="mb-3 text-sm font-black uppercase tracking-wide text-parliament-frame-muted"
          >
            {getChamberLabel('camera')}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cameraGroups.map((group) => (
              <PartyLegendCard
                key={group.groupId}
                group={group}
                activeCount={group.memberCount}
                totalCount={group.memberCount}
                hasActiveFilters={false}
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="parliament-hub-senat-groups-heading">
          <h3
            id="parliament-hub-senat-groups-heading"
            className="mb-3 text-sm font-black uppercase tracking-wide text-parliament-frame-muted"
          >
            {getChamberLabel('senat')}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {senatGroups.map((group) => (
              <PartyLegendCard
                key={group.groupId}
                group={group}
                activeCount={group.memberCount}
                totalCount={group.memberCount}
                hasActiveFilters={false}
              />
            ))}
          </div>
        </section>
      </div>
    </ParliamentHubSection>
  )
}
