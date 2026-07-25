import { Link, useNavigate } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { ArrowUpRight, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { cleanProcurementHubSearch } from '@/schemas/procurement-hub'
import type { CategoryRow } from '@/schemas/procurement'
import {
  procurementChipClassName,
  procurementChoiceButtonActiveClassName,
  procurementChoiceButtonClassName,
  procurementSectionLabelClassName,
} from '../lib/procurement-theme'

export type PartyQuickFilterState = {
  readonly year?: number
  readonly cpv?: string
  /** `YYYY-MM` picked on the monthly chart; narrower than `year`. */
  readonly month?: string
}

type Props = {
  readonly filters: PartyQuickFilterState
  /** All-time activity bounds from the unfiltered slice (chip options stay stable). */
  readonly firstSeen: string | null
  readonly lastSeen: string | null
  /** Top CPV divisions from the unfiltered slice — the active chip's label. */
  readonly categories: readonly CategoryRow[]
  /** Hub search the "advanced filter" link carries (party scope + filters). */
  readonly advancedSearch: Record<string, unknown>
  readonly className?: string
}

const MAX_YEAR_CHIPS = 5

/**
 * Oldest year the profile offers, mirroring the hub's older-years menu. The
 * buyer's own first activity still wins when it is later than this — offering
 * a year the institution has no records in would only ever land on an empty
 * page.
 */
const OLDEST_YEAR = 2019

function yearOf(iso: string | null): number | null {
  if (!iso) return null
  const year = Number(iso.slice(0, 4))
  return Number.isFinite(year) && year >= 2000 ? year : null
}

function monthChipLabel(month: string): string {
  const [year, mm] = month.split('-')
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(Number(year), Number(mm) - 1, 1)))
}

function cpvChipLabel(row: CategoryRow): string {
  return (
    row.cpvDivisionLabelRo ??
    row.cpvDivisionLabelEn ??
    (row.cpvDivisionCode ? `CPV ${row.cpvDivisionCode}` : t`Necunoscut`)
  )
}

/**
 * A party profile's basic filters: a year and a CPV division, in the URL. Only the
 * years are buttons here — CPV divisions are picked on the breakdown card
 * further down, which already shows each division's records and value, so a
 * row of clipped category chips at the top said the same thing worse. An
 * active division comes back here as a removable chip, with its full label.
 *
 * The page content follows both; the trailing link carries the same selection
 * (plus this buyer) into the hub's advanced filter for deeper drilling.
 */
export function ProcurementPartyQuickFilters({
  filters,
  firstSeen,
  lastSeen,
  categories,
  advancedSearch,
  className,
}: Props) {
  const navigate = useNavigate()
  const firstYear = yearOf(firstSeen)
  const lastYear = yearOf(lastSeen)

  const years: readonly number[] = (() => {
    if (lastYear === null) return []
    const start = Math.max(lastYear - MAX_YEAR_CHIPS + 1, firstYear ?? lastYear)
    const list: number[] = []
    for (let year = lastYear; year >= start; year -= 1) list.push(year)
    return list
  })()

  // Everything between the last quick button and the floor, newest first.
  const olderYears: readonly number[] = (() => {
    const oldestChip = years[years.length - 1]
    if (oldestChip === undefined) return []
    const floor = Math.max(OLDEST_YEAR, firstYear ?? OLDEST_YEAR)
    const list: number[] = []
    for (let year = oldestChip - 1; year >= floor; year -= 1) list.push(year)
    return list
  })()
  const olderSelected =
    filters.year !== undefined && olderYears.includes(filters.year)
      ? filters.year
      : null

  // The active division's own label, taken from the unfiltered breakdown so
  // the chip reads as a category and not as a bare code.
  const activeCpvRow = filters.cpv
    ? categories.find((row) => row.cpvDivisionCode === filters.cpv)
    : undefined
  const activeCpvLabel = !filters.cpv
    ? null
    : activeCpvRow
      ? cpvChipLabel(activeCpvRow)
      : `CPV ${filters.cpv}`

  const setFilter = (patch: PartyQuickFilterState) => {
    void navigate({
      to: '.',
      search: (prev: PartyQuickFilterState) => ({ ...prev, ...patch }),
    })
  }

  if (years.length === 0 && activeCpvLabel === null && !filters.month)
    return null

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 sm:flex-nowrap',
        className,
      )}
      aria-label={t`Filtre rapide`}
    >
      {/*
       * The controls share one flexible group so the advanced-filter link
       * keeps its place at the end of the row: as a wrapping sibling it
       * dropped onto a line of its own the moment a category chip appeared.
       */}
      {/* Full width below `sm` so the advanced link drops to its own line
          instead of sitting inside the wrapped year buttons. */}
      <div className="flex w-full min-w-0 flex-1 flex-wrap items-center gap-2 sm:w-auto">
        <span className={cn(procurementSectionLabelClassName, 'mr-1')}>
          <Trans>Filtre rapide</Trans>
        </span>

        {years.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              aria-pressed={filters.year === undefined}
              className={cn(
                procurementChoiceButtonClassName,
                filters.year === undefined &&
                  procurementChoiceButtonActiveClassName,
              )}
              onClick={() => setFilter({ year: undefined, month: undefined })}
            >
              <Trans>Toți anii</Trans>
            </Button>
            {years.map((year) => (
              <Button
                key={year}
                type="button"
                variant="outline"
                aria-pressed={filters.year === year}
                className={cn(
                  procurementChoiceButtonClassName,
                  'tabular-nums',
                  filters.year === year &&
                    procurementChoiceButtonActiveClassName,
                )}
                onClick={() =>
                  setFilter({
                    year: filters.year === year ? undefined : year,
                    month: undefined,
                  })
                }
              >
                {year}
              </Button>
            ))}

            {olderYears.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={
                      olderSelected !== null
                        ? t`Ani mai vechi, selectat ${olderSelected}`
                        : t`Ani mai vechi`
                    }
                    className={cn(
                      procurementChoiceButtonClassName,
                      'gap-1 px-2 tabular-nums',
                      olderSelected !== null &&
                        procurementChoiceButtonActiveClassName,
                    )}
                  >
                    {olderSelected !== null ? (
                      <span>{olderSelected}</span>
                    ) : null}
                    <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="max-h-64 min-w-28 overflow-y-auto rounded-none border-2 border-[#b1b4b6] p-1 dark:border-[var(--pnrr-border)]"
                >
                  {olderYears.map((year) => (
                    <DropdownMenuItem
                      key={year}
                      className={cn(
                        'cursor-pointer rounded-none text-sm font-semibold tabular-nums',
                        olderSelected === year &&
                          'bg-[#1d70b8] text-white focus:bg-[#1d70b8] focus:text-white',
                      )}
                      onSelect={() =>
                        setFilter({
                          year: olderSelected === year ? undefined : year,
                          month: undefined,
                        })
                      }
                    >
                      {year}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        ) : null}

        {filters.month ? (
          <span className={cn(procurementChipClassName)}>
            <span className="shrink-0 font-normal text-[#0b0c0c]/70 dark:text-[var(--pnrr-fg)]/70">
              <Trans>Luna</Trans>
            </span>
            <span className="min-w-0 truncate">
              {monthChipLabel(filters.month)}
            </span>
            <button
              type="button"
              aria-label={t`Elimină filtrul de lună`}
              onClick={() => setFilter({ month: undefined })}
              className="-mr-1 shrink-0 p-0.5 text-[#0b0c0c] transition-colors hover:text-[#1d70b8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:text-[var(--pnrr-fg)]"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </span>
        ) : null}

        {activeCpvLabel !== null ? (
          <>
            <span
              aria-hidden
              className="mx-1 hidden h-5 w-px bg-[#b1b4b6] sm:block dark:bg-[var(--pnrr-border)]"
            />
            <span
              className={cn(procurementChipClassName, 'max-w-full sm:max-w-80')}
            >
              <span className="shrink-0 font-normal text-[#0b0c0c]/70 dark:text-[var(--pnrr-fg)]/70">
                <Trans>Categorie</Trans>
              </span>
              <span className="min-w-0 truncate" title={activeCpvLabel}>
                {activeCpvLabel}
              </span>
              <button
                type="button"
                aria-label={t`Elimină filtrul de categorie`}
                onClick={() => setFilter({ cpv: undefined })}
                className="-mr-1 shrink-0 p-0.5 text-[#0b0c0c] transition-colors hover:text-[#1d70b8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:text-[var(--pnrr-fg)]"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </span>
          </>
        ) : null}
      </div>

      <Link
        to="/procurement"
        search={cleanProcurementHubSearch(advancedSearch)}
        className="inline-flex h-9 shrink-0 items-center gap-1 text-sm font-semibold text-[var(--pnrr-fg)] underline-offset-2 transition-colors hover:text-[var(--pnrr-muted)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
      >
        <Trans>Deschide în filtrul avansat</Trans>
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  )
}
