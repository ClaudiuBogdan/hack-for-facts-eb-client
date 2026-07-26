import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ExternalLink,
  Printer,
} from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/ui/copy-button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type {
  ParliamentStenogramReaderSearch,
  ParliamentStenogramSessionRef,
} from '@/schemas/parliament'
import {
  useParliamentSpeechContext,
  useParliamentTranscript,
} from '../hooks/use-parliament-data'
import { classifyStenogramFailure } from '../lib/parliament-stenogram-error'
import { findDocumentMatches, stepMatch } from '../lib/stenogram-document-search'
import {
  formatSittingDate,
  formatSittingDateShort,
  sessionDateProvenanceNote,
  sessionDisplayTitle,
  sessionTimeSpan,
  sourceLinkLabel,
  sourcePrecisionNote,
  sourceSystemLabel,
  stenogramAvailabilityDescription,
  stenogramAvailabilityLabel,
  stenogramChamberLabel,
} from '../lib/stenogram-presentation'
import {
  buildStenogramInterventions,
  buildStenogramToc,
  segmentDomId,
} from '../lib/stenogram-toc'
import {
  stenogramAvailabilityToneClassName,
  stenogramBadgeClassName,
  stenogramLinkClassName,
  stenogramMutedTextClassName,
  stenogramNoticeClassName,
  stenogramPrintOnlyClassName,
  stenogramSectionTitleClassName,
} from '../lib/stenogram-theme'
import { ParliamentShell } from './parliament-shell'
import { ParliamentStenogramDocument } from './parliament-stenogram-document'
import { ParliamentStenogramDocumentSearch } from './parliament-stenogram-document-search'
import { ParliamentStenogramFailureNotice } from './parliament-stenogram-failure'
import { ParliamentStenogramInterventionRail } from './parliament-stenogram-intervention-rail'
import { ParliamentStenogramToc } from './parliament-stenogram-toc'

type Props = {
  readonly sessionKey: string
  readonly search: ParliamentStenogramReaderSearch
}

/** Landmark id for the reading column — the skip link's target. */
const READING_REGION_ID = 'stenogram-reading'

/**
 * Anything that can NAME a contribution: a reading block, or a tick on the
 * intervention rail. Both go through the one selection path, so the URL stays
 * the single source of "which contribution is highlighted".
 */
type SelectableContribution = { readonly speechKey?: string }

/** Skeleton shaped like the real reader (rail + column), so nothing jumps. */
function ReaderSkeleton() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label={t`Se încarcă stenograma ședinței`}
    >
      <Skeleton className="h-24 w-full rounded-none" />
      <div className="flex flex-col gap-6 lg:flex-row">
        <Skeleton className="h-64 w-full rounded-none lg:w-72" />
        <div className="min-w-0 flex-1 space-y-3">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <Skeleton key={row} className="h-16 w-full rounded-none" />
          ))}
        </div>
      </div>
    </div>
  )
}

function BackToList() {
  return (
    <Link
      to="/parlament/stenograme"
      className={cn(
        stenogramLinkClassName,
        'inline-flex items-center gap-1 text-sm print:hidden',
      )}
    >
      <ChevronLeft className="h-4 w-4" aria-hidden />
      <Trans>Toate stenogramele</Trans>
    </Link>
  )
}

/**
 * `/parlament/stenograme/sedinte/$sessionKey` — one sitting, read as a document.
 *
 * THE COMPLETENESS INVARIANT. The transcript arrives as ONE complete response
 * from the REST endpoint. There is no paging state, no "load the rest" control
 * and no auto-fetch loop, because every one of those creates a window in which
 * find-in-document, print and "previous/next contribution" silently operate on
 * a prefix — telling a reader "no results in this sitting" when the match is in
 * a block that has not arrived is worse than being slow.
 *
 * The layout is a reading column with an agenda rail, not a list of cards: the
 * unit here is the sitting, and the ordered blocks ARE the record. Everything
 * else exists to let a reader cite it — precise provenance, a copyable link
 * carrying the highlighted contribution, and a print form.
 */
export function ParliamentStenogramReaderPage({ sessionKey, search }: Props) {
  const { i18n } = useLingui()
  const navigate = useNavigate()
  const [documentQuery, setDocumentQuery] = useState('')
  const [currentMatch, setCurrentMatch] = useState(0)
  const [pendingFocus, setPendingFocus] = useState<number | undefined>(undefined)

  const { data: transcript, isLoading, isError, error, refetch } =
    useParliamentTranscript(sessionKey)

  const segments = useMemo(() => transcript?.segments ?? [], [transcript])
  const session = transcript?.session

  const toc = useMemo(() => buildStenogramToc(segments), [segments])
  // The rail is derived from the document, so it gives the many captures that
  // printed NO agenda headings a navigable shape without inventing one.
  const interventions = useMemo(
    () => buildStenogramInterventions(segments),
    [segments],
  )

  const matches = useMemo(
    () => findDocumentMatches(segments, documentQuery),
    [segments, documentQuery],
  )
  useEffect(() => setCurrentMatch(0), [documentQuery])

  // ── the highlighted contribution ─────────────────────────────────────────
  const selectedFromDocument = useMemo(
    () =>
      search.interventie
        ? segments.find((s) => s.speechKey === search.interventie)
        : undefined,
    [segments, search.interventie],
  )

  // A LEGACY key never appears as a block's `speechKey`. The document is
  // complete, so "not found here" is now conclusive — resolve the key through
  // the server's redirect map rather than waiting for more blocks.
  const needsContextLookup =
    Boolean(search.interventie) && !selectedFromDocument && Boolean(transcript)
  const context = useParliamentSpeechContext(
    needsContextLookup ? (search.interventie ?? '') : '',
  )
  const resolvedFromContext = useMemo(() => {
    const value = context.data
    if (!value || value.session.sessionKey !== sessionKey) return undefined
    const canonicalKey =
      value.redirect?.canonicalSpeechKey ?? value.segment?.speechKey
    return canonicalKey
      ? segments.find((s) => s.speechKey === canonicalKey)
      : undefined
  }, [context.data, sessionKey, segments])

  const selected = selectedFromDocument ?? resolvedFromContext
  const selectedPosition = selected?.position
  const unresolvedInterventie =
    Boolean(search.interventie) &&
    !selected &&
    Boolean(transcript) &&
    !context.isLoading

  // ── prev/next CONTRIBUTION, from the complete document ───────────────────
  const contributions = useMemo(
    () => segments.filter((s) => s.kind === 'SPEECH' && s.speechKey),
    [segments],
  )
  const selectedIndex = selected
    ? contributions.findIndex((s) => s.segmentKey === selected.segmentKey)
    : -1
  const previousContribution =
    selectedIndex > 0 ? contributions[selectedIndex - 1] : undefined
  const nextContribution =
    selectedIndex >= 0 && selectedIndex < contributions.length - 1
      ? contributions[selectedIndex + 1]
      : undefined

  // ── scroll + focus (client-only; never during render) ────────────────────
  const scrollToPosition = useCallback((position: number) => {
    const node = document.getElementById(segmentDomId(position))
    if (!node) return
    node.scrollIntoView({ block: 'center', behavior: 'smooth' })
    // Focus, not just scroll: a keyboard reader has to land where a sighted
    // reader is looking, and every block carries tabIndex={-1} for this.
    node.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    if (selectedPosition === undefined) return
    scrollToPosition(selectedPosition)
  }, [selectedPosition, scrollToPosition])

  useEffect(() => {
    if (pendingFocus === undefined) return
    scrollToPosition(pendingFocus)
    setPendingFocus(undefined)
  }, [pendingFocus, scrollToPosition])

  const handleStepMatch = useCallback(
    (direction: 1 | -1) => {
      if (matches.length === 0) return
      const next = stepMatch(currentMatch, matches.length, direction)
      setCurrentMatch(next)
      const target = matches[next]
      if (target) setPendingFocus(target.position)
    },
    [matches, currentMatch],
  )

  const selectContribution = useCallback(
    (segment: SelectableContribution) => {
      void navigate({
        to: '/parlament/stenograme/sedinte/$sessionKey',
        params: { sessionKey },
        search: { interventie: segment.speechKey },
        replace: true,
        resetScroll: false,
      })
    },
    [navigate, sessionKey],
  )

  if (isLoading) {
    return (
      <ParliamentShell activeTab="stenograme">
        <ReaderSkeleton />
      </ParliamentShell>
    )
  }

  // ── failures, told apart ─────────────────────────────────────────────────
  // A SOURCE_ONLY sitting arrives HERE, as a typed TRANSCRIPT_UNAVAILABLE that
  // carries the sitting itself — it is not a 200 with an empty reading. That is
  // what keeps "the sitting is real but yields no text" distinct from "no such
  // sitting", and it is why the notice below can name the sitting and link its
  // official source without a second request.
  if (isError || !transcript || !session) {
    const failure = classifyStenogramFailure(error)
    const held = failure.session
    return (
      <ParliamentShell activeTab="stenograme">
        <div className="space-y-6">
          <BackToList />
          {held ? <UnavailableSittingHeader session={held} /> : null}
          <ParliamentStenogramFailureNotice
            failure={failure}
            onRetry={failure.retryable ? () => void refetch() : undefined}
            {...(held && {
              sourceUrl: held.sourceUrl,
              sourceLabel: sourceLinkLabel(
                undefined,
                held.sourceUrlKind,
                held.sourceUrl,
              ),
            })}
          >
            <Link to="/parlament/stenograme" className={stenogramLinkClassName}>
              <Trans>Vezi toate ședințele</Trans>
            </Link>
          </ParliamentStenogramFailureNotice>
        </div>
      </ParliamentShell>
    )
  }

  const title = sessionDisplayTitle(session, i18n.locale)
  const timeSpan = sessionTimeSpan(session)
  const precisionNote = sourcePrecisionNote(session.sourceUrlKind)
  const dateProvenance = sessionDateProvenanceNote(session.sessionDateSource)
  const { previous: previousSitting, next: nextSitting } =
    transcript.navigation

  return (
    <ParliamentShell activeTab="stenograme">
      <div className="space-y-6">
        <BackToList />

        {/* ── heading band ─────────────────────────────────────────────── */}
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-sm font-semibold tabular-nums text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              {formatSittingDate(session.sessionDate, i18n.locale)}
            </span>
            <span className={stenogramBadgeClassName}>
              {stenogramChamberLabel(session.chamber)}
            </span>
            <span
              className={cn(
                stenogramBadgeClassName,
                'border-2',
                stenogramAvailabilityToneClassName[session.availability],
              )}
            >
              {stenogramAvailabilityLabel(session.availability)}
            </span>
          </div>

          <h1 className={stenogramSectionTitleClassName}>{title}</h1>

          {session.presidingText || timeSpan ? (
            <p className={stenogramMutedTextClassName}>
              {[session.presidingText, timeSpan].filter(Boolean).join(' · ')}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 print:hidden">
            <a
              href={session.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                stenogramLinkClassName,
                'inline-flex items-center gap-1.5 text-sm',
              )}
            >
              {sourceLinkLabel(session.sourceSystem, session.sourceUrlKind)}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>

            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-none border-2"
              onClick={() => window.print()}
            >
              <Printer className="mr-2 h-4 w-4" aria-hidden />
              <Trans>Printează</Trans>
            </Button>

            <span className="inline-flex items-center gap-1 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              <Trans>Copiază linkul</Trans>
              <CopyButton
                ariaLabel={t`Copiază linkul acestei ședințe`}
                onCopy={() =>
                  navigator.clipboard.writeText(window.location.href)
                }
              />
            </span>
          </div>

          {/* Provenance, stated precisely — and printed on paper, where the
              outbound link is not clickable and the URL has to be readable. */}
          <div className={stenogramNoticeClassName}>
            <p>
              <Trans>Sursă: {sourceSystemLabel(session.sourceSystem)}.</Trans>{' '}
              {dateProvenance}
            </p>
            {precisionNote ? <p className="mt-1">{precisionNote}</p> : null}
            <p className="mt-1">
              {stenogramAvailabilityDescription(session.availability)}
            </p>
            {session.sourceUpdatedAt ? (
              <p className="mt-1">
                <Trans>
                  Captura sursei, actualizată la{' '}
                  {formatSittingDateShort(
                    session.sourceUpdatedAt.slice(0, 10),
                    i18n.locale,
                  )}
                  .
                </Trans>
              </p>
            ) : null}
            <p className={cn(stenogramPrintOnlyClassName, 'mt-1 break-all')}>
              {session.sourceUrl}
            </p>
          </div>
        </header>

        {unresolvedInterventie ? (
          <p className={stenogramNoticeClassName}>
            <Trans>
              Nu am putut localiza intervenția din link în această stenogramă.
              Textul integral al ședinței este mai jos, neschimbat.
            </Trans>
          </p>
        ) : null}

        {/* The document is complete, so this searches the WHOLE sitting. */}
        <div className="print:hidden">
          <ParliamentStenogramDocumentSearch
            query={documentQuery}
            onQueryChange={setDocumentQuery}
            matchCount={matches.length}
            currentMatch={currentMatch}
            onStep={handleStepMatch}
          />
        </div>

        {/* The agenda rail precedes the document in source order (and stacks
            above it on mobile), so a keyboard reader would otherwise tab
            through every agenda item to reach the text. Visible on focus.
            The intervention rail needs no such escape: it FOLLOWS the reading
            column, and holds a single tab stop of its own. */}
        {toc.length > 0 ? (
          <a
            href={`#${READING_REGION_ID}`}
            onClick={(event) => {
              event.preventDefault()
              document.getElementById(READING_REGION_ID)?.focus()
            }}
            className="sr-only font-semibold underline underline-offset-4 focus:not-sr-only focus:inline-block focus:rounded-none focus:border-2 focus:border-[#1d70b8] focus:bg-white focus:px-3 focus:py-2 focus:text-[#0b0c0c] print:hidden"
          >
            <Trans>Sari la textul ședinței</Trans>
          </a>
        ) : null}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <ParliamentStenogramToc
            entries={toc}
            activePosition={selectedPosition}
            onSelect={(position) => setPendingFocus(position)}
            className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:w-72 lg:shrink-0 lg:overflow-y-auto"
          />

          {/* The reading column is capped at the prose measure from `xl` up, so
              the rail that follows it sits against the text it measures and the
              row's leftover width falls to the RIGHT of the rail — which is
              where the rail's hover previews open, clear of the prose. */}
          <section
            id={READING_REGION_ID}
            tabIndex={-1}
            aria-label={t`Textul ședinței`}
            className="min-w-0 flex-1 xl:max-w-3xl"
          >
            <ParliamentStenogramDocument
              segments={segments}
              selectedPosition={selectedPosition}
              matches={matches}
              currentMatch={currentMatch}
            />
          </section>

          {/* The reading-progress rail sits on the RIGHT edge of the reading
              column, where a scrollbar belongs — and after it in source order,
              so it never stands between a keyboard reader and the text. It
              appears only at `xl`: at `lg` the third column would eat into the
              reading measure, and the document plus the previous/next controls
              already navigate. */}
          <ParliamentStenogramInterventionRail
            interventions={interventions}
            selectedPosition={selectedPosition}
            onSelect={selectContribution}
            readingRegionId={READING_REGION_ID}
            className="xl:sticky xl:top-24"
          />
        </div>

        {/* ── previous/next CONTRIBUTION ───────────────────────────────── */}
        {selected ? (
          <nav
            aria-label={t`Navigare între intervenții`}
            className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-[#b1b4b6] pt-4 dark:border-[var(--pnrr-border)] print:hidden"
          >
            {previousContribution ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 max-w-full justify-start rounded-none border-2"
                onClick={() => selectContribution(previousContribution)}
              >
                <ArrowLeft className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">
                  <Trans>Intervenția anterioară</Trans>
                  {previousContribution.speakerName
                    ? ` · ${previousContribution.speakerName}`
                    : null}
                </span>
              </Button>
            ) : (
              <span />
            )}
            {nextContribution ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 max-w-full justify-end rounded-none border-2"
                onClick={() => selectContribution(nextContribution)}
              >
                <span className="truncate">
                  <Trans>Intervenția următoare</Trans>
                  {nextContribution.speakerName
                    ? ` · ${nextContribution.speakerName}`
                    : null}
                </span>
                <ArrowRight className="ml-2 h-4 w-4 shrink-0" aria-hidden />
              </Button>
            ) : null}
          </nav>
        ) : null}

        {/* ── previous/next SITTING — served by the API, not derived ────── */}
        {previousSitting || nextSitting ? (
          <nav
            aria-label={t`Navigare între ședințe`}
            className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-[#b1b4b6] pt-4 dark:border-[var(--pnrr-border)] print:hidden"
          >
            {previousSitting ? (
              <SittingLink direction="previous" sitting={previousSitting} />
            ) : (
              <span />
            )}
            {nextSitting ? (
              <SittingLink direction="next" sitting={nextSitting} />
            ) : null}
          </nav>
        ) : null}
      </div>
    </ParliamentShell>
  )
}

/** One neighbouring-sitting link, labelled with its date. */
function SittingLink({
  direction,
  sitting,
}: {
  readonly direction: 'previous' | 'next'
  readonly sitting: ParliamentStenogramSessionRef
}) {
  const { i18n } = useLingui()
  const date = formatSittingDateShort(sitting.sessionDate, i18n.locale)
  return (
    <Link
      to="/parlament/stenograme/sedinte/$sessionKey"
      params={{ sessionKey: sitting.sessionKey }}
      className={cn(
        stenogramLinkClassName,
        'inline-flex items-center gap-2 text-sm',
      )}
    >
      {direction === 'previous' ? (
        <>
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          <Trans>Ședința anterioară · {date}</Trans>
        </>
      ) : (
        <>
          <Trans>Ședința următoare · {date}</Trans>
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
        </>
      )}
    </Link>
  )
}

/**
 * The identity band for a sitting we HOLD but cannot serve a reading for.
 *
 * Rendered above the failure notice from the ref the error carries, so a
 * SOURCE_ONLY capture still shows its real date, chamber and title. Without it
 * the page would be a bare apology and would read like a broken link.
 */
function UnavailableSittingHeader({
  session,
}: {
  readonly session: ParliamentStenogramSessionRef
}) {
  const { i18n } = useLingui()
  return (
    <header className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-sm font-semibold tabular-nums text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
          {formatSittingDate(session.sessionDate, i18n.locale)}
        </span>
        <span className={stenogramBadgeClassName}>
          {stenogramChamberLabel(session.chamber)}
        </span>
        <span
          className={cn(
            stenogramBadgeClassName,
            'border-2',
            stenogramAvailabilityToneClassName[session.availability],
          )}
        >
          {stenogramAvailabilityLabel(session.availability)}
        </span>
      </div>
      <h1 className={stenogramSectionTitleClassName}>
        {sessionDisplayTitle(session, i18n.locale)}
      </h1>
    </header>
  )
}
