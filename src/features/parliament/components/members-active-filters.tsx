import { X } from 'lucide-react'
import type { ParliamentMembersSearch } from '@/schemas/parliament'
import { useParliamentGroups, useParliamentJudete } from '../hooks/use-parliament-data'
import { getChamberLabel } from '../lib/formatting'
import { getGrupFilterValues, getJudetFilterValues } from '../lib/member-search'
import { ParliamentActiveFilterChips } from './parliament-list-surface'

type Props = {
  readonly search: ParliamentMembersSearch
  readonly onSearchChange: (search: ParliamentMembersSearch) => void
  readonly onClearAll: () => void
  readonly compact?: boolean
}

/** Active filter chips for the members directory */
export function MembersActiveFilters({
  search,
  onSearchChange,
  onClearAll,
  compact = false,
}: Props) {
  const { data: groups = [] } = useParliamentGroups()
  const { data: judete = [] } = useParliamentJudete()

  const chips: Array<{
    readonly key: string
    readonly label: string
    readonly onRemove: () => void
  }> = []

  if (search.q?.trim()) {
    chips.push({
      key: 'q',
      label: `Nume: ${search.q.trim()}`,
      onRemove: () => onSearchChange({ ...search, q: undefined, page: 1 }),
    })
  }

  // `comun` is a votes-tab value; the members query drops it, so a chip here
  // would claim a constraint the list is not applying.
  if (search.chamber && search.chamber !== 'all' && search.chamber !== 'comun') {
    chips.push({
      key: 'chamber',
      label: getChamberLabel(search.chamber),
      onRemove: () =>
        onSearchChange({ ...search, chamber: undefined, grup: undefined, page: 1 }),
    })
  }

  for (const groupId of getGrupFilterValues(search)) {
    const group = groups.find((entry) => entry.groupId === groupId)
    const groupLabel = group ? (group.shortName ?? group.name) : groupId

    chips.push({
      key: `grup-${groupId}`,
      label: groupLabel,
      onRemove: () => {
        const remainingGroups = getGrupFilterValues(search).filter(
          (value) => value !== groupId,
        )
        onSearchChange({
          ...search,
          grup: remainingGroups.length > 0 ? remainingGroups : undefined,
          page: 1,
        })
      },
    })
  }

  for (const judetSlug of getJudetFilterValues(search)) {
    const judet = judete.find((entry) => entry.slug === judetSlug)
    chips.push({
      key: `judet-${judetSlug}`,
      label: judet?.name ?? judetSlug,
      onRemove: () => {
        const remainingJudete = getJudetFilterValues(search).filter(
          (value) => value !== judetSlug,
        )
        onSearchChange({
          ...search,
          judet: remainingJudete.length > 0 ? remainingJudete : undefined,
          page: 1,
        })
      },
    })
  }

  if (chips.length === 0) {
    return null
  }

  if (compact) {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-2.5 pb-2 pt-1">
        <span
          className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center bg-[var(--pnrr-fg)] px-1.5 text-[11px] font-semibold text-[var(--pnrr-bg)]"
          aria-hidden
        >
          {chips.length}
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="group inline-flex max-w-full items-center gap-1.5 bg-[var(--pnrr-green)] px-2.5 py-1.5 text-sm text-[var(--pnrr-fg)]"
              title={chip.label}
            >
              <span className="min-w-0 truncate font-bold">{chip.label}</span>
              <button
                type="button"
                onClick={chip.onRemove}
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-[var(--pnrr-fg)]/70 transition-colors hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
                aria-label={`Elimină filtrul ${chip.label}`}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="hidden shrink-0 text-sm text-[var(--pnrr-fg)] underline underline-offset-4 transition-colors hover:text-[var(--pnrr-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] sm:inline-flex"
        >
          Șterge filtrele
        </button>
      </div>
    )
  }

  // In-page chips are the shared ones; the compact branch above stays as it is
  // because it lives in the floating bar, on a dark strip of its own.
  return <ParliamentActiveFilterChips chips={chips} onClearAll={onClearAll} />
}
