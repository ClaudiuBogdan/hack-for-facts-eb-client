import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle, ChevronRight, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GazetteBrowseSearch, GazettePartCode } from '@/schemas/legal'
import { gazettePartCodeSchema } from '@/schemas/legal'
import {
  GAZETTE_CONTENTS_FIRST,
  fetchGazetteIssueContents,
  fetchGazetteIssuesPage,
} from '../api/legal-gazette-api'
import {
  GAZETTE_FIRST_ISSUE_YEAR,
  GAZETTE_LATEST_ISSUE_DATE,
} from '../lib/legal-coverage'
import { formatLegalDate, formatLegalNumber } from '../lib/legal-format'
import {
  legalActTypeLabel,
  legalGazettePartLabel,
  legalIssuerLabel,
} from '../lib/legal-vocabulary'
import {
  LEGISLATION_ACCENT,
  legislationAlertClassName,
  legislationLinkClassName,
  legislationStatLabelClassName,
} from '../lib/legislation-theme'
import { LegislationGazetteSkeleton } from './legislation-gazette-skeleton'
import { LegislationSection } from './legislation-section'

/** The server's own default page size — one `moIssues` page per screenful. */
const PAGE_SIZE = 20

/**
 * The newest year with data. Derived from the measured frontier constant, not
 * from the clock: discovery is frozen at 2026-07-09, so `new Date()`'s year
 * would point past the corpus as soon as January 2027 starts.
 */
const GAZETTE_LATEST_ISSUE_YEAR = Number.parseInt(
  GAZETTE_LATEST_ISSUE_DATE.slice(0, 4),
  10,
)

/** Same compact-control language as the acts directory's selects. */
const controlClassName =
  'h-11 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-base text-[var(--pnrr-fg)] shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]'

const secondaryButtonClassName =
  'inline-flex h-11 items-center rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-5 text-sm font-semibold text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] disabled:opacity-50'

/** Newest year first — the list the year `<select>` renders. */
const YEAR_OPTIONS: readonly number[] = Array.from(
  { length: GAZETTE_LATEST_ISSUE_YEAR - GAZETTE_FIRST_ISSUE_YEAR + 1 },
  (_unused, index) => GAZETTE_LATEST_ISSUE_YEAR - index,
)

type Props = {
  readonly search: GazetteBrowseSearch
}

/**
 * The gazette directory (`/legislation/gazette`) — the Monitorul Oficial tab.
 *
 * ONE section: year + part filters, the issue list for that year (the server
 * REFUSES a year-less browse, so a year is always applied), and the server's
 * own page/pageSize paging as numbered pages — honest at this scale (a year
 * holds at most ~1.9k issues), unlike the cursor-only acts directory.
 *
 * Rows with an archive index expand IN PLACE to the issue's table of
 * contents, fetched only on that click — one round-trip per opened issue,
 * never one per rendered row (the per-row round-trip was rejected as a cost
 * elsewhere in this module).
 *
 * Copy guardrails (hard, shared with the overview band): an issue may claim
 * an **official PDF exists** and nothing more — `MoIssue` has no full-text
 * flag; and only a `unique` act↔publication resolution renders a firm link
 * into the Portal corpus.
 */
export function LegislationGazetteDirectory({ search }: Props) {
  const { i18n } = useLingui()
  const navigate = useNavigate()

  // A year outside the measured corpus range drops to the default rather than
  // rendering a select that cannot display the URL's value.
  const year =
    search.year !== undefined &&
    search.year >= GAZETTE_FIRST_ISSUE_YEAR &&
    search.year <= GAZETTE_LATEST_ISSUE_YEAR
      ? search.year
      : GAZETTE_LATEST_ISSUE_YEAR
  const part = search.part
  const page = search.page ?? 1

  const issuesQuery = useQuery({
    queryKey: ['legal', 'gazette-issues', { year, part: part ?? null, page }],
    queryFn: ({ signal }) =>
      fetchGazetteIssuesPage(
        { year, ...(part !== undefined && { part }) },
        { page, pageSize: PAGE_SIZE, signal },
      ),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // The expanded issue survives paging/filtering only as an id; a row that is
  // no longer on screen simply has no panel. One open panel at a time keeps
  // the list readable and the fetch cost at one issue per click.
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null)
  useEffect(() => {
    setExpandedIssueId(null)
  }, [year, part, page])

  const setFilters = (next: { year: number; part: GazettePartCode | undefined }) => {
    // A filter change resets paging by omitting `page` — the URL is the whole
    // paging state here, so there is no in-memory reset machinery to keep in
    // sync (unlike the cursor-accumulating acts directory).
    void navigate({
      to: '/legislation/gazette',
      search: {
        year: next.year,
        ...(next.part !== undefined && { part: next.part }),
      },
      replace: true,
    })
  }

  const goToPage = (nextPage: number) => {
    // Paging pushes history (back returns to the previous page) and pins the
    // effective year, so the link cannot drift onto another year when the
    // default year advances.
    void navigate({
      to: '/legislation/gazette',
      search: {
        year,
        ...(part !== undefined && { part }),
        ...(nextPage > 1 && { page: nextPage }),
      },
    })
  }

  const items = issuesQuery.data?.items ?? []
  const total = issuesQuery.data?.total ?? null
  const hasNextPage = issuesQuery.data?.hasNextPage === true
  const pageCount =
    total !== null && total > 0 ? Math.ceil(total / PAGE_SIZE) : null
  // Past-the-end pages return empty edges with `total: 0` (verified live), so
  // "beyond page 1 and empty" means the PAGE does not exist, not the year.
  const isPastEnd = issuesQuery.isSuccess && items.length === 0 && page > 1

  const partLabel = part !== undefined ? legalGazettePartLabel(part) : null
  const countLine = issuesQuery.isSuccess
    ? isPastEnd
      ? undefined
      : total !== null
        ? total === 1
          ? partLabel !== null
            ? t`o ediție în ${partLabel}, ${year}`
            : t`o ediție în ${year}`
          : partLabel !== null
            ? t`${formatLegalNumber(total, i18n.locale)} ediții în ${partLabel}, ${year}`
            : t`${formatLegalNumber(total, i18n.locale)} ediții în ${year}`
        : t`cel puțin ${formatLegalNumber(items.length, i18n.locale)} ediții în ${year}`
    : undefined

  return (
    <div className="flex flex-col gap-6">
      {/* The staleness caveat qualifies everything below it, so it reads first.
          The date is the SAME constant the shell's "date până la" meta line
          formats — the two statements cannot drift apart. */}
      <div className={legislationAlertClassName} role="note">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pnrr-warning-fg)]"
          aria-hidden
        />
        <p className="text-sm font-medium text-[var(--pnrr-fg)]">
          <Trans>
            Cea mai recentă ediție din corpus a apărut pe{' '}
            {formatLegalDate(GAZETTE_LATEST_ISSUE_DATE, i18n.locale)}.
            Preluarea edițiilor noi este oprită de la acea dată, deci numerele
            publicate ulterior în Monitorul Oficial nu apar încă aici.
          </Trans>
        </p>
      </div>

      <LegislationSection
        id="gazette-directory-heading"
        title={t`Edițiile Monitorului Oficial`}
        {...(countLine !== undefined && { description: countLine })}
        bodyClassName="p-0"
        footnote={
          <Trans>
            Marcajul se referă doar la existența PDF-ului oficial, nu la
            disponibilitatea textului. Filtrele și pagina se păstrează în
            adresă — o vedere filtrată este un link pe care îl poți trimite.
          </Trans>
        }
      >
        <form
          aria-label={t`Filtre`}
          className="flex flex-wrap items-end gap-x-5 gap-y-4 border-b border-[var(--pnrr-subtle)] px-5 py-4 sm:px-6"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="flex flex-col gap-1.5">
            <span className={legislationStatLabelClassName}>
              <Trans>Anul</Trans>
            </span>
            <select
              className={cn(controlClassName, 'w-32')}
              value={year}
              onChange={(event) =>
                setFilters({
                  year: Number.parseInt(event.target.value, 10),
                  part,
                })
              }
            >
              {YEAR_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={legislationStatLabelClassName}>
              <Trans>Partea</Trans>
            </span>
            <select
              className={cn(controlClassName, 'min-w-[13rem]')}
              value={part ?? ''}
              onChange={(event) => {
                const parsed = gazettePartCodeSchema.safeParse(event.target.value)
                setFilters({
                  year,
                  part: parsed.success ? parsed.data : undefined,
                })
              }}
            >
              <option value="">{t`toate părțile`}</option>
              {gazettePartCodeSchema.options.map((code) => (
                <option key={code} value={code}>
                  {legalGazettePartLabel(code)}
                </option>
              ))}
            </select>
          </label>
        </form>

        {issuesQuery.isLoading && <LegislationGazetteSkeleton />}

        {issuesQuery.isError && (
          <div className="px-5 py-6 sm:px-6">
            <p className="text-sm text-[var(--pnrr-fg)]">
              <Trans>Nu am putut încărca edițiile Monitorului Oficial.</Trans>
            </p>
            <button
              type="button"
              className={cn(secondaryButtonClassName, 'mt-3')}
              onClick={() => void issuesQuery.refetch()}
            >
              <Trans>Încearcă din nou</Trans>
            </button>
          </div>
        )}

        {issuesQuery.isSuccess && items.length === 0 && !isPastEnd && (
          <p className="px-5 py-6 text-sm text-[var(--pnrr-muted)] sm:px-6">
            <Trans>
              Nicio ediție nu corespunde filtrelor. Părțile III–VII au acoperire
              doar pentru anii recenți; Partea I începe cu 22 decembrie 1989.
            </Trans>
          </p>
        )}

        {isPastEnd && (
          <div className="px-5 py-6 sm:px-6">
            <p className="text-sm text-[var(--pnrr-muted)]">
              <Trans>Această pagină nu există pentru filtrele alese.</Trans>
            </p>
            <button
              type="button"
              className={cn(secondaryButtonClassName, 'mt-3')}
              onClick={() => goToPage(1)}
            >
              <Trans>Înapoi la prima pagină</Trans>
            </button>
          </div>
        )}

        {issuesQuery.isSuccess && items.length > 0 && (
          <ul aria-label={t`Ediții`}>
            {items.map((issue) => {
              const hasPdf = issue.hasEmonitorLink && issue.pdfUrl !== null
              const isExpanded = expandedIssueId === issue.moIssueId
              const panelId = `gazette-issue-contents-${issue.moIssueId}`

              const issueHeading = (
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-base font-semibold text-[var(--pnrr-fg)]">
                    <span
                      className="mr-1.5 text-[0.7rem] font-bold uppercase tracking-wider"
                      style={{ color: LEGISLATION_ACCENT }}
                    >
                      {legalGazettePartLabel(issue.partCode)}
                    </span>{' '}
                    <Trans>nr. {issue.issueLabel}</Trans>
                  </span>
                  <span className="text-xs text-[var(--pnrr-muted)]">
                    {issue.issueDate !== null
                      ? formatLegalDate(issue.issueDate, i18n.locale)
                      : issue.issueYear}
                    {' · '}
                    {hasPdf ? (
                      <Trans>PDF oficial disponibil</Trans>
                    ) : (
                      <Trans>doar coordonate de publicare</Trans>
                    )}
                    {!issue.hasArchiveIndex && (
                      <>
                        {' · '}
                        <Trans>fără cuprins în arhivă</Trans>
                      </>
                    )}
                  </span>
                </span>
              )

              return (
                <li
                  key={issue.moIssueId}
                  className="border-b border-[var(--pnrr-subtle)] last:border-b-0"
                >
                  <div className="flex items-center gap-4 px-5 py-3 sm:px-6">
                    {issue.hasArchiveIndex ? (
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-controls={panelId}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
                        onClick={() =>
                          setExpandedIssueId(isExpanded ? null : issue.moIssueId)
                        }
                      >
                        <ChevronRight
                          className={cn(
                            'h-4 w-4 shrink-0 text-[var(--pnrr-muted)] transition-transform',
                            isExpanded && 'rotate-90',
                          )}
                          aria-hidden
                        />
                        {issueHeading}
                        <span className="sr-only">
                          {isExpanded ? t`ascunde cuprinsul` : t`arată cuprinsul`}
                        </span>
                      </button>
                    ) : (
                      <span className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="h-4 w-4 shrink-0" aria-hidden />
                        {issueHeading}
                      </span>
                    )}

                    {issue.pdfUrl !== null && (
                      <a
                        href={issue.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          legislationLinkClassName,
                          'inline-flex shrink-0 items-center gap-1',
                        )}
                      >
                        <span className="hidden sm:inline">
                          <Trans>deschide pe monitoruloficial.ro</Trans>
                        </span>
                        <span className="sm:hidden">
                          <Trans>deschide</Trans>
                        </span>
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    )}
                  </div>

                  {isExpanded && (
                    <div
                      id={panelId}
                      className="border-t border-[var(--pnrr-subtle)] px-5 py-4 sm:px-6 sm:pl-13"
                    >
                      <GazetteIssueContentsPanel moIssueId={issue.moIssueId} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {issuesQuery.isSuccess && items.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--pnrr-subtle)] px-5 py-4 sm:px-6">
            <p className="text-sm text-[var(--pnrr-muted)]">
              {pageCount !== null ? (
                <Trans>
                  pagina {formatLegalNumber(page, i18n.locale)} din{' '}
                  {formatLegalNumber(pageCount, i18n.locale)}
                </Trans>
              ) : (
                <Trans>pagina {formatLegalNumber(page, i18n.locale)}</Trans>
              )}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                className={secondaryButtonClassName}
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                <Trans>Pagina anterioară</Trans>
              </button>
              <button
                type="button"
                className={secondaryButtonClassName}
                disabled={!hasNextPage}
                onClick={() => goToPage(page + 1)}
              >
                <Trans>Pagina următoare</Trans>
              </button>
            </div>
          </div>
        )}
      </LegislationSection>
    </div>
  )
}

/**
 * The archive index of ONE issue, fetched when its row expands and cached by
 * the query client — collapsing and re-expanding does not refetch.
 *
 * Only `resolution === 'unique'` rows link into the Portal corpus, the same
 * bar `ActReferencesBand` applies to citation edges; `ambiguous` and
 * `unmatched` publications stay standalone titles.
 */
function GazetteIssueContentsPanel({
  moIssueId,
}: {
  readonly moIssueId: string
}) {
  const { i18n } = useLingui()
  const contentsQuery = useQuery({
    queryKey: ['legal', 'gazette-issue-contents', moIssueId],
    queryFn: ({ signal }) => fetchGazetteIssueContents(moIssueId, { signal }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  if (contentsQuery.isLoading) {
    return (
      <p role="status" className="text-sm text-[var(--pnrr-muted)]">
        <Trans>Se încarcă cuprinsul…</Trans>
      </p>
    )
  }

  if (contentsQuery.isError || contentsQuery.data === undefined) {
    return (
      <p role="status" className="text-sm text-[var(--pnrr-muted)]">
        <Trans>Cuprinsul nu s-a încărcat — închide și redeschide ediția.</Trans>
      </p>
    )
  }

  const { items, hasMore } = contentsQuery.data

  if (items.length === 0) {
    // An archive index can exist with zero recorded publications — say so
    // rather than rendering an empty region.
    return (
      <p role="status" className="text-sm text-[var(--pnrr-muted)]">
        <Trans>Nicio publicație înregistrată în cuprinsul acestei ediții.</Trans>
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p role="status" className="sr-only">
        <Trans>{items.length} publicații în cuprins</Trans>
      </p>
      <ul aria-label={t`Publicații`} className="flex flex-col gap-3">
        {items.map((entry) => {
          const metaParts: string[] = []
          if (entry.actType !== null) {
            const instrument = legalActTypeLabel(entry.actType)
            metaParts.push(
              entry.actNumberNorm !== null
                ? entry.actYear !== null
                  ? `${instrument} nr. ${entry.actNumberNorm}/${entry.actYear}`
                  : `${instrument} nr. ${entry.actNumberNorm}`
                : instrument,
            )
          }
          if (entry.issuerSlug !== null) {
            metaParts.push(legalIssuerLabel(entry.issuerSlug))
          }
          if (entry.actDate !== null) {
            metaParts.push(formatLegalDate(entry.actDate, i18n.locale))
          }

          return (
            <li key={entry.moActKey} className="flex flex-col gap-0.5">
              <span className="text-sm text-[var(--pnrr-fg)]">
                {entry.title ?? <Trans>publicație fără titlu înregistrat</Trans>}
              </span>
              <span className="text-xs text-[var(--pnrr-muted)]">
                {metaParts.join(' · ')}
                {entry.resolution === 'unique' && entry.act !== null && (
                  <>
                    {metaParts.length > 0 && ' · '}
                    <Link
                      to="/legislation/acts/$actId"
                      params={{ actId: entry.act.actId }}
                      className={cn(legislationLinkClassName, 'text-xs')}
                    >
                      {entry.act.displayCitation}
                    </Link>
                  </>
                )}
              </span>
            </li>
          )
        })}
      </ul>
      {hasMore && (
        <p className="text-xs text-[var(--pnrr-muted)]">
          <Trans>
            primele {GAZETTE_CONTENTS_FIRST} publicări din cuprins — lista
            completă rămâne în PDF-ul oficial.
          </Trans>
        </p>
      )}
    </div>
  )
}
