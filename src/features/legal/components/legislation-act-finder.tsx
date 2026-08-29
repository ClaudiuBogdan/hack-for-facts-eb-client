import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { LegalFinderSearch } from '@/schemas/legal'
import {
  LEGAL_SEMANTIC_UNAVAILABLE_CAVEAT,
  legalActStatusSchema,
} from '@/schemas/legal'
import { fetchLegalSearch } from '../api/legal-search-api'
import { resolveLegalActs } from '../api/legal-resolve-api'
import { parseLegalCitationShape } from '../lib/legal-citation'
import { formatLegalDate, formatLegalNumber } from '../lib/legal-format'
import { legalActTypeLabel, legalIssuerLabel } from '../lib/legal-vocabulary'
import {
  LEGISLATION_ACCENT,
  legislationAlertClassName,
  legislationExampleChipClassName,
  legislationFieldClassName,
  legislationLinkClassName,
  legislationRowClassName,
  legislationStatLabelClassName,
  legislationSubmitClassName,
} from '../lib/legislation-theme'
import { LegalStatusBadge } from './legal-status-badge'
import { LegislationSearchSkeleton } from './legislation-search-skeleton'
import { LegislationSection } from './legislation-section'

/** Queries the tab can actually answer today — every chip is a measured hit. */
const EXAMPLES = [
  'Legea 53/2003',
  'Codul muncii',
  'Codul fiscal',
  'OUG 57/2019',
] as const

const secondaryButtonClassName =
  'inline-flex h-11 items-center rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-5 text-sm font-semibold text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] disabled:opacity-50'

type Props = {
  readonly search: LegalFinderSearch
}

/**
 * The Caută tab (`/legislation/search`) — a citation and name finder that
 * states plainly it is NOT full-text search.
 *
 * Measured on production 2026-08-26: `legalSearch` answers citations ("Legea
 * 53/2003" → one exact act, not degraded) and act names ("codul muncii" →
 * lexical matches over display citations), while genuine text phrases
 * ("concediu de odihna", "salariul minim", "contract individual de munca")
 * return NOTHING — the server says so via the `semantic search unavailable`
 * caveat. So the single most important thing here is the empty state: a
 * phrase query must never get a bare "no results" implying the law is absent
 * — it gets told the corpus is not yet searchable by phrase. The other
 * honesty surfaces: `actsTotal: null` renders as "unknown", never 0; every
 * server caveat except the English sentinel renders VERBATIM in the footnote
 * (the published-form warning is the server's own wording, not ours); the
 * answering engine is named.
 *
 * Two lanes run per submitted query, both URL-driven (`q` is a shareable
 * link): `legalSearch` (acts channel — sections are a name echo today, see
 * the live adapter) and `legalResolve(dim:"act")`, whose job is AMBIGUITY —
 * 'codul fiscal' genuinely names two acts and the reader picks; the resolver
 * strip also rescues a query the search lane zeroed (the resolver is not
 * status-gated, so a repealed act still gets named). The server's
 * `includeHistorical` default (false) hides abrogated / out-of-force acts
 * even from exact citations, so the toggle — and the retry link on every
 * empty state — widen it explicitly.
 */
export function LegislationActFinder({ search }: Props) {
  const { i18n } = useLingui()
  const navigate = useNavigate()

  const q = search.q?.trim() ?? ''
  const hasQuery = q.length > 0
  const historical = search.historical === true

  // The box mirrors the URL (back/forward, shared links) but is edited
  // locally until submit — typing must not fire requests or rewrite history.
  const [draft, setDraft] = useState(q)
  useEffect(() => setDraft(q), [q])

  const runSearch = (
    nextQ: string,
    nextHistorical: boolean,
    options: { readonly replace?: boolean } = {},
  ) => {
    void navigate({
      to: '/legislation/search',
      search: {
        ...(nextQ.length > 0 && { q: nextQ }),
        ...(nextHistorical && { historical: true as const }),
      },
      ...(options.replace === true && { replace: true }),
    })
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = draft.trim()
    if (trimmed.length === 0) return
    runSearch(trimmed, historical)
  }

  const searchQuery = useQuery({
    queryKey: ['legal', 'finder-search', q, historical],
    queryFn: ({ signal }) => fetchLegalSearch(q, { historical, signal }),
    enabled: hasQuery,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // The resolver lane is auxiliary: it must never take the page down, so it
  // does not retry and its error state renders as silence, not as a wall.
  const resolveQuery = useQuery({
    queryKey: ['legal', 'finder-resolve', q],
    queryFn: ({ signal }) => resolveLegalActs(q, { signal }),
    enabled: hasQuery,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const result = searchQuery.data
  const acts = result?.acts ?? []
  const resolveHits = resolveQuery.data ?? []
  const semanticUnavailable =
    result?.caveats.includes(LEGAL_SEMANTIC_UNAVAILABLE_CAVEAT) ?? false
  // Every other caveat renders verbatim — the sentinel alone is translated
  // into the phrase-honesty messaging (it is a machine marker, not prose).
  const verbatimCaveats =
    result?.caveats.filter(
      (caveat) => caveat !== LEGAL_SEMANTIC_UNAVAILABLE_CAVEAT,
    ) ?? []
  const isCitationShaped = parseLegalCitationShape(q) !== null
  const emptyResult = searchQuery.isSuccess && acts.length === 0
  // The strip earns its place twice: a name that maps to SEVERAL acts is an
  // ambiguity the reader must decide (never auto-picked), and a resolver hit
  // on a zeroed search is a rescue (typically an act the historical gate
  // hid). One resolver hit that merely repeats the top result stays silent.
  const showStrip =
    searchQuery.isSuccess &&
    (resolveHits.length >= 2 || (resolveHits.length > 0 && emptyResult))

  const countLine =
    searchQuery.isSuccess && acts.length > 0
      ? result?.actsTotal == null
        ? acts.length === 1
          ? t`o potrivire afișată — numărul total nu este cunoscut`
          : t`${formatLegalNumber(acts.length, i18n.locale)} potriviri afișate — numărul total nu este cunoscut`
        : result.totalsExhaustive
          ? result.actsTotal === 1
            ? t`o potrivire`
            : t`${formatLegalNumber(result.actsTotal, i18n.locale)} potriviri`
          : t`cel puțin ${formatLegalNumber(result.actsTotal, i18n.locale)} potriviri`
      : undefined

  const historicalRetry = !historical && (
    <button
      type="button"
      className={cn(legislationLinkClassName, 'self-start text-left')}
      onClick={() => runSearch(q, true)}
    >
      <Trans>Caută și în actele abrogate sau ieșite din vigoare</Trans>
    </button>
  )

  return (
    <LegislationSection
      id="legislation-finder-heading"
      title={t`Caută în legislație`}
      {...(countLine !== undefined && { description: countLine })}
      bodyClassName="p-0"
      {...(result !== undefined && {
        footnote: (
          <div className="flex flex-col gap-1.5">
            {verbatimCaveats.length > 0 && (
              <ul
                aria-label={t`Precizări de la server`}
                className="flex list-disc flex-col gap-1 pl-4"
              >
                {verbatimCaveats.map((caveat) => (
                  <li key={caveat}>{caveat}</li>
                ))}
              </ul>
            )}
            <p>
              <Trans>motor de căutare: {result.engine}</Trans>
              {result.asOf !== null && (
                <>
                  {' · '}
                  <Trans>
                    index din {formatLegalDate(result.asOf, i18n.locale)}
                  </Trans>
                </>
              )}
              {result.degraded && (
                <>
                  {' · '}
                  <Trans>răspuns degradat — o parte din căutare nu a rulat</Trans>
                </>
              )}
            </p>
          </div>
        ),
      })}
    >
      <form
        onSubmit={onSubmit}
        aria-label={t`Caută în legislație`}
        className="flex flex-col gap-3 border-b border-[var(--pnrr-subtle)] px-5 py-4 sm:px-6"
      >
        <div className="flex min-w-0 gap-0">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className={legislationFieldClassName}
            aria-label={t`Caută în legislație`}
            placeholder={t`Legea 53/2003 · Codul muncii · OUG 57/2019`}
          />
          <Button
            type="submit"
            className={legislationSubmitClassName}
            style={{ backgroundColor: LEGISLATION_ACCENT }}
          >
            <Trans>Caută</Trans>
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[var(--pnrr-muted)]">
              <Trans>Exemple:</Trans>
            </span>
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => runSearch(example, historical)}
                className={legislationExampleChipClassName}
              >
                {example}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--pnrr-fg)]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded-none accent-[#512178]"
              checked={historical}
              onChange={(event) =>
                runSearch(q, event.target.checked, { replace: !hasQuery })
              }
            />
            <Trans>include actele abrogate sau ieșite din vigoare</Trans>
          </label>
        </div>
      </form>

      {!hasQuery && (
        <div className="flex flex-col gap-4 px-5 py-6 sm:px-6">
          <div>
            <p className={legislationStatLabelClassName}>
              <Trans>Ce poți căuta</Trans>
            </p>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-[var(--pnrr-fg)]">
              <li>
                <Trans>
                  numărul actului — „Legea 53/2003”, „OUG 57/2019”, „HG 1/2016”
                </Trans>
              </li>
              <li>
                <Trans>
                  denumirea actului — „Codul muncii”, „Codul fiscal”, „Codul
                  administrativ”
                </Trans>
              </li>
            </ul>
          </div>

          <div className={legislationAlertClassName} role="note">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pnrr-warning-fg)]"
              aria-hidden
            />
            <p className="text-sm font-medium text-[var(--pnrr-fg)]">
              <Trans>
                Căutarea după expresii din textul legilor — de exemplu
                „concediu de odihnă” sau „salariul minim” — nu este încă
                disponibilă. Dacă o astfel de căutare nu găsește nimic, asta
                nu înseamnă că prevederea nu există în legislație.
              </Trans>
            </p>
          </div>
        </div>
      )}

      {hasQuery && searchQuery.isLoading && <LegislationSearchSkeleton />}

      {hasQuery && searchQuery.isError && (
        <div className="px-5 py-6 sm:px-6">
          <p className="text-sm text-[var(--pnrr-fg)]">
            <Trans>Nu am putut căuta în legislație.</Trans>
          </p>
          <button
            type="button"
            className={cn(secondaryButtonClassName, 'mt-3')}
            onClick={() => void searchQuery.refetch()}
          >
            <Trans>Încearcă din nou</Trans>
          </button>
        </div>
      )}

      {searchQuery.isSuccess && semanticUnavailable && acts.length > 0 && (
        <p className="border-b border-[var(--pnrr-subtle)] px-5 py-3 text-xs text-[var(--pnrr-muted)] sm:px-6">
          <Trans>
            Potriviri după numărul și denumirea actelor. Căutarea în textul
            legilor nu este încă disponibilă — o prevedere poate exista chiar
            dacă nu apare aici.
          </Trans>
        </p>
      )}

      {showStrip && (
        <div className="border-b border-[var(--pnrr-subtle)]">
          <p className="px-5 pt-4 text-xs font-semibold uppercase tracking-wide text-[var(--pnrr-muted)] sm:px-6">
            {resolveHits.length >= 2 ? (
              <Trans>
                Această căutare corespunde mai multor acte — alege actul:
              </Trans>
            ) : (
              <Trans>Un act corespunde acestei căutări:</Trans>
            )}
          </p>
          <ul aria-label={t`Acte identificate`} className="pb-1 pt-1">
            {resolveHits.map((hit) => {
              const parsedStatus = legalActStatusSchema.safeParse(hit.hint)
              return (
                <li key={`${hit.value}-${hit.label}`}>
                  <Link
                    to="/legislation/acts/$actId"
                    params={{ actId: hit.value }}
                    className={cn(legislationRowClassName, 'border-b-0 py-2')}
                  >
                    <span className="min-w-0 flex-1 truncate text-base font-semibold text-[var(--pnrr-fg)]">
                      {hit.label}
                    </span>
                    {parsedStatus.success ? (
                      <LegalStatusBadge status={parsedStatus.data} />
                    ) : hit.hint !== null ? (
                      <span className="shrink-0 text-xs text-[var(--pnrr-muted)]">
                        {hit.hint}
                      </span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {searchQuery.isSuccess && acts.length > 0 && (
        <ul aria-label={t`Rezultate`}>
          {acts.map((hit) => (
            <li
              key={hit.act.actId}
              className="border-b border-[var(--pnrr-subtle)] last:border-b-0"
            >
              <div className="flex flex-col gap-1 px-5 py-4 sm:px-6">
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <Link
                    to="/legislation/acts/$actId"
                    params={{ actId: hit.act.actId }}
                    className="text-base font-semibold text-[var(--pnrr-fg)] underline underline-offset-2 transition-colors hover:text-[var(--pnrr-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
                  >
                    {hit.act.displayCitation}
                  </Link>
                  <LegalStatusBadge status={hit.act.status} />
                </span>
                <span className="text-xs text-[var(--pnrr-muted)]">
                  {legalActTypeLabel(hit.act.actType)}
                  {hit.act.actYear !== null ? ` · ${hit.act.actYear}` : ''}
                  {hit.act.issuerSlug !== null
                    ? ` · ${legalIssuerLabel(hit.act.issuerSlug)}`
                    : ''}
                  {hit.act.inDegree > 0 && (
                    <>
                      {' · '}
                      <Trans>
                        citat de{' '}
                        {formatLegalNumber(hit.act.inDegree, i18n.locale)} ori
                      </Trans>
                    </>
                  )}
                </span>
                {hit.description !== null && (
                  <p className="text-sm leading-6 text-[var(--pnrr-fg)]">
                    {hit.description}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {emptyResult && !showStrip && isCitationShaped && (
        <div className="flex flex-col gap-2 px-5 py-6 sm:px-6">
          <p className="text-sm font-semibold text-[var(--pnrr-fg)]">
            <Trans>Niciun act găsit pentru citarea „{q}”.</Trans>
          </p>
          <p className="text-sm text-[var(--pnrr-muted)]">
            <Trans>
              Actele abrogate sau ieșite din vigoare nu sunt incluse implicit
              în căutare.
            </Trans>
          </p>
          {historicalRetry}
          <p className="text-sm text-[var(--pnrr-muted)]">
            <Trans>
              Verifică și numărul și anul actului — de exemplu „Legea
              53/2003”.
            </Trans>
          </p>
        </div>
      )}

      {emptyResult && !isCitationShaped && !showStrip && (
        <div className="px-5 py-6 sm:px-6">
          {/* THE honesty message. A phrase query zeroing out must never read
              as "the law does not exist": the corpus simply cannot be
              searched by phrase yet, and saying so is this tab's contract. */}
          <div className={legislationAlertClassName} role="note">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pnrr-warning-fg)]"
              aria-hidden
            />
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-[var(--pnrr-fg)]">
                <Trans>
                  Nu am găsit niciun act pentru „{q}” — dar asta nu înseamnă
                  că prevederea nu există în legislație.
                </Trans>
              </p>
              <p className="text-sm text-[var(--pnrr-fg)]">
                <Trans>
                  Deocamdată căutarea funcționează după numărul actului (de
                  exemplu „Legea 53/2003”) și după denumirea lui (de exemplu
                  „Codul muncii”). Căutarea după expresii din textul legilor —
                  cum ar fi „concediu de odihnă” — nu este încă disponibilă,
                  așa că lipsa rezultatelor nu spune nimic despre existența
                  prevederii.
                </Trans>
              </p>
              {historicalRetry}
            </div>
          </div>
        </div>
      )}

      {emptyResult && showStrip && (
        <div className="flex flex-col gap-2 px-5 py-4 sm:px-6">
          <p className="text-sm text-[var(--pnrr-muted)]">
            <Trans>
              Căutarea directă nu a găsit nimic — actele de mai sus sunt
              potriviri după denumirea sau numărul actului. Căutarea în textul
              legilor nu este încă disponibilă.
            </Trans>
          </p>
          {historicalRetry}
        </div>
      )}
    </LegislationSection>
  )
}
