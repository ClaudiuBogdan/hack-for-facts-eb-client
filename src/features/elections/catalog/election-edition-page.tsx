import { Fragment, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { Input } from '@/components/ui/input'
import { selectTriggerClassName } from '@/components/ui/select'
import { HomeBand } from '@/features/procurement/components/home/home-section-nav'
import { HubPending, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { useWarmRouteCode } from '@/hooks/use-warm-route-code'
import { cn } from '@/lib/utils'
import {
  ELECTION_SCOPE_TYPES,
  parseElectionContestsSearch,
  type ElectionContest,
  type ElectionContestPage,
  type ElectionContestsSearch,
  type ElectionEdition,
} from '@/schemas/elections-catalog'
import { useElectionContests, useElectionEdition } from '../hooks/use-elections-catalog'
import {
  ElectionsAvailabilityNote,
  ElectionsBackLink,
  ElectionsCount,
  ElectionsFactList,
  ElectionsFilterForm,
  type ElectionsFact,
  ElectionsListBody,
  ElectionsLoadError,
  ElectionsPageHead,
  ElectionsRecordMissing,
  ElectionsRefreshError,
  FILTER_FIELD_CLASS,
  FILTER_LABEL_CLASS,
  ROW_CLASS,
  ROW_LINK_CLASS,
} from './catalog-parts'
import { buildEditionDocumentTitle, formatReportedDate, isIdentityUnverified, scopeTypeLabel } from './elections-catalog-text'

/**
 * `/alegeri/$electionKey` — one source edition: its reported facts, then its
 * contests, a page at a time in the API's order, filtered by the reported
 * office, scope type and round. The edition and its contests are two reads:
 * a list that fails leaves the edition standing, and its own retry.
 */

const BAND_ID = 'scrutine'

/** The office labels the API's contract names as stored; vocabularies differ per edition, so these only suggest. */
const DOCUMENTED_OFFICES = ['mayor', 'local_council', 'county_council', 'county_president', 'chamber_deputies', 'senate'] as const
/** Round labels as the contract shows them stored; a suggestion, never a finality. */
const DOCUMENTED_ROUNDS = ['tur1', 'tur2', 'final'] as const

export function ElectionEditionPage({
  electionKey,
  search,
  onSearchChange,
  initialEdition,
  initialContests,
}: {
  readonly electionKey: string
  readonly search: ElectionContestsSearch
  readonly onSearchChange: (next: ElectionContestsSearch) => void
  readonly initialEdition?: ElectionEdition
  readonly initialContests?: ElectionContestPage
}) {
  const { i18n } = useLingui()
  const query = useElectionEdition(electionKey, initialEdition)
  const edition = query.data
  useClientDocumentTitle(edition ? buildEditionDocumentTitle(i18n, { electionKey, name: edition.reportedName }) : null)
  useWarmRouteCode('/alegeri/contest/$contestKey')

  const refreshError = query.isRefetchError ? <ElectionsRefreshError className="mt-6" onRetry={() => void query.refetch()} /> : null

  if (edition === null) {
    return (
      <ElectionsRecordMissing title={<Trans>Ediția de sursă nu a fost găsită</Trans>} notice={refreshError}>
        <Trans>Nu există o ediție de sursă publică cu cheia {electionKey}.</Trans>
      </ElectionsRecordMissing>
    )
  }

  return (
    <div className="bg-background">
      <ElectionsPageHead
        back={
          <ElectionsBackLink>
            <Trans>Toate edițiile de sursă</Trans>
          </ElectionsBackLink>
        }
        caption={<Trans>Ediție de sursă</Trans>}
        // The key names the page while its read is pending or has failed.
        title={edition ? edition.reportedName : electionKey}
      >
        {edition ? (
          <>
            {refreshError}
            <ElectionsFactList className="mt-8" facts={editionFacts(edition, i18n.locale)} />
          </>
        ) : query.isError ? (
          <ElectionsLoadError onRetry={() => void query.refetch()}>
            <Trans>Datele ediției nu s-au încărcat.</Trans>
          </ElectionsLoadError>
        ) : (
          <HubPending rows={3} className="mt-8" />
        )}
        <ElectionsAvailabilityNote className="mt-8" unverified={edition ? isIdentityUnverified(edition.readiness) : false} />
      </ElectionsPageHead>

      <ContestsBand electionKey={electionKey} search={search} onSearchChange={onSearchChange} initialContests={initialContests} />
    </div>
  )
}

function editionFacts(edition: ElectionEdition, locale: string): readonly ElectionsFact[] {
  return [
    { label: <Trans>An raportat</Trans>, value: edition.reportedYear === null ? null : String(edition.reportedYear) },
    { label: <Trans>Tip raportat</Trans>, value: edition.reportedFamily },
    {
      label: <Trans>Data raportată</Trans>,
      value: edition.reportedDate === null ? null : <time dateTime={edition.reportedDate}>{formatReportedDate(locale, edition.reportedDate)}</time>,
      missing: <Trans>Neraportată</Trans>,
    },
    { label: <Trans>Tur raportat</Trans>, value: edition.reportedRound },
    { label: <Trans>Autoritate raportată</Trans>, value: edition.reportedAuthority },
    { label: <Trans>Cheia ediției</Trans>, value: edition.electionKey, code: true },
    {
      label: <Trans>Grupare pe platformă (neverificată)</Trans>,
      value: edition.eventKey,
      missing: <Trans>Fără grupare</Trans>,
      code: true,
    },
  ]
}

function ContestsBand({
  electionKey,
  search,
  onSearchChange,
  initialContests,
}: {
  readonly electionKey: string
  readonly search: ElectionContestsSearch
  readonly onSearchChange: (next: ElectionContestsSearch) => void
  readonly initialContests?: ElectionContestPage
}) {
  const query = useElectionContests(electionKey, search, initialContests)
  const data = query.data
  const page = search.pagina ?? 1
  const filtered = search.functie !== undefined || search.arie !== undefined || search.tur !== undefined
  const goToPage = (next: number) => {
    onSearchChange({ ...search, pagina: next > 1 ? next : undefined })
    document.getElementById(BAND_ID)?.scrollIntoView({ block: 'start' })
  }

  return (
    <HomeBand id={BAND_ID} labelledBy="elections-contests-title">
      <HubSectionHead
        titleId="elections-contests-title"
        index={t`Scrutine`}
        title={<Trans>Scrutinele ediției</Trans>}
        lede={
          <Trans>
            Fiecare scrutin din ediție, cu funcția, aria și turul exact cum le raportează sursa. Aria din sursă poate fi un loc de raportare, nu
            un teritoriu electoral verificat.
          </Trans>
        }
        // A failed read has no count to hold a place for: the list says it failed.
        aside={
          !data && query.isError ? null : (
            <ElectionsCount pending={!data || query.isPlaceholderData}>{data ? contestCount(data.total) : null}</ElectionsCount>
          )
        }
      />

      <ContestFilters
        key={JSON.stringify([search.functie ?? null, search.arie ?? null, search.tur ?? null])}
        search={search}
        onApply={(next) => onSearchChange(next)}
      />

      <ElectionsListBody
        query={query}
        page={page}
        label={t`Scrutinele ediției`}
        loadingLabel={t`Se încarcă scrutinele`}
        loadError={<Trans>Lista scrutinelor nu s-a încărcat.</Trans>}
        emptyTitle={filtered ? t`Niciun scrutin al ediției nu corespunde filtrelor.` : t`Ediția nu are scrutine în date.`}
        emptyDescription={filtered ? t`Filtrele caută eticheta exactă din sursă.` : undefined}
        onPageChange={goToPage}
        renderItem={(contest) => <ContestRow key={contest.contestKey} contest={contest} />}
      />
    </HomeBand>
  )
}

/** The API's exact total of the edition's contests for the filters, never a sum of pages. */
function contestCount(total: number): string {
  return plural(total, { one: '# scrutin', few: '# scrutine', other: '# de scrutine' })
}

/** The office, scope type and round as one form; applying starts the list again from its first page. */
function ContestFilters({ search, onApply }: { readonly search: ElectionContestsSearch; readonly onApply: (next: ElectionContestsSearch) => void }) {
  const { i18n } = useLingui()
  const [office, setOffice] = useState(search.functie ?? '')
  const [scope, setScope] = useState<string>(search.arie ?? '')
  const [round, setRound] = useState(search.tur ?? '')

  return (
    <ElectionsFilterForm
      label={t`Filtrează scrutinele`}
      active={search.functie !== undefined || search.arie !== undefined || search.tur !== undefined}
      onApply={() =>
        onApply(
          // Through the address's own parser; the typed labels go exactly as typed.
          parseElectionContestsSearch({
            functie: office === '' ? undefined : office,
            arie: scope === '' ? undefined : scope,
            tur: round === '' ? undefined : round,
          }),
        )
      }
      onClear={() => onApply({})}
    >
      <div className={FILTER_FIELD_CLASS}>
        <label htmlFor="elections-filter-office" className={FILTER_LABEL_CLASS}>
          <Trans>Funcție raportată</Trans>
        </label>
        <Input
          id="elections-filter-office"
          list="elections-filter-office-labels"
          maxLength={128}
          autoComplete="off"
          spellCheck={false}
          placeholder={t`Eticheta exactă, de ex. mayor`}
          value={office}
          onChange={(event) => setOffice(event.target.value)}
        />
        <datalist id="elections-filter-office-labels">
          {DOCUMENTED_OFFICES.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      </div>
      <div className={FILTER_FIELD_CLASS}>
        <label htmlFor="elections-filter-scope" className={FILTER_LABEL_CLASS}>
          <Trans>Tip de arie din sursă</Trans>
        </label>
        <select
          id="elections-filter-scope"
          value={scope}
          onChange={(event) => setScope(event.target.value)}
          className={cn(selectTriggerClassName, 'text-base md:text-sm')}
        >
          <option value="">{t`Oricare`}</option>
          {ELECTION_SCOPE_TYPES.map((value) => (
            <option key={value} value={value}>
              {scopeTypeLabel(i18n, value)}
            </option>
          ))}
        </select>
      </div>
      <div className={FILTER_FIELD_CLASS}>
        <label htmlFor="elections-filter-round" className={FILTER_LABEL_CLASS}>
          <Trans>Tur raportat</Trans>
        </label>
        <Input
          id="elections-filter-round"
          list="elections-filter-round-labels"
          maxLength={128}
          autoComplete="off"
          spellCheck={false}
          placeholder={t`Eticheta exactă, de ex. tur1`}
          value={round}
          onChange={(event) => setRound(event.target.value)}
        />
        <datalist id="elections-filter-round-labels">
          {DOCUMENTED_ROUNDS.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      </div>
    </ElectionsFilterForm>
  )
}

/** One contest: its scope's label (else its source key) is the link; the reported office, scope type and round under it. */
function ContestRow({ contest }: { readonly contest: ElectionContest }) {
  const { i18n } = useLingui()
  const details = [contest.reportedOffice, scopeTypeLabel(i18n, contest.scopeType), contest.reportedRound].filter(
    (value): value is string => value !== null,
  )
  return (
    <li className={ROW_CLASS}>
      <div className="min-w-0">
        <Link to="/alegeri/contest/$contestKey" params={{ contestKey: contest.contestKey }} className={cn(ROW_LINK_CLASS, 'break-words')}>
          {contest.scopeLabel ?? contest.sourceScopeKey}
        </Link>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {details.map((value, index) => (
            <Fragment key={index}>
              {index > 0 ? <span aria-hidden="true">·</span> : null}
              <span className="break-all">{value}</span>
            </Fragment>
          ))}
        </p>
      </div>
      {/* The source's scope key, which a reader copies: above the row's link so it stays selectable. */}
      {contest.scopeLabel !== null ? (
        <span className="relative z-10 shrink-0 select-text break-all font-mono text-xs text-muted-foreground sm:text-right">{contest.sourceScopeKey}</span>
      ) : null}
    </li>
  )
}
