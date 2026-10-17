import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import type {
  CompanyMainActivity,
  CompanyMainActivityEvidenceEntry,
  CompanyMainActivityHistoryKind,
  CompanyMainActivityOutcome,
} from '@/schemas/private-company-main-activity'
import { readCompanyAnalysisRelease } from '../../api/company-analytics-api'
import { isMainActivityMovedError } from '../../api/private-company-api.live'
import {
  MainActivityHistoryVisibilityChangedError,
  removeMainActivityHistory,
  resetMainActivityHistory,
  useCompanyMainActivityHistory,
  usePurgeMainActivityHistory,
} from '../../hooks/use-company-main-activity-history'
import { privateCompanyProfileQueryKey } from '../../hooks/use-private-company-profile'
import { mainActivityAnalysisSearch } from '../../lib/company-analytics-main-activity'
import { companyAnalyticsKeys } from '../../lib/company-analytics-keys'
import { useRefusedReleases } from '../../lib/company-release-refusals'
import {
  mainActivityIdentity,
  mainHistoryShown,
  mainIntegrityHeld,
  mainInterpretationWithheld,
  mainKeyText,
  mainShownAsCurrent,
} from '../../lib/company-main-activity-model'
import {
  anafTokenText,
  anafWithdrawnText,
  derivedAtText,
  historyAnafWithdrawnText,
  historyMovedText,
  mainAnafOnlyHeadline,
  mainAssumptionText,
  mainBasisNotes,
  mainCounterpartText,
  mainCurrentnessNote,
  mainIntegrityHeldHeadline,
  mainIntegrityHeldOnrcUnavailableHeadline,
  mainCustodyText,
  mainDatesText,
  mainDerivedText,
  mainHistoryNoteText,
  mainKickerText,
  mainNoAssignmentText,
  mainOutcomeStatusText,
  mainPendingText,
  mainStatusNote,
  mainUnreadableText,
  mainUnresolvedHeadline,
  mainWithdrawnHeadline,
  mainWithheldHeadline,
  observedAtText,
  onrcWithdrawnText,
  statusDateText,
} from '../../lib/company-main-activity-text'
import type { CompanyProfileModel } from '../../lib/company-profile-model'

/**
 * „Activitate principală (presupusă după ANAF)": ANAF's fiscal CAEN code,
 * assumed to be the main activity, with its ONRC counterpart when one
 * matches — the key's revision is ONRC's, its label frozen when derived — or
 * why there is none. Shown above the derived selection, which keeps its own
 * title and meaning. An older API (no main activity) and one that cannot read
 * the main surfaces show nothing here: nothing is inferred. A history row
 * reporting ANAF's source withdrawn is passed up (`onAnafWithdrawn`, with
 * the assignment's identity), so the page hides every ANAF field at once; a
 * history answering that the company is no longer public is passed up too
 * (`onCompanyNotPublic`): the owning company's visibility refusal.
 */
export function CompanyMainActivity({
  model,
  onAnafWithdrawn,
  onCompanyNotPublic,
  className,
}: {
  readonly model: CompanyProfileModel
  readonly onAnafWithdrawn: (identity: string) => void
  readonly onCompanyNotPublic: () => void
  readonly className?: string
}) {
  const view = model.assumedMain
  const cui = model.profile.cui ?? ''
  const scopeKey = model.registry.registry.scopeKey
  // Whatever is shown, history read under another assignment (or none) is dropped.
  usePurgeMainActivityHistory(cui, mainActivityIdentity(view), scopeKey)
  switch (view.kind) {
    case 'not_served':
    case 'unavailable':
    case 'refused':
      return null
    case 'unreadable':
    case 'no_assignment':
      return (
        <div className={cn('border-l-2 border-muted-foreground pl-4', className)} data-testid="company-main-activity">
          <MonoLabel className="block text-muted-foreground">{mainKickerText()}</MonoLabel>
          <p role={view.kind === 'unreadable' ? 'status' : undefined} className="mt-2 text-sm text-muted-foreground">
            {view.kind === 'unreadable' ? mainUnreadableText() : mainNoAssignmentText()}
          </p>
        </div>
      )
    case 'assigned':
      return (
        <AssignedMainActivity
          activity={view.activity}
          cui={cui}
          scopeKey={scopeKey}
          history={mainHistoryShown(view)}
          onAnafWithdrawn={onAnafWithdrawn}
          onCompanyNotPublic={onCompanyNotPublic}
          className={className}
        />
      )
  }
}

/** ANAF's source withdrawn says nothing of a code, whatever the currentness; a held source or a withheld interpretation names nothing. */
function headlineOf(activity: CompanyMainActivity): string | null {
  if (activity.anafWithdrawn || activity.currentness === 'SOURCE_WITHDRAWN') return mainWithdrawnHeadline()
  if (activity.currentness === 'ONRC_UNAVAILABLE') return mainIntegrityHeld(activity) ? mainIntegrityHeldOnrcUnavailableHeadline() : mainAnafOnlyHeadline(activity)
  if (mainIntegrityHeld(activity)) return mainIntegrityHeldHeadline()
  if (mainInterpretationWithheld(activity)) return mainWithheldHeadline()
  return mainCounterpartText(activity) ?? mainUnresolvedHeadline(activity)
}

function AssignedMainActivity({
  activity,
  cui,
  scopeKey,
  history,
  onAnafWithdrawn,
  onCompanyNotPublic,
  className,
}: {
  readonly activity: CompanyMainActivity
  readonly cui: string
  readonly scopeKey: string
  readonly history: boolean
  readonly onAnafWithdrawn: (identity: string) => void
  readonly onCompanyNotPublic: () => void
  readonly className?: string
}) {
  const headline = headlineOf(activity)
  const basis = activity.currentness === 'CURRENT' || activity.currentness === 'PENDING_REFRESH' ? mainBasisNotes(activity) : []
  const status = activity.currentness === 'CURRENT' || activity.currentness === 'PENDING_REFRESH' ? mainStatusNote(activity) : null
  const currentness = mainCurrentnessNote(activity)
  const dates = mainDatesText(activity)
  const custody = mainCustodyText(activity.anaf?.evidenceCustody ?? null)
  // Marked as the current main activity only when CURRENT with an exact key: never a pending, withheld or withdrawn one.
  const current = mainShownAsCurrent(activity)
  return (
    <div
      className={cn('border-l-2 pl-4', current ? 'border-primary' : 'border-muted-foreground', className)}
      data-testid="company-main-activity"
      data-current={current ? 'true' : 'false'}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <MonoLabel className={cn('block', current ? 'text-primary' : 'text-muted-foreground')}>{mainKickerText()}</MonoLabel>
        {activity.currentness === 'PENDING_REFRESH' ? (
          <span className="rounded-sm bg-status-partial-bg px-1.5 py-0.5 text-xs font-medium text-status-partial-fg" data-testid="company-main-activity-pending">
            {mainPendingText()}
          </span>
        ) : null}
      </div>
      {headline ? (
        <p className="mt-2 text-base font-semibold leading-snug text-foreground" data-testid="company-main-activity-headline">
          {headline}
        </p>
      ) : null}
      {basis.length > 0 ? (
        <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground" data-testid="company-main-activity-basis">
          {basis.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
      {status ? <p className="mt-1 text-sm text-muted-foreground">{status}</p> : null}
      {currentness ? (
        <p className="mt-2 text-sm text-foreground" data-testid="company-main-activity-currentness">
          {currentness}
        </p>
      ) : null}
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{mainAssumptionText()}</p>
      {dates ? (
        <MonoLabel className="mt-3 block leading-relaxed text-muted-foreground" data-testid="company-main-activity-dates">
          {dates}
        </MonoLabel>
      ) : null}
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {mainDerivedText(activity)}
        {custody ? ` ${custody}` : ''}
      </p>
      <MainActivityAnalysisLink activity={activity} />
      {history && cui !== '' ? <MainActivityHistory cui={cui} activity={activity} scopeKey={scopeKey} onAnafWithdrawn={onAnafWithdrawn} onCompanyNotPublic={onCompanyNotPublic} /> : null}
    </div>
  )
}

/**
 * The analysis of the companies with the same main activity — only where the
 * active release lists MAIN_ACTIVITY and pins exactly this assignment's
 * content (edition and content epoch): otherwise no link, never a silently
 * different cohort. The release is read in the browser only, for a current
 * assignment with a key; until it answers, there is no link.
 */
function MainActivityAnalysisLink({ activity }: { readonly activity: CompanyMainActivity }) {
  const linkable = mainShownAsCurrent(activity)
  const refused = useRefusedReleases()
  const release = useQuery({
    queryKey: companyAnalyticsKeys.release(null),
    queryFn: ({ signal }) => readCompanyAnalysisRelease(null, signal),
    staleTime: 10 * 60 * 1000,
    enabled: linkable,
  })
  const data = release.data
  if (!linkable || !data || release.isError || refused.has(data.release.releaseId)) return null
  const search = mainActivityAnalysisSearch(data, activity)
  if (search === null) return null
  return (
    <Link to="/companies/analytics" search={search} className="mt-3 inline-flex min-h-9 items-center text-sm font-medium text-primary underline-offset-4 hover:underline" data-testid="company-main-activity-analysis">
      <Trans>Firmele cu aceeași activitate principală presupusă, în analiză</Trans>
    </Link>
  )
}

/**
 * The history behind the assignment, opened on demand: derived outcomes or
 * the source observations behind them, newest first, a bounded page at a
 * time. Derivation and observation times, never legal effective dates; a
 * withdrawn source is said as withdrawn, never as an empty value. The
 * newest entry must be the assignment the block shows (its resolution, or
 * its support for the evidence): a history ahead of it is not shown beside
 * it — the profile is read again, once per assignment.
 *
 * ANAF's history is public only while the company's fiscal row is: one row
 * of any page reporting `anafWithdrawn` withdraws every row's ANAF fields at
 * once, and the profile's (`onAnafWithdrawn`); every page read is dropped
 * and the profile and the history are read again — ids unchanged prove no
 * visibility. ONRC's editions are withdrawn one by one (`onrcWithdrawn` per
 * row): another row's published ONRC fields stay. A row read again with
 * another visibility, or a main activity that moved during the read, is a
 * failure to retry — never an older API, never an empty history. A fresh
 * answer that the company is no longer a public directory company
 * (`not_public`) is the owning company's visibility refusal: passed up at
 * once (`onCompanyNotPublic` — the main block and its flags go, the page's
 * privacy path hides the answer) after every history page of the company is
 * removed and any read in flight cancelled (`removeMainActivityHistory`, here
 * and again in the page's privacy path: the page unmounts this subtree, so no
 * later render of it can be relied on), and the profile is read again; never
 * worded as a withdrawn ANAF source or an older API.
 */
function MainActivityHistory({
  cui,
  activity,
  scopeKey,
  onAnafWithdrawn,
  onCompanyNotPublic,
}: {
  readonly cui: string
  readonly activity: CompanyMainActivity
  readonly scopeKey: string
  readonly onAnafWithdrawn: (identity: string) => void
  readonly onCompanyNotPublic: () => void
}) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<CompanyMainActivityHistoryKind>('OUTCOMES')
  const identity = activity.cacheKey
  const query = useCompanyMainActivityHistory({ cui, kind, identity, scopeKey, enabled: open })
  const pages = query.data?.pages ?? []
  const notPublic = pages.some((page) => page.status === 'not_public')
  const loaded = pages.flatMap((page) => (page.status === 'page' ? [page.page] : []))
  const unavailable = loaded.some((page) => page.state === 'UNAVAILABLE')
  const outcomes = loaded.flatMap((page) => page.outcomes)
  const evidence = loaded.flatMap((page) => page.evidence)
  const empty = kind === 'OUTCOMES' ? outcomes.length === 0 : evidence.length === 0
  const newest = kind === 'OUTCOMES' ? outcomes[0]?.resolutionId : evidence[0]?.supportId
  const ahead = newest !== undefined && newest !== (kind === 'OUTCOMES' ? activity.resolutionId : activity.supportId)
  const visibilityChanged = query.error instanceof MainActivityHistoryVisibilityChangedError
  // A row of the pages shown, or of the page whose visibility change failed the read, reports ANAF withdrawn.
  const withdrawnRow =
    outcomes.some((row) => row.anafWithdrawn) || evidence.some((row) => row.anafWithdrawn) || (query.error instanceof MainActivityHistoryVisibilityChangedError && query.error.anafWithdrawn)
  const anafHidden = activity.anafWithdrawn || withdrawnRow
  const moved = query.isError && (visibilityChanged || isMainActivityMovedError(query.error))
  // Unknown to the profile yet: the withdrawal is passed up at once (the profile hides its ANAF fields too).
  const withdrawalUnseen = withdrawnRow && !activity.anafWithdrawn
  const client = useQueryClient()
  const reread = useRef<string | null>(null)
  useEffect(() => {
    if (!ahead || reread.current === identity) return
    reread.current = identity
    void client.invalidateQueries({ queryKey: privateCompanyProfileQueryKey(cui), exact: true })
  }, [ahead, identity, client, cui])
  useEffect(() => {
    if (withdrawalUnseen) onAnafWithdrawn(identity)
  }, [withdrawalUnseen, identity, onAnafWithdrawn])
  useEffect(() => {
    if (!notPublic) return
    // Purged here, before the owner is told: its privacy path may unmount this subtree before any later render could.
    removeMainActivityHistory(client, cui)
    onCompanyNotPublic()
  }, [notPublic, onCompanyNotPublic, client, cui])
  // Each reason reads the profile again once per assignment; the pages are dropped (and the open one read again) for a
  // visibility the client learned of, never left beside it. A moved main activity was already retried as it came.
  const revalidated = useRef(new Set<string>())
  const reason = notPublic ? 'not_public' : withdrawalUnseen ? 'withdrawn' : visibilityChanged ? 'visibility' : moved ? 'moved' : null
  useEffect(() => {
    if (reason === null || revalidated.current.has(`${identity}:${reason}`)) return
    revalidated.current.add(`${identity}:${reason}`)
    // A company no longer public: its pages were already removed (removeMainActivityHistory above), not read again.
    if (reason === 'withdrawn' || reason === 'visibility') void resetMainActivityHistory(client, cui)
    void client.invalidateQueries({ queryKey: privateCompanyProfileQueryKey(cui), exact: true })
  }, [reason, identity, client, cui])
  // An API from before the history root: no history at all, never an inferred one.
  if (pages.some((page) => page.status === 'unsupported')) return null
  const panelId = `company-main-activity-history-${cui}`
  return (
    <div className="mt-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-h-9 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline"
      >
        {open ? <Trans>Ascunde istoricul</Trans> : <Trans>Istoricul activității principale presupuse</Trans>}
      </button>
      {open ? (
        <div id={panelId} className="mt-2 border-l pl-3" data-testid="company-main-activity-history">
          <p className="text-xs leading-relaxed text-muted-foreground">{mainHistoryNoteText()}</p>
          <div role="group" aria-label={mainKickerText()} className="mt-2 flex gap-3 text-xs">
            {(['OUTCOMES', 'EVIDENCE'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={kind === option}
                onClick={() => setKind(option)}
                className={cn('min-h-8 underline-offset-4 hover:underline', kind === option ? 'font-semibold text-foreground' : 'text-muted-foreground')}
              >
                {option === 'OUTCOMES' ? <Trans>Rezultate</Trans> : <Trans>Observații din sursă</Trans>}
              </button>
            ))}
          </div>
          {anafHidden ? (
            <p role="status" className="mt-2 text-sm text-foreground" data-testid="company-main-activity-history-anaf-withdrawn">
              {historyAnafWithdrawnText()}
            </p>
          ) : null}
          {query.isPending ? (
            <p className="mt-2 text-sm text-muted-foreground">
              <Trans>Se încarcă istoricul…</Trans>
            </p>
          ) : moved ? (
            <HistoryFailed text={historyMovedText()} onRetry={() => void resetMainActivityHistory(client, cui)} />
          ) : query.isError && loaded.length === 0 ? (
            <HistoryFailed onRetry={() => void query.refetch()} />
          ) : notPublic ? (
            <p className="mt-2 text-sm text-muted-foreground">
              <Trans>Fără istoric public pentru această firmă.</Trans>
            </p>
          ) : unavailable ? (
            <p className="mt-2 text-sm text-muted-foreground">
              <Trans>Istoricul nu e disponibil acum.</Trans>
            </p>
          ) : empty ? (
            <p className="mt-2 text-sm text-muted-foreground">
              <Trans>Nicio înregistrare în istoric.</Trans>
            </p>
          ) : ahead ? (
            <p role="status" className="mt-2 text-sm text-muted-foreground" data-testid="company-main-activity-history-ahead">
              <Trans>Istoricul are o înregistrare mai nouă decât activitatea afișată; profilul se citește din nou.</Trans>
            </p>
          ) : (
            <ol className="mt-2 space-y-2">
              {kind === 'OUTCOMES'
                ? outcomes.map((outcome) => <OutcomeRow key={outcome.resolutionId} outcome={outcome} anafHidden={anafHidden} />)
                : evidence.map((entry) => <EvidenceRow key={entry.supportId} entry={entry} anafHidden={anafHidden} />)}
            </ol>
          )}
          {query.isError && !moved && loaded.length > 0 ? <HistoryFailed onRetry={() => void query.fetchNextPage()} /> : null}
          {query.hasNextPage && !query.isError && !ahead ? (
            <button
              type="button"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
              className="mt-2 inline-flex min-h-9 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline disabled:opacity-60"
            >
              <Trans>Mai multe</Trans>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function HistoryFailed({ text, onRetry }: { readonly text?: string; readonly onRetry: () => void }) {
  return (
    <p role="status" className="mt-2 text-sm text-muted-foreground" data-testid="company-main-activity-history-failed">
      {text ?? <Trans>Istoricul nu a putut fi citit.</Trans>}{' '}
      <button type="button" onClick={onRetry} className="font-medium text-foreground underline underline-offset-4">
        <Trans>Reîncearcă</Trans>
      </button>
    </p>
  )
}

function Withdrawn({ anaf, onrc }: { readonly anaf: boolean; readonly onrc: boolean }) {
  const parts = [...(anaf ? [anafWithdrawnText()] : []), ...(onrc ? [onrcWithdrawnText()] : [])]
  return parts.length > 0 ? <span className="text-foreground"> · {parts.join(' · ')}</span> : null
}

/**
 * A history row's ANAF fields are hidden when it, or any row of the company
 * (or the profile), reports ANAF's source withdrawn — and with them its
 * status and selected key: the main key is derived from ANAF and ONRC both,
 * so it is shown only while the row's ANAF is public and its ONRC edition
 * published (`onrcWithdrawn` per row).
 */
function OutcomeRow({ outcome, anafHidden }: { readonly outcome: CompanyMainActivityOutcome; readonly anafHidden: boolean }) {
  const hidden = anafHidden || outcome.anafWithdrawn
  const anaf = hidden ? null : outcome.anaf
  const token = anaf ? anafTokenText(anaf) : null
  const key = hidden || outcome.onrcWithdrawn ? null : outcome.resolved
  return (
    <li className="text-sm" data-testid="company-main-activity-outcome">
      <MonoLabel className="block text-muted-foreground">{derivedAtText(outcome.derivedAt)}</MonoLabel>
      {/* The status interprets ANAF's code: said only while ANAF's fields are. */}
      {hidden ? null : <span className="text-foreground">{mainOutcomeStatusText(outcome.status)}</span>}
      {key ? <span className="text-muted-foreground"> · {`${mainKeyText(key)} — ${key.label}`}</span> : null}
      {token !== null ? <span className="text-muted-foreground"> · {token}</span> : null}
      <Withdrawn anaf={hidden} onrc={outcome.onrcWithdrawn} />
    </li>
  )
}

function EvidenceRow({ entry, anafHidden }: { readonly entry: CompanyMainActivityEvidenceEntry; readonly anafHidden: boolean }) {
  const anaf = anafHidden || entry.anafWithdrawn ? null : entry.anaf
  const token = anaf ? anafTokenText(anaf) : null
  const custody = mainCustodyText(anaf?.evidenceCustody ?? null)
  return (
    <li className="text-sm" data-testid="company-main-activity-evidence">
      <MonoLabel className="block text-muted-foreground">{observedAtText(entry.evidenceAt)}</MonoLabel>
      {anaf ? (
        <span className="text-foreground">
          {statusDateText(anaf.statusDate)}
          {token !== null ? ` · ${token}` : ''}
        </span>
      ) : null}
      {custody ? <span className="block text-xs text-muted-foreground">{custody}</span> : null}
      <Withdrawn anaf={anafHidden || entry.anafWithdrawn} onrc={entry.onrcWithdrawn} />
    </li>
  )
}
