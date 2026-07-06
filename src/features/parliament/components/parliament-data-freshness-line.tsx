import { CalendarClock } from 'lucide-react'
import type { ParliamentDataFreshness } from '@/schemas/parliament'

type Props = {
  readonly freshness: ParliamentDataFreshness | undefined
}

function formatDate(value: string | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/**
 * Data-freshness line on the parliament hub. Renders nothing when no freshness
 * signal is available (graceful absent state) so the hub never shows an empty
 * "Actualizat la —" line.
 */
export function ParliamentDataFreshnessLine({ freshness }: Props) {
  const loadedAt = formatDate(freshness?.lastLoadedAt)
  const latestVote = formatDate(freshness?.latestVoteDate)
  if (!loadedAt && !latestVote) return null

  return (
    <p className="flex flex-wrap items-center gap-2 text-sm text-[var(--pnrr-muted)]">
      <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
      {loadedAt ? <span>Date actualizate la {loadedAt}</span> : null}
      {loadedAt && latestVote ? <span aria-hidden>·</span> : null}
      {latestVote ? (
        <span>ultimul vot înregistrat: {latestVote}</span>
      ) : null}
    </p>
  )
}
