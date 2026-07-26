import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { ParliamentSpeechesSearch } from '@/schemas/parliament'
import { useParliamentSpeechActivity } from '../hooks/use-parliament-data'
import {
  buildParliamentSpeechesFilter,
  countActiveParliamentSpeechFilters,
  getParliamentSpeechQ,
} from '../lib/parliament-speeches-filter'
import {
  countActiveStenogramSessionFilters,
  getStenogrameView,
} from '../lib/parliament-stenogram-filter'
import {
  stenogramSectionIntroClassName,
  stenogramSectionTitleClassName,
} from '../lib/stenogram-theme'
import { ParliamentShell } from './parliament-shell'
import { MemberSpeechActivityHeatmap } from './member-speech-activity-heatmap'
import { ParliamentDebouncedSearchInput } from './parliament-debounced-search-input'
import { FilterTriggerButton } from './parliament-filter-trigger-button'
import { ParliamentYearCombobox } from './parliament-year-combobox'
import {
  ParliamentStenogramControls,
  ParliamentStenogrameActiveFilters,
  type ParliamentStenogramePatch,
} from './parliament-stenogram-controls'
import { ParliamentStenogramInterventionsView } from './parliament-stenogram-interventions-view'
import { ParliamentStenogramSessionsView } from './parliament-stenogram-sessions-view'
import { ParliamentSpeechesFilterSheet } from './parliament-speeches-filter-sheet'

type Props = {
  readonly search: ParliamentSpeechesSearch
}

/** Drop `undefined` keys so the committed URL stays minimal. */
function stripUndefined(
  search: ParliamentSpeechesSearch,
): ParliamentSpeechesSearch {
  return Object.fromEntries(
    Object.entries(search).filter(([, value]) => value !== undefined),
  ) as ParliamentSpeechesSearch
}

/** Descending year range used when the server year list is unavailable. */
function fallbackYears(currentYear: number): number[] {
  return Array.from({ length: 12 }, (_, index) => currentYear - index)
}

/**
 * `/parlament/stenograme` — the stenogram surface, SITTINGS FIRST.
 *
 * The page opens on the list of captured sittings with an empty URL. That is
 * the ordering decision the whole surface rests on: a stenogram is a document,
 * so "which sittings happened, and can I read them" is the question a reader
 * arrives with, and it is also the only one of the two lists the server can
 * answer without first being handed a year (the turns list has no date index
 * and refuses an unbounded query). Interventions remain one click away for the
 * cross-sitting question — "who said X, anywhere".
 *
 * All state is in the URL, so every view is shareable and restores exactly.
 */
export function ParliamentStenogramePage({ search }: Props) {
  const navigate = useNavigate({ from: '/parlament/stenograme/' })
  const [filterOpen, setFilterOpen] = useState(false)
  const view = getStenogrameView(search)
  const currentYear = new Date().getFullYear()
  const q = getParliamentSpeechQ(search)

  // ONE cheap aggregate is the authoritative year list for both views:
  // `availableYears` is every year with any (filtered) turn and is independent
  // of the `year` argument, so the first fetch already reveals the whole set.
  const bootstrapYear = search.an ?? currentYear
  const activityFilter = useMemo(
    () =>
      buildParliamentSpeechesFilter(search, {
        stripDate: true,
        year: bootstrapYear,
      }),
    [search, bootstrapYear],
  )
  const bootstrap = useParliamentSpeechActivity(bootstrapYear, activityFilter, q)
  const serverYears = bootstrap.data?.availableYears ?? []
  // A failed bootstrap must not take the year control down with it.
  const years = serverYears.length > 0 ? serverYears : fallbackYears(currentYear)

  const year =
    search.an ??
    (serverYears.length > 0 ? Math.max(...serverYears) : currentYear)

  // The heatmap is a secondary ACTIVITY read; it only ever runs on the
  // interventions view, where a year is already committed.
  const activityQuery = useParliamentSpeechActivity(
    year,
    activityFilter,
    q,
  )
  const activity = activityQuery.data ?? undefined
  const isActivityLoading = bootstrap.isLoading || activityQuery.isLoading

  const activeCount =
    view === 'sedinte'
      ? countActiveStenogramSessionFilters(search)
      : countActiveParliamentSpeechFilters(search)

  const selectedDay =
    search.from && search.from === search.to ? search.from : undefined

  const commit = (patch: ParliamentStenogramePatch) => {
    void navigate({
      search: stripUndefined({ ...search, ...patch }),
      replace: true,
      resetScroll: false,
    })
  }

  const handleSelectDay = (day: string | null) => {
    if (!day || (search.from === day && search.to === day)) {
      commit({ from: undefined, to: undefined })
      return
    }
    commit({ from: day, to: day })
  }

  const handleClearAll = () =>
    commit({
      vorbitor: undefined,
      camera: undefined,
      disponibilitate: undefined,
      from: undefined,
      to: undefined,
      q: undefined,
      // The year survives a clear on the interventions view: it is the query's
      // bound there, not a filter, and dropping it would silently re-scope the
      // list to the current year rather than to "everything".
      ...(view === 'sedinte' ? { an: undefined } : {}),
    })

  return (
    <ParliamentShell activeTab="stenograme">
      <div className="space-y-8">
        <div>
          <h2 className={stenogramSectionTitleClassName}>
            <Trans>Stenogramele Parlamentului</Trans>
          </h2>
          <p className={stenogramSectionIntroClassName}>
            <Trans>
              Stenograma este transcrierea oficială a dezbaterilor din plen.
              Începeți de la ședințe — fiecare ședință se poate citi integral,
              în ordinea din stenograma oficială — sau treceți la intervenții
              dacă vă interesează cine a spus ceva anume, indiferent de ședință.
            </Trans>
          </p>
        </div>

        <ParliamentStenogramControls
          search={search}
          chips={
            <ParliamentStenogrameActiveFilters
              search={search}
              onChange={commit}
              onClearAll={handleClearAll}
            />
          }
        >
          <ParliamentDebouncedSearchInput
            inputId="parliament-stenograme-q"
            ariaLabel={
              view === 'sedinte'
                ? t`Caută în textul ședințelor`
                : t`Caută în intervenții`
            }
            placeholder={
              view === 'sedinte'
                ? t`Caută în tot istoricul stenogramelor…`
                : t`Caută un subiect (ex. buget, educație)…`
            }
            value={search.q}
            onCommit={(next) => commit({ q: next })}
            className="min-w-0 flex-1 sm:min-w-56"
          />
          <ParliamentYearCombobox
            id="parliament-stenograme-year"
            years={years}
            value={view === 'sedinte' ? search.an : year}
            onChange={(next) => commit({ an: next })}
            // On sittings the year is optional — the default is the whole
            // history. On interventions it is the query's bound, so there is
            // no "all years" option to offer.
            {...(view === 'sedinte' && { allLabel: t`Toți anii` })}
          />
          <FilterTriggerButton
            activeCount={activeCount}
            onClick={() => setFilterOpen(true)}
          />
        </ParliamentStenogramControls>

        {view === 'sedinte' ? (
          <ParliamentStenogramSessionsView search={search} />
        ) : (
          <>
            {/* The heatmap is an OPTIONAL activity read, collapsed by default:
                it is a nice overview but it is not how anyone finds a debate,
                and it used to occupy the top of the page above the results. */}
            <details className="group border-2 border-[#b1b4b6] bg-white dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-sm font-semibold text-[#0b0c0c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:text-[var(--pnrr-fg)]">
                <span>
                  <Trans>Activitatea în plen pe zile ({year})</Trans>
                </span>
                <span className="text-[#1d70b8] underline underline-offset-4">
                  <span className="group-open:hidden">
                    <Trans>Arată</Trans>
                  </span>
                  <span className="hidden group-open:inline">
                    <Trans>Ascunde</Trans>
                  </span>
                </span>
              </summary>
              <div className="space-y-4 border-t-2 border-[#b1b4b6] p-5 dark:border-[var(--pnrr-border)]">
                <p className="text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                  <Trans>
                    Fiecare pătrat este o zi; intensitatea arată câte intervenții
                    au fost consemnate. Faceți clic pe o zi pentru a filtra lista.
                  </Trans>
                </p>
                <MemberSpeechActivityHeatmap
                  activity={activity}
                  selectedDay={selectedDay}
                  onSelectDay={handleSelectDay}
                  year={year}
                  onSelectYear={(next) => commit({ an: next })}
                  isLoading={isActivityLoading}
                  // The toolbar combobox owns the year for this page.
                  yearControl="none"
                />
              </div>
            </details>

            <ParliamentStenogramInterventionsView search={search} year={year} />
          </>
        )}

        <ParliamentSpeechesFilterSheet
          open={filterOpen}
          onOpenChange={setFilterOpen}
          search={search}
          onChange={commit}
          onClearAll={handleClearAll}
        />
      </div>
    </ParliamentShell>
  )
}
