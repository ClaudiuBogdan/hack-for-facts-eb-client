import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ParliamentCommittee } from '@/schemas/parliament'
import { useParliamentCommittees } from '../hooks/use-parliament-data'
import { committeeChamberLabel } from '../lib/committee-format'
import { LATEST_LEGISLATURE } from '../api/graphql/parliament-translate'
import { ParliamentCardChevron } from './parliament-card-chevron'
import { ParliamentBackLink, ParliamentPageFrame } from './parliament-page-frame'

type ChamberFilter = 'all' | 'camera_deputatilor' | 'senat'
/** 'all' → send no legislature (server returns every legislature, oldest first). */
type LegislatureFilter = string

const CHAMBER_TABS: ReadonlyArray<{ id: ChamberFilter; label: string }> = [
  { id: 'all', label: 'Toate' },
  { id: 'camera_deputatilor', label: 'Camera Deputaților' },
  { id: 'senat', label: 'Senat' },
]

/**
 * Post-1990 legislatures (start year). The server orders committees by
 * `committee_key` (text), so WITHOUT a legislature filter the first page is the
 * 1990 committees — we default to the CURRENT legislature and offer a selector
 * (plus an explicit "all legislatures" escape hatch).
 */
const LEGISLATURE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'all', label: 'Toate legislaturile' },
  ...['2024', '2020', '2016', '2012', '2008', '2004', '2000', '1996', '1992', '1990'].map(
    (year) => ({ value: year, label: `Legislatura ${year}` }),
  ),
]

function CommitteeRow({ committee }: { readonly committee: ParliamentCommittee }) {
  return (
    <Link
      to="/parlament/comisii/$committeeKey"
      params={{ committeeKey: committee.committeeKey }}
      className="group relative flex items-center justify-between gap-4 border border-[#b1b4b6] bg-white p-4 transition-colors hover:bg-[#f8f8f8] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:hover:bg-[var(--pnrr-hover)]"
    >
      <div className="min-w-0">
        <p className="text-base font-bold text-[#1d70b8] underline-offset-2 group-hover:underline">
          {committee.name}
        </p>
        <p className="mt-1 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          {committeeChamberLabel(committee.chamber)}
          {committee.committeeType ? ` · ${committee.committeeType}` : ''}
        </p>
      </div>
      <ParliamentCardChevron className="shrink-0" />
    </Link>
  )
}

/** Committee browse page at /parlament/comisii */
export function ParliamentCommitteesPage() {
  const [chamber, setChamber] = useState<ChamberFilter>('all')
  // Default to the CURRENT legislature so the browse doesn't open on 1990 rows.
  const [legislature, setLegislature] = useState<LegislatureFilter>(LATEST_LEGISLATURE)
  const { data, isLoading } = useParliamentCommittees({
    ...(chamber === 'all' ? {} : { chamber }),
    ...(legislature === 'all' ? {} : { legislature }),
  })
  const committees = data?.committees ?? []

  return (
    <ParliamentPageFrame className="space-y-8">
      <ParliamentBackLink to="/parlament" search={{ tab: 'grupuri' }} label="Parlament" />

      <header className="border-b border-border pb-6">
        <h1
          className="font-black leading-tight tracking-tight"
          style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)' }}
        >
          Comisii parlamentare
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Comisiile permanente și speciale ale Camerei Deputaților și Senatului.
        </p>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtru cameră">
          {CHAMBER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={chamber === tab.id}
              onClick={() => setChamber(tab.id)}
              className={cn(
                'rounded-none border-2 px-4 py-2 text-sm font-semibold transition-colors',
                chamber === tab.id
                  ? 'border-[#1d70b8] bg-[#1d70b8] text-white'
                  : 'border-[#b1b4b6] bg-white text-[#0b0c0c] hover:bg-[#f3f2f1] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)]',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          <span className="font-semibold">Legislatura</span>
          <select
            value={legislature}
            onChange={(e) => setLegislature(e.target.value)}
            className="rounded-none border-2 border-[#b1b4b6] bg-white px-3 py-2 text-sm font-semibold text-[#0b0c0c] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)]"
            aria-label="Filtru legislatură"
          >
            {LEGISLATURE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-none" />
      ) : committees.length > 0 ? (
        <ul className="space-y-3">
          {committees.map((committee) => (
            <li key={committee.committeeKey}>
              <CommitteeRow committee={committee} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          Nu există comisii disponibile pentru filtrul selectat.
        </p>
      )}
    </ParliamentPageFrame>
  )
}
