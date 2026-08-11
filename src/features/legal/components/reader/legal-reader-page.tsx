/**
 * The act READING LAYOUT — the body of `/legislation/acts/$actId`.
 *
 * One page, portal-legislativ-shaped (user decision 2026-08-10: the text is
 * not a separate route), with the TEXT as the main content (user decision
 * 2026-08-11): a left nav carrying only the served Cuprins, and a main column
 * that runs lead (the summary card, warnings folded in) → the full text
 * (headingless — the page header is its masthead, and the text's own leading
 * masthead lines hide exactly where the header provably repeats them, see
 * `lib/tldf/masthead.ts`) → the fișa (detail bands, passed in as the `fisa`
 * slot) at the bottom. Composes
 * the four committed layers: the render transport (classified failures,
 * mock/live), the mark-slicing engine, the fidelity-gated block renderer, and
 * the served outline (TOC + `?nod=` deep links). What the text section shows
 * IS the proven clean text; everything else on the page is chrome around that
 * claim.
 *
 * CHUNKED DOCUMENTS are never an infinite scroller hiding extent: the
 * manifest declares "partea N din M" up front, groups load progressively
 * (IntersectionObserver sentinel, with an explicit button as the universal
 * fallback), and a failed group offers retry INLINE without discarding what
 * already renders. A `?nod=` deep link auto-chains groups IN ORDER up to the
 * one holding its target — never out of order, so content cannot land above
 * the viewport and shift the reading position.
 *
 * FAILURE STATES ARE CONTENT, not apologies: "no servable text",
 * "restricted", "inconsistent" and "transport" each render their own fact,
 * and only retryable ones offer a retry. The portal source link is the
 * escape hatch on every one of them. An outline failure degrades to a
 * nav-less text — it never blocks the text.
 *
 * `?doc=` reads a specific non-canonical expression. `?nod=` (a
 * document_nodes PATH) resolves against the served outline; scroll-position
 * sync highlights the TOC entry only and never writes the URL back (the
 * copy/share mechanism is selecting a TOC entry, not scrolling).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ChevronDown, ExternalLink, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { LegalActDetail, LegalOutlineEntry } from '@/schemas/legal'
import { fetchLegalRender } from '../../api/legal-render-api'
import { useLegalOutline } from '../../hooks/use-legal-outline'
import { useLegalRender } from '../../hooks/use-legal-render'
import { LegalRenderFailureError } from '../../lib/legal-render-error'
import type { LegalRenderFailure } from '../../lib/legal-render-error'
import { uniqueGazettePublication } from '../../lib/act-facts'
import { legalIssuerLabel } from '../../lib/legal-vocabulary'
import { splitMasthead } from '../../lib/tldf/masthead'
import type { MastheadFactsInHeader, MastheadSplit } from '../../lib/tldf/masthead'
import { domAnchorForPath, resolveNod } from '../../lib/tldf/nod-resolve'
import type { TldfChunkPayload, TldfManifestPayload } from '../../lib/tldf/types'
import { LegalReaderToc } from './legal-reader-toc'
import { TldfBlocksView } from './tldf-blocks'

type Props = {
  readonly act: LegalActDetail
  /** The page lead — warnings and the plain-language summary, no heading. */
  readonly lead: React.ReactNode
  /** The fișa — the detail accordion, rendered under its own section H2. */
  readonly fisa: React.ReactNode
  /** `?doc=` — read this expression instead of the canonical document. */
  readonly docOverride?: string
  /** `?nod=` — a document_nodes PATH deep link into this text. */
  readonly nod?: string
  /**
   * Fires when the text's masthead is split off, carrying the act's subject
   * ("privind achizițiile publice") so the page header can complete its den
   * line — the header is this text's masthead now (user decision 2026-08-11),
   * and the subject exists nowhere in the act's metadata.
   */
  readonly onMastheadSubject?: (subject: string | null) => void
}

/** Scroll to a nod's block, preferring the exact path over its outline anchor. */
function scrollToNodTarget(nod: string, anchorPath: string): boolean {
  const target =
    document.getElementById(domAnchorForPath(nod)) ??
    document.getElementById(domAnchorForPath(anchorPath))
  if (target === null) return false
  target.scrollIntoView({ block: 'start' })
  target.classList.add('bg-accent/60')
  window.setTimeout(() => target.classList.remove('bg-accent/60'), 1600)
  return true
}

export function ActReadingLayout({
  act,
  lead,
  fisa,
  docOverride,
  nod,
  onMastheadSubject,
}: Props) {
  const documentId = docOverride ?? act.canonical?.documentId ?? null
  const render = useLegalRender(documentId)
  const outlineQuery = useLegalOutline(documentId)
  const outline = useMemo(() => outlineQuery.data ?? [], [outlineQuery.data])
  const navigate = useNavigate()

  /** Bumped whenever text blocks land in the DOM (envelope render, chunk load). */
  const [domVersion, setDomVersion] = useState(0)
  const [activePath, setActivePath] = useState<string | null>(null)
  const [nodMissed, setNodMissed] = useState(false)

  const manifest =
    render.data !== undefined && render.data.kind === 'manifest' ? render.data.tldf : null

  // `?nod=` resolution over the served outline (null until both arrive).
  const nodResolution = useMemo(() => {
    if (nod === undefined || outline.length === 0) return null
    return resolveNod(nod, outline, manifest?.chunks)
  }, [nod, outline, manifest])

  // Deep-link scroll: retried on every DOM growth until the anchor exists
  // (on chunked documents the target group may still be loading). When the
  // outline gives no resolution — 46.694 paragraph_stream documents serve an
  // EMPTY outline yet render real block ids — the nod itself is tried as a
  // direct DOM anchor, so a shared link still lands. The intent is keyed by
  // DOCUMENT and nod: the same nod on a different `?doc=` is a new scroll,
  // and there is no separate reset effect to erase a fresh landing.
  const scrollIntentKey = `${documentId ?? ''}::${nod ?? ''}`
  const scrolledForRef = useRef<string | null>(null)
  useEffect(() => {
    if (nod === undefined) return
    if (scrolledForRef.current === scrollIntentKey) return
    if (scrollToNodTarget(nod, nodResolution?.entry.path ?? nod)) {
      scrolledForRef.current = scrollIntentKey
      setActivePath(nodResolution?.entry.path ?? nod)
      setNodMissed(false)
    }
  }, [scrollIntentKey, nod, nodResolution, domVersion])

  // An unresolvable nod is an honest notice, never a guessed scroll — but
  // only once the page can actually judge: outline answered, text actually
  // ON SCREEN (a manifest with all slots pending has rendered nothing —
  // domVersion counts real block commits), no anchor landed. (Chunked
  // no-outline docs cannot chain to an unloaded group without an outline;
  // the notice is the honest answer for a target beyond the loaded extent.)
  const renderSettled =
    render.isSuccess && (render.data.kind !== 'manifest' || domVersion > 0)
  const outlineSettled = outlineQuery.isSuccess || outlineQuery.isError
  useEffect(() => {
    setNodMissed(
      nod !== undefined &&
        renderSettled &&
        outlineSettled &&
        nodResolution === null &&
        scrolledForRef.current !== scrollIntentKey &&
        document.getElementById(domAnchorForPath(nod)) === null,
    )
  }, [nod, scrollIntentKey, renderSettled, outlineSettled, nodResolution, domVersion])

  // Scroll-position sync: highlight the TOC entry of the heading nearest the
  // top of the viewport. Highlight only — never a URL writeback.
  useEffect(() => {
    if (outline.length === 0 || typeof IntersectionObserver === 'undefined') return
    const observed: Element[] = []
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (hit !== undefined) {
          setActivePath(hit.target.id.replace(/^tldf-/, ''))
        }
      },
      { rootMargin: '0% 0% -75% 0%' },
    )
    for (const entry of outline) {
      const el = document.getElementById(domAnchorForPath(entry.path))
      if (el !== null) {
        observer.observe(el)
        observed.push(el)
      }
    }
    return () => observer.disconnect()
  }, [outline, domVersion])

  const onTocSelect = useCallback(
    (entry: LegalOutlineEntry) => {
      void navigate({
        to: '.',
        search: (prev: Record<string, unknown>) => ({ ...prev, nod: entry.path }),
        replace: true,
        resetScroll: false,
      })
      // Same-nod reselection still deserves a scroll.
      scrolledForRef.current = null
      setActivePath(entry.path)
      scrollToNodTarget(entry.path, entry.path)
    },
    [navigate],
  )

  const onDomGrowth = useCallback(() => setDomVersion((v) => v + 1), [])

  // The VALUES the page header above actually displays — the text's leading
  // masthead lines hide only behind an exact-fact match against these (user
  // decision 2026-08-11: the header owns the act's identity). On a `?doc=`
  // override nothing hides: the header describes the canonical act, and an
  // alternate expression's masthead (a republicare's, say) may legitimately
  // differ. Must assemble EXACTLY what ActDetailHeader renders — a value the
  // header does not show must arrive here as null.
  const mastheadFacts = useMemo<MastheadFactsInHeader>(() => {
    if (docOverride !== undefined) {
      return { den: null, issuerLabel: null, issueNumber: null, issueYear: null }
    }
    const publication = uniqueGazettePublication(act)
    const issueDate = publication?.issueDate ?? null
    return {
      den: act.canonical?.den ?? null,
      issuerLabel: act.issuerSlug !== null ? legalIssuerLabel(act.issuerSlug) : null,
      issueNumber: publication?.issueNumber ?? null,
      // The year the header's "din <date>" fragment displays — without a
      // date the header shows no year, and a bare issue number identifies
      // nothing (MO numbering restarts every year).
      issueYear: issueDate !== null ? Number(issueDate.slice(0, 4)) : null,
    }
  }, [act, docOverride])

  // The masthead split of whatever text is actually on screen. `null` until
  // a text renders; drives the fidelity note's wording and (via the parent)
  // the header's den+subject line. Reset when the expression changes — a
  // subject lifted from one text must not caption another.
  const [mastheadLift, setMastheadLift] = useState<{
    readonly subject: string | null
    readonly lifted: boolean
  } | null>(null)
  useEffect(() => {
    setMastheadLift(null)
    onMastheadSubject?.(null)
  }, [documentId, onMastheadSubject])
  const handleMasthead = useCallback(
    (split: MastheadSplit) => {
      setMastheadLift((prev) =>
        prev !== null && prev.subject === split.subject && prev.lifted === split.lifted
          ? prev
          : { subject: split.subject, lifted: split.lifted },
      )
      onMastheadSubject?.(split.subject)
    },
    [onMastheadSubject],
  )

  // Envelope documents split synchronously from the payload; chunked ones
  // report from group 0 inside ChunkedReader.
  const envelopeSplit = useMemo(
    () =>
      render.data !== undefined && render.data.kind === 'envelope'
        ? splitMasthead(render.data.tldf.blocks, mastheadFacts)
        : null,
    [render.data, mastheadFacts],
  )
  useEffect(() => {
    if (envelopeSplit !== null) handleMasthead(envelopeSplit)
  }, [envelopeSplit, handleMasthead])

  const toc =
    outline.length > 0 ? (
      <LegalReaderToc entries={outline} activePath={activePath} onSelect={onTocSelect} />
    ) : null

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 print:max-w-none">
      <a
        href="#reader-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:px-3 focus:py-2"
      >
        <Trans>Sari la textul actului</Trans>
      </a>

      {/* The aside/main pair keeps ONE tree position whether or not a TOC
          exists — flipping between layouts would remount the reader and wipe
          already-loaded chunk state (measured: the TOC arriving mid-read reset
          a chunked document to part 1). Keys pin the reconciliation, so the
          rail collapsing below cannot cost the reader loaded chunks. */}
      {/* No `items-start`: the aside CELL must stretch the full row height so
          the sticky inner nav has room to travel alongside the whole read. */}
      {/* The rail column is UNCONDITIONAL even when the outline settles
          empty: the page header above sits on this same grid, so releasing
          the column here would tear the header's left edge away from the
          text's and shift the whole read after settle. An empty gutter on
          outline-less documents is the price of one shared edge. */}
      <div className="lg:grid lg:grid-cols-[290px_minmax(0,1fr)] lg:gap-10">
        <aside key="nav" className="print:hidden">
          {/* Mobile: the Cuprins as a disclosure above the content. */}
          {toc !== null && (
            <div className="mb-4 lg:hidden">
              <Collapsible>
                <CollapsibleTrigger asChild>
                  {/* In the module's control language — 2px near-black,
                      square — not the app-default rounded outline. */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between rounded-none border-2 border-[var(--pnrr-border)]"
                  >
                    <Trans>Cuprins</Trans>
                    <ChevronDown className="size-4" aria-hidden />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 rounded-none border border-[var(--pnrr-subtle)] p-3">
                  {toc}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* Desktop: only the served Cuprins, sticky alongside the whole
              read — the "Pe această pagină" section rail is gone (user
              decision 2026-08-11: one navigation grain, the law's own). */}
          <div className="hidden lg:sticky lg:top-20 lg:block">{toc}</div>
        </aside>

        {/* One 44rem column for everything in main: section rules end where
            the text measure ends, instead of 190px past it. */}
        <main key="content" className="min-w-0 max-w-[44rem]">
          {lead}

          {/* No "Textul actului" heading (user decision 2026-08-11): the page
              header IS the text's masthead now, and the chrome between them
              only restated it. The section keeps its id — external links and
              the versions band still target #act-text. */}
          <section id="act-text" aria-label={t`Textul actului`} className="mt-10 scroll-mt-24">
            {(render.isSuccess || outlineQuery.isError || docOverride !== undefined) && (
              <div className="mb-4 space-y-1">
                {/* The fidelity statement survives the removed section header
                    — and it must TRACK the masthead lift: once the header
                    absorbs the opening lines, "caracter cu caracter" without
                    the caveat would be a false claim about the body below. */}
                {render.isSuccess && (
                  <p className="text-xs text-[var(--pnrr-muted)]">
                    {mastheadLift?.lifted === true ? (
                      <Trans>
                        Textul în forma publicată — antetul actului este
                        preluat în capul paginii.
                      </Trans>
                    ) : (
                      <Trans>
                        Textul în forma publicată, reprodus caracter cu
                        caracter din sursa oficială.
                      </Trans>
                    )}{' '}
                    {act.officialTextUrl !== null && (
                      <a
                        href={act.officialTextUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2"
                      >
                        <Trans>Compară pe legislatie.just.ro</Trans>
                      </a>
                    )}
                  </p>
                )}
                {outlineQuery.isError && (
                  <p className="text-xs text-[var(--pnrr-muted)]">
                    <Trans>
                      Cuprinsul nu s-a putut încărca — textul rămâne integral mai jos.
                    </Trans>
                  </p>
                )}
                {docOverride !== undefined && (
                  <p className="text-xs text-[var(--pnrr-muted)]">
                    <Trans>Afișezi o versiune anume a textului.</Trans>{' '}
                    <Link to="." search={{}} className="underline underline-offset-2">
                      <Trans>Revino la forma afișată în mod normal</Trans>
                    </Link>
                  </p>
                )}
              </div>
            )}

            <div>
              {documentId === null && (
                <StateCard title={t`Fără expresie canonică`}>
                  <Trans>
                    Ținem metadatele acestui act, dar nu o expresie de text
                    căreia să îi servim conținutul.
                  </Trans>
                  <SourceLink act={act} />
                </StateCard>
              )}
              {nodMissed && (
                <p className="mb-4 rounded-none border border-[var(--pnrr-subtle)] bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  <Trans>Nu am găsit fragmentul cerut în acest text.</Trans>
                </p>
              )}
              {documentId !== null && render.isLoading && (
                // A skeleton at the serif's rhythm, not a bare grey line: it
                // reserves real height, so the fișa below doesn't leap
                // thousands of pixels when the text lands.
                <div role="status" aria-label={t`Se încarcă textul…`} className="space-y-4 pt-1">
                  {Array.from({ length: 14 }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-4 animate-pulse rounded-sm bg-muted',
                        i % 5 === 4 ? 'w-2/3' : i % 3 === 0 ? 'w-11/12' : 'w-full',
                      )}
                    />
                  ))}
                </div>
              )}
              {render.isError && (
                <RenderFailureCard
                  error={render.error}
                  act={act}
                  onRetry={() => void render.refetch()}
                />
              )}
              {render.data !== undefined &&
                render.data.kind === 'envelope' &&
                envelopeSplit !== null && (
                  <EnvelopeReader
                    blocks={envelopeSplit.blocks}
                    marks={render.data.tldf.marks}
                    containsNonBmp={render.data.tldf.contains_non_bmp}
                    onRendered={onDomGrowth}
                  />
                )}
              {render.data !== undefined && render.data.kind === 'manifest' && (
                // Keyed by document: chunk slots are per-expression state,
                // and a `?doc=` switch over a cached manifest must NEVER
                // carry another document's loaded groups into this one.
                <ChunkedReader
                  key={documentId ?? ''}
                  documentId={documentId ?? ''}
                  manifest={render.data.tldf}
                  mastheadFacts={mastheadFacts}
                  onMasthead={handleMasthead}
                  chainThroughGroup={nodResolution?.chunkGroupIndex ?? null}
                  onGroupLoaded={onDomGrowth}
                />
              )}
              {/* The base route never answers `kind: 'chunk'`; the schema union simply carries it. */}
            </div>
          </section>

          {/* The fișa closes the page (user decision 2026-08-11): the reader
              who wants the record — publication, versions, references — has
              already decided the text isn't what they came for, and the
              header carries the identity facts a first glance needs. */}
          <section id="act-fisa" aria-labelledby="act-fisa-heading" className="mt-16 scroll-mt-24">
            <h2
              id="act-fisa-heading"
              className="mb-4 border-b-2 border-[var(--pnrr-border)] pb-3 text-3xl font-black tracking-tight text-[var(--pnrr-fg)]"
            >
              <Trans>Fișa actului</Trans>
            </h2>
            {fisa}
          </section>
        </main>
      </div>
    </div>
  )
}

function EnvelopeReader({
  blocks,
  marks,
  containsNonBmp,
  onRendered,
}: {
  readonly blocks: React.ComponentProps<typeof TldfBlocksView>['blocks']
  readonly marks: React.ComponentProps<typeof TldfBlocksView>['marks']
  readonly containsNonBmp: boolean
  readonly onRendered: () => void
}) {
  // Signal DOM growth once after mount so deep links and scroll sync attach.
  useEffect(() => {
    onRendered()
  }, [onRendered])
  return (
    <article id="reader-content" lang="ro">
      <TldfBlocksView blocks={blocks} marks={marks} containsNonBmp={containsNonBmp} />
    </article>
  )
}

function SourceLink({ act }: { readonly act: LegalActDetail | null }) {
  if (act?.officialTextUrl === null || act?.officialTextUrl === undefined) return null
  return (
    <p className="mt-3">
      <a
        href={act.officialTextUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 underline"
      >
        <Trans>Vezi textul pe legislatie.just.ro</Trans>
        <ExternalLink className="size-3" aria-hidden />
      </a>
    </p>
  )
}

function StateCard({
  title,
  children,
}: {
  readonly title: string
  readonly children: React.ReactNode
}) {
  return (
    <div className="rounded-none border border-[var(--pnrr-subtle)] bg-muted/30 p-6">
      <p className="flex items-center gap-2 font-medium">
        <TriangleAlert className="size-4 text-muted-foreground" aria-hidden />
        {title}
      </p>
      <div className="mt-2 text-sm text-muted-foreground">{children}</div>
    </div>
  )
}

function RenderFailureCard({
  error,
  act,
  onRetry,
}: {
  readonly error: unknown
  readonly act: LegalActDetail | null
  readonly onRetry: () => void
}) {
  const failure: LegalRenderFailure =
    error instanceof LegalRenderFailureError
      ? error.failure
      : { kind: 'transport', message: String(error), retryable: true }

  const title = {
    not_found: t`Nu există un text servit pentru acest document`,
    restricted: t`Textul acestui document este restricționat`,
    unavailable: t`Nu avem un text servibil pentru acest act`,
    inconsistent: t`Textul stocat este momentan inconsistent`,
    transport: t`Nu am putut încărca textul`,
  }[failure.kind]

  const body = {
    not_found: t`Ținem actul, dar nicio generare de text pentru această expresie.`,
    restricted: t`Metadatele rămân publice; textul se consultă la sursa oficială.`,
    unavailable: t`Extracția nu a produs un text servibil pentru această expresie.`,
    inconsistent: t`Am refuzat să afișăm o citire parțială. O regenerare este de regulă pe drum.`,
    transport: t`Eroare de rețea sau de server — existența textului rămâne o întrebare deschisă.`,
  }[failure.kind]

  return (
    <StateCard title={title}>
      <p>{body}</p>
      <SourceLink act={act} />
      {failure.retryable && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          <Trans>Încearcă din nou</Trans>
        </Button>
      )}
    </StateCard>
  )
}

// ── chunked documents ─────────────────────────────────────────────────────────

type ChunkSlot =
  | { readonly state: 'pending' }
  | { readonly state: 'loading' }
  | { readonly state: 'loaded'; readonly payload: TldfChunkPayload }
  | { readonly state: 'failed'; readonly message: string }

/**
 * Progressive reader for a chunked document. Groups load in order as the
 * sentinel becomes visible; the manifest's declared extent is always on
 * screen, so the reader is never inside an unbounded scroller.
 *
 * `chainThroughGroup` (a `?nod=` deep link's target) auto-loads groups
 * SEQUENTIALLY up to that index — in order, reusing the same slots machinery,
 * so the "partea N din M" progress line narrates the chain too.
 */
function ChunkedReader({
  documentId,
  manifest,
  mastheadFacts,
  onMasthead,
  chainThroughGroup = null,
  onGroupLoaded,
}: {
  readonly documentId: string
  readonly manifest: TldfManifestPayload
  readonly mastheadFacts: MastheadFactsInHeader
  readonly onMasthead?: (split: MastheadSplit) => void
  readonly chainThroughGroup?: number | null
  readonly onGroupLoaded?: () => void
}) {
  const groupCount = manifest.chunks.length
  const [slots, setSlots] = useState<readonly ChunkSlot[]>(() =>
    Array.from({ length: groupCount }, () => ({ state: 'pending' as const })),
  )

  // The masthead lives in group 0 — split once per loaded payload and hand
  // the subject up for the header's den line.
  const firstSlot = slots[0]
  const firstBlocks = firstSlot?.state === 'loaded' ? firstSlot.payload.blocks : null
  const firstSplit = useMemo(
    () => (firstBlocks === null ? null : splitMasthead(firstBlocks, mastheadFacts)),
    [firstBlocks, mastheadFacts],
  )
  useEffect(() => {
    if (firstSplit !== null) onMasthead?.(firstSplit)
  }, [firstSplit, onMasthead])

  const loadChunk = useCallback(
    (groupIndex: number) => {
      setSlots((prev) => {
        const current = prev[groupIndex]
        if (current === undefined || current.state === 'loading' || current.state === 'loaded') {
          return prev
        }
        const next = [...prev]
        next[groupIndex] = { state: 'loading' }
        return next
      })
      // Physical chunk rows are 1-based; group i is chunk_index i+1.
      fetchLegalRender(documentId, { chunkIndex: groupIndex + 1 })
        .then((data) => {
          setSlots((prev) => {
            const next = [...prev]
            next[groupIndex] =
              data.kind === 'chunk'
                ? { state: 'loaded', payload: data.tldf }
                : { state: 'failed', message: `unexpected payload kind ${data.kind}` }
            return next
          })
        })
        .catch((error: unknown) => {
          const message =
            error instanceof LegalRenderFailureError ? error.failure.message : String(error)
          setSlots((prev) => {
            const next = [...prev]
            next[groupIndex] = { state: 'failed', message }
            return next
          })
        })
    },
    [documentId],
  )

  // First group loads immediately; the rest wait for the sentinel.
  useEffect(() => {
    loadChunk(0)
  }, [loadChunk])

  const loadedCount = slots.filter((slot) => slot.state === 'loaded').length
  const nextIndex = slots.findIndex((slot) => slot.state === 'pending')
  const failedIndex = slots.findIndex((slot) => slot.state === 'failed')
  // "Se încarcă" is only true while a fetch is actually in flight — while the
  // reader merely WAITS (for the scroll sentinel, or for a click where
  // IntersectionObserver is unavailable) the line states progress instead.
  const fetching = slots.some((slot) => slot.state === 'loading')

  // Deep-link chaining: keep loading the NEXT pending group (strictly in
  // order) while the target group is not yet loaded. Failures stop the chain
  // — the inline retry card takes over.
  useEffect(() => {
    if (chainThroughGroup === null || failedIndex !== -1) return
    const target = slots[chainThroughGroup]
    if (target === undefined || target.state === 'loaded') return
    if (nextIndex !== -1 && nextIndex <= chainThroughGroup) loadChunk(nextIndex)
  }, [chainThroughGroup, slots, nextIndex, failedIndex, loadChunk])

  // Parent hook for deep-link scroll + TOC sync re-attachment.
  useEffect(() => {
    if (loadedCount > 0) onGroupLoaded?.()
  }, [loadedCount, onGroupLoaded])

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (nextIndex === -1 || typeof IntersectionObserver === 'undefined') return
    const sentinel = sentinelRef.current
    if (sentinel === null) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadChunk(nextIndex)
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [nextIndex, loadChunk])

  return (
    <>
      {/* The article holds ONLY the law's text — find-in-page, copy and
          citation never pick up loading chrome. */}
      <article id="reader-content" lang="ro">
        {slots.map((slot, i) =>
          slot.state === 'loaded' ? (
            <TldfBlocksView
              key={manifest.chunks[i]?.block_id ?? i}
              // The masthead is a leading-prefix concern, so only group 0 is
              // ever split. Safe under absolute spans: every block and run
              // carries document offsets, so marks on the remaining blocks
              // still land exactly where they did.
              blocks={
                i === 0 && firstSplit !== null ? firstSplit.blocks : slot.payload.blocks
              }
              marks={manifest.marks}
              containsNonBmp={manifest.contains_non_bmp}
            />
          ) : null,
        )}
      </article>

      {failedIndex !== -1 && (
        <div className="mt-6">
          <StateCard title={t`O parte a textului nu s-a încărcat`}>
            <Button variant="outline" size="sm" onClick={() => loadChunk(failedIndex)}>
              <Trans>Reîncearcă partea {failedIndex + 1}</Trans>
            </Button>
          </StateCard>
        </div>
      )}

      {loadedCount < groupCount && failedIndex === -1 && (
        <div ref={sentinelRef} className="mt-8 text-center text-sm text-muted-foreground">
          <p aria-live="polite">
            {fetching ? (
              <Trans>
                Se încarcă partea {Math.min(loadedCount + 1, groupCount)} din {groupCount}…
              </Trans>
            ) : (
              <Trans>
                Afișate {loadedCount} din {groupCount} părți — derulează sau
                apasă pentru restul.
              </Trans>
            )}
          </p>
          {nextIndex !== -1 && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => loadChunk(nextIndex)}
            >
              <Trans>Încarcă partea următoare</Trans>
            </Button>
          )}
        </div>
      )}

      {loadedCount === groupCount && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          <Trans>Sfârșitul textului — {groupCount} părți afișate integral.</Trans>
        </p>
      )}
    </>
  )
}
