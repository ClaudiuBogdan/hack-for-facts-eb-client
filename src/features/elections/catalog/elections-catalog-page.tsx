import { Fragment, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Input } from '@/components/ui/input'
import { selectTriggerClassName } from '@/components/ui/select'
import { HomeBand } from '@/features/procurement/components/home/home-section-nav'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { useWarmRouteCode } from '@/hooks/use-warm-route-code'
import { cn } from '@/lib/utils'
import {
  REPORTED_YEAR_MAX,
  REPORTED_YEAR_MIN,
  parseElectionsCatalogSearch,
  type ElectionEdition,
  type ElectionEditionPage,
  type ElectionsCatalogSearch,
} from '@/schemas/elections-catalog'
import { useElectionCatalog } from '../hooks/use-elections-catalog'
import {
  ElectionsAvailabilityNote,
  ElectionsCount,
  ElectionsFilterForm,
  ElectionsListBody,
  ElectionsPageHead,
  FILTER_FIELD_CLASS,
  FILTER_LABEL_CLASS,
  ROW_CLASS,
  ROW_LINK_CLASS,
} from './catalog-parts'

/**
 * `/alegeri` — the catalog of source editions: what the elections API serves
 * today. A source edition is one source's data set, not a distinct election,
 * so the count says „ediții de sursă" and nothing adds editions up. The rows
 * keep the API's order (by key); the filters are the two the API offers, each
 * one exact value; the total is the API's own.
 */

const BAND_ID = 'editii'

/**
 * The family labels the API's contract names as stored. It serves no list of
 * them, so this is the form's offer, not a claim about the data: a label in
 * the address that is not here is offered too, and sent exactly as it is.
 */
const DOCUMENTED_FAMILIES = ['local', 'parliamentary', 'presidential', 'referendum'] as const

export function ElectionsCatalogPage({
  search,
  onSearchChange,
  initialPage,
}: {
  readonly search: ElectionsCatalogSearch
  readonly onSearchChange: (next: ElectionsCatalogSearch) => void
  readonly initialPage?: ElectionEditionPage
}) {
  const query = useElectionCatalog(search, initialPage)
  useWarmRouteCode('/alegeri/$electionKey')
  const data = query.data
  const page = search.pagina ?? 1
  const filtered = search.an !== undefined || search.tip !== undefined
  const goToPage = (next: number) => {
    onSearchChange({ ...search, pagina: next > 1 ? next : undefined })
    document.getElementById(BAND_ID)?.scrollIntoView({ block: 'start' })
  }

  return (
    <div className="bg-background">
      <ElectionsPageHead caption={<Trans>Alegeri / România</Trans>} title={<Trans>Alegeri</Trans>}>
        <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground">
          <Trans>Edițiile de date electorale încărcate din sursele autorităților electorale, fiecare cu scrutinele ei.</Trans>
        </p>
        <ElectionsAvailabilityNote className="mt-6" />
      </ElectionsPageHead>

      <HomeBand id={BAND_ID} labelledBy="elections-catalog-title">
        <HubSectionHead
          titleId="elections-catalog-title"
          index={t`Catalog`}
          title={<Trans>Edițiile de sursă</Trans>}
          lede={
            <Trans>
              O ediție de sursă este un set de date așa cum l-a publicat sursa, nu o alegere distinctă: aceeași alegere poate apărea în mai
              multe ediții, iar edițiile nu se adună.
            </Trans>
          }
          // A failed read has no count to hold a place for: the list says it failed.
          aside={
            !data && query.isError ? null : (
              <ElectionsCount pending={!data || query.isPlaceholderData}>{data ? editionCount(data.total) : null}</ElectionsCount>
            )
          }
        />

        <CatalogFilters
          // A new address (a back step, a shared link) starts the form from it.
          key={JSON.stringify([search.an ?? null, search.tip ?? null])}
          search={search}
          onApply={(next) => onSearchChange(next)}
        />

        <ElectionsListBody
          query={query}
          page={page}
          label={t`Ediții de sursă`}
          loadingLabel={t`Se încarcă edițiile de sursă`}
          loadError={<Trans>Lista edițiilor nu s-a încărcat.</Trans>}
          emptyTitle={filtered ? t`Nicio ediție de sursă nu corespunde filtrelor.` : t`Catalogul nu are încă nicio ediție de sursă.`}
          emptyDescription={filtered ? t`Filtrele caută eticheta exactă din sursă.` : undefined}
          onPageChange={goToPage}
          renderItem={(edition) => <EditionRow key={edition.electionKey} edition={edition} />}
        />
      </HomeBand>
    </div>
  )
}

/** The API's exact total of source editions for the filters, never a sum of pages. */
function editionCount(total: number): string {
  return plural(total, { one: '# ediție de sursă', few: '# ediții de sursă', other: '# de ediții de sursă' })
}

/** The year and family as one form; applying starts the list again from its first page. */
function CatalogFilters({ search, onApply }: { readonly search: ElectionsCatalogSearch; readonly onApply: (next: ElectionsCatalogSearch) => void }) {
  const [year, setYear] = useState(search.an === undefined ? '' : String(search.an))
  const [family, setFamily] = useState(search.tip ?? '')
  const families = search.tip === undefined || (DOCUMENTED_FAMILIES as readonly string[]).includes(search.tip) ? DOCUMENTED_FAMILIES : [...DOCUMENTED_FAMILIES, search.tip]

  return (
    <ElectionsFilterForm
      label={t`Filtrează edițiile de sursă`}
      active={search.an !== undefined || search.tip !== undefined}
      // Through the address's own parser: a year out of the API's range is no filter.
      onApply={() => onApply(parseElectionsCatalogSearch({ an: year === '' ? undefined : year, tip: family === '' ? undefined : family }))}
      onClear={() => onApply({})}
    >
      <div className={FILTER_FIELD_CLASS}>
        <label htmlFor="elections-filter-year" className={FILTER_LABEL_CLASS}>
          <Trans>An raportat</Trans>
        </label>
        <Input
          id="elections-filter-year"
          type="number"
          inputMode="numeric"
          min={REPORTED_YEAR_MIN}
          max={REPORTED_YEAR_MAX}
          step={1}
          placeholder={t`Oricare`}
          value={year}
          onChange={(event) => setYear(event.target.value)}
        />
      </div>
      <div className={FILTER_FIELD_CLASS}>
        <label htmlFor="elections-filter-family" className={FILTER_LABEL_CLASS}>
          <Trans>Tip raportat</Trans>
        </label>
        <select
          id="elections-filter-family"
          value={family}
          onChange={(event) => setFamily(event.target.value)}
          className={cn(selectTriggerClassName, 'text-base md:text-sm')}
        >
          {/* Empty is no filter: the API never stores an empty label. */}
          <option value="">{t`Oricare`}</option>
          {families.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
    </ElectionsFilterForm>
  )
}

/** One edition: its reported name is the link; the family and round as the source states them; the reported year at the right. */
function EditionRow({ edition }: { readonly edition: ElectionEdition }) {
  const details = [edition.reportedFamily, edition.reportedRound].filter((value): value is string => value !== null)
  return (
    <li className={ROW_CLASS}>
      <div className="min-w-0">
        <Link to="/alegeri/$electionKey" params={{ electionKey: edition.electionKey }} className={cn(ROW_LINK_CLASS, 'break-words')}>
          {edition.reportedName}
        </Link>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {details.map((value, index) => (
            <Fragment key={index}>
              {index > 0 ? <span aria-hidden="true">·</span> : null}
              <span className="break-all">{value}</span>
            </Fragment>
          ))}
          {/* The key is what a reader copies; above the row's link so it stays selectable. A name equal to it is said once. */}
          {edition.reportedName !== edition.electionKey ? <span className="relative z-10 select-text break-all font-mono">{edition.electionKey}</span> : null}
        </p>
      </div>
      <span className="shrink-0 text-sm tabular-nums text-muted-foreground sm:text-right">
        {edition.reportedYear === null ? <Trans>An neraportat</Trans> : String(edition.reportedYear)}
      </span>
    </li>
  )
}
