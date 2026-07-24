import { Trans } from '@lingui/react/macro'
import { Database, Search } from 'lucide-react'
import type { ProcurementSearchProvenance } from '@/schemas/procurement'
import type { ProcurementHubState } from '@/schemas/procurement-hub'
import { listCapabilityDrops } from '@/schemas/procurement-hub'

type Props = {
  readonly provenance?: ProcurementSearchProvenance | null
  /** Hub state, when the list is rendered inside the hub (drops need the grain). */
  readonly hubState?: ProcurementHubState
}

/** `2026-07-24T21:44:19Z` → `24 Jul 2026, 21:44` (UTC, the build's own clock). */
function formatBuildStamp(iso: string): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date)
}

/**
 * Two honesty lines above the record list:
 *
 *  1. WHERE the list came from. Search-engine pages are as of an index build,
 *     so a record added since then is not listed yet — the reader is told,
 *     rather than shown a stale list that claims to be live. Row values are
 *     always hydrated from the production database either way.
 *  2. WHICH of the active filters this record type cannot honor, from the same
 *     capability registry the query builder scrubs with — so a dropped filter
 *     is always an explained one.
 */
export function ProcurementListProvenanceNotice({ provenance, hubState }: Props) {
  const drops = hubState ? listCapabilityDrops(hubState) : []
  const stamp =
    provenance?.engine === 'opensearch' && provenance.asOf
      ? formatBuildStamp(provenance.asOf)
      : null

  if (drops.length === 0 && stamp === null && provenance?.engine !== 'postgres') {
    return null
  }

  return (
    <div className="space-y-1 text-sm text-[var(--pnrr-muted)]">
      {stamp !== null ? (
        <p className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            <Trans>
              Search results as of {stamp} UTC; record values are read live from
              the database.
            </Trans>
          </span>
        </p>
      ) : provenance?.engine === 'postgres' ? (
        <p className="flex items-center gap-2">
          <Database className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            <Trans>Served live from the database (search engine not used).</Trans>
          </span>
        </p>
      ) : null}

      {drops.map((drop) => (
        <p
          key={drop.key}
          className="border-l-4 border-amber-500 pl-3 leading-6"
        >
          <Trans>
            {drop.label} is not applied to this list: {drop.reason}.
          </Trans>
        </p>
      ))}
    </div>
  )
}
