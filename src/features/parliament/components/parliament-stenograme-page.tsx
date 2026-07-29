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
import { ParliamentListHeader } from './parliament-list-surface'
import { ParliamentShell } from './parliament-shell'
import { ParliamentSpeechActivityPanel } from './parliament-speech-activity-panel'
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
    // The panel's window can reach back past the toolbar's year — a day clicked
    // in the rolling window may belong to the year before it. On INTERVENTIONS
    // the year is the query's own bound, so the two must be committed together
    // or the toolbar would keep claiming a year the list is no longer showing.
    // On sittings the date bound already outranks the year (see
    // `buildStenogramSessionsFilter`), and forcing a year there would survive
    // the day being cleared and silently narrow the whole history.
    const dayYear = Number.parseInt(day.slice(0, 4), 10)
    commit({
      from: day,
      to: day,
      ...(view === 'interventii' && Number.isFinite(dayYear)
        ? { an: dayYear }
        : {}),
    })
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

  // Built once and placed by the view below, so the two surfaces cannot drift
  // into two different heatmaps of the same aggregate. It owns its own range —
  // the toolbar's year bounds the LIST, this bounds the chart — and the only
  // thing it writes back is the day filter.
  // NOT shown while the sittings list is filtered by capture availability. The
  // aggregate behind it counts TURNS and its filter has no availability field,
  // so the squares would be drawn from every capture state while the list below
  // showed one — offering a busy day that yields no sittings at all. A chart
  // that disagrees with the list it sits under is worse than no chart.
  const activityPanelApplies =
    view === 'interventii' || search.disponibilitate === undefined

  const activityPanel = activityPanelApplies ? (
    <ParliamentSpeechActivityPanel
      filter={activityFilter}
      q={q}
      availableYears={years}
      selectedDay={selectedDay}
      onSelectDay={handleSelectDay}
    />
  ) : null

  return (
    <ParliamentShell activeTab="stenograme">
      <div className="space-y-8">
        <ParliamentListHeader
          title={<Trans>Stenogramele Parlamentului</Trans>}
          description={
            <Trans>
              Transcrierile oficiale ale dezbaterilor din plen — ședință cu
              ședință, sau intervenție cu intervenție.
            </Trans>
          }
          about={
            <Trans>
              Începeți de la ședințe: fiecare ședință se poate citi integral, în
              ordinea din stenograma oficială. Treceți la intervenții dacă vă
              interesează cine a spus ceva anume, indiferent de ședință. Nu
              toate ședințele au stenograma publicată; filtrul de disponibilitate
              arată care sunt captate.
            </Trans>
          }
        />

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

        {/* The heatmap is an OPTIONAL activity read, collapsed by default: it
            is a good overview but it is not how anyone finds a debate, and it
            used to occupy the top of the page above the results.

            On INTERVENTIONS it sits above the list, where it reads as the shape
            of the thing being listed. On SITTINGS it goes UNDER the list: the
            sittings are the answer to the question the reader arrived with, and
            an activity chart between the toolbar and them would push the record
            below the fold to show a picture of it. Both drive the same
            `?from=/?to=` day filter, which the sittings list honours through
            `sessionDate`, so a day clicked anywhere narrows what is on screen. */}
        {view === 'sedinte' ? (
          <>
            <ParliamentStenogramSessionsView search={search} />
            {activityPanel}
          </>
        ) : (
          <>
            {activityPanel}
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
