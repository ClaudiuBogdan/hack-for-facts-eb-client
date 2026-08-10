/**
 * The act READER — `/legislation/acts/$actId/text` (stenogram-reader model).
 *
 * Composes the four committed layers: the render transport (classified
 * failures, mock/live), the mark-slicing engine, the fidelity-gated block
 * renderer, and the served outline (TOC + `?nod=` deep links). What this page
 * shows IS the proven clean text; everything else on it is chrome around that
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
 * escape hatch on every one of them. An outline failure degrades to the
 * single-column reader — it never blocks the text.
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
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { LegalActDetail, LegalOutlineEntry } from '@/schemas/legal'
import { fetchLegalRender } from '../../api/legal-render-api'
import { useLegalAct } from '../../hooks/use-legal-act'
import { useLegalOutline } from '../../hooks/use-legal-outline'
import { useLegalRender } from '../../hooks/use-legal-render'
import { LegalRenderFailureError } from '../../lib/legal-render-error'
import type { LegalRenderFailure } from '../../lib/legal-render-error'
import { domAnchorForPath, resolveNod } from '../../lib/tldf/nod-resolve'
import type { TldfChunkPayload, TldfManifestPayload } from '../../lib/tldf/types'
import { LegalReaderToc } from './legal-reader-toc'
import { TldfBlocksView } from './tldf-blocks'

type Props = {
  readonly actId: string
  readonly initialAct?: LegalActDetail | null
  /** `?doc=` — read this expression instead of the canonical document. */
  readonly docOverride?: string
  /** `?nod=` — a document_nodes PATH deep link into this text. */
  readonly nod?: string
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

export function LegalReaderPage({ actId, initialAct, docOverride, nod }: Props) {
  const actQuery = useLegalAct(actId, initialAct)
  const act = actQuery.data ?? null
  const documentId = docOverride ?? act?.canonical?.documentId ?? null
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

  // An unresolvable nod is an honest notice, never a guessed scroll. Only
  // conclude the miss once the outline actually answered.
  useEffect(() => {
    setNodMissed(nod !== undefined && outlineQuery.isSuccess && nodResolution === null)
  }, [nod, outlineQuery.isSuccess, nodResolution])

  // Deep-link scroll: retried on every DOM growth until the anchor exists
  // (on chunked documents the target group may still be loading).
  const scrolledForRef = useRef<string | null>(null)
  useEffect(() => {
    if (nod === undefined || nodResolution === null) return
    if (scrolledForRef.current === nod) return
    if (scrollToNodTarget(nod, nodResolution.entry.path)) {
      scrolledForRef.current = nod
      setActivePath(nodResolution.entry.path)
    }
  }, [nod, nodResolution, domVersion])
  useEffect(() => {
    // A new nod is a new scroll intent.
    scrolledForRef.current = null
  }, [nod])

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

  if (actQuery.isLoading && act === null) {
    return (
      <ReaderShell actId={actId} act={null}>
        <p className="text-muted-foreground">
          <Trans>Se încarcă actul…</Trans>
        </p>
      </ReaderShell>
    )
  }

  if (act === null && docOverride === undefined) {
    return (
      <ReaderShell actId={actId} act={null}>
        <StateCard title={t`Actul nu a fost găsit`}>
          <Trans>
            Nu ținem un act cu acest identificator.{' '}
            <Link to="/legislation" className="underline">
              Înapoi la legislație
            </Link>
            .
          </Trans>
        </StateCard>
      </ReaderShell>
    )
  }

  if (documentId === null) {
    return (
      <ReaderShell actId={actId} act={act}>
        <StateCard title={t`Fără expresie canonică`}>
          <Trans>
            Ținem metadatele acestui act, dar nu o expresie de text căreia să îi
            servim conținutul.
          </Trans>
          <SourceLink act={act} />
        </StateCard>
      </ReaderShell>
    )
  }

  const toc =
    outline.length > 0 ? (
      <LegalReaderToc entries={outline} activePath={activePath} onSelect={onTocSelect} />
    ) : null

  return (
    <ReaderShell actId={actId} act={act} toc={toc} outlineFailed={outlineQuery.isError}>
      {nodMissed && (
        <p className="mb-4 rounded border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <Trans>Nu am găsit fragmentul cerut în acest text.</Trans>
        </p>
      )}
      {render.isLoading && (
        <p className="text-muted-foreground">
          <Trans>Se încarcă textul…</Trans>
        </p>
      )}
      {render.isError && (
        <RenderFailureCard
          error={render.error}
          act={act}
          onRetry={() => void render.refetch()}
        />
      )}
      {render.data !== undefined && render.data.kind === 'envelope' && (
        <EnvelopeReader
          blocks={render.data.tldf.blocks}
          marks={render.data.tldf.marks}
          containsNonBmp={render.data.tldf.contains_non_bmp}
          onRendered={onDomGrowth}
        />
      )}
      {render.data !== undefined && render.data.kind === 'manifest' && (
        <ChunkedReader
          documentId={documentId}
          manifest={render.data.tldf}
          chainThroughGroup={nodResolution?.chunkGroupIndex ?? null}
          onGroupLoaded={onDomGrowth}
        />
      )}
      {/* The base route never answers `kind: 'chunk'`; the schema union simply carries it. */}
    </ReaderShell>
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

function ReaderShell({
  actId,
  act,
  toc,
  outlineFailed = false,
  children,
}: {
  readonly actId: string
  readonly act: LegalActDetail | null
  readonly toc?: React.ReactNode
  readonly outlineFailed?: boolean
  readonly children: React.ReactNode
}) {
  const hasToc = toc !== null && toc !== undefined
  return (
    <div
      className={
        hasToc
          ? 'mx-auto max-w-6xl px-4 py-8 print:max-w-none'
          : 'mx-auto max-w-3xl px-4 py-8 print:max-w-none'
      }
    >
      <a
        href="#reader-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:px-3 focus:py-2"
      >
        <Trans>Sari la textul actului</Trans>
      </a>
      <header className="mb-6 border-b pb-4 print:hidden">
        <p className="text-sm text-muted-foreground">
          <Link to="/legislation/acts/$actId" params={{ actId }} className="underline">
            {act?.displayCitation ?? t`Fișa actului`}
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-semibold">
          {act !== null ? act.displayCitation : <Trans>Text de lege</Trans>}
        </h1>
        {act?.canonical?.title !== null && act?.canonical?.title !== undefined && (
          <p className="mt-1 text-muted-foreground">{act.canonical.title}</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          <Trans>
            Textul în forma publicată, reprodus caracter cu caracter din sursa
            oficială.
          </Trans>{' '}
          <SourceLink act={act} inline />
        </p>
        {outlineFailed && (
          <p className="mt-2 text-xs text-muted-foreground">
            <Trans>Cuprinsul nu s-a putut încărca — textul rămâne integral mai jos.</Trans>
          </p>
        )}
      </header>
      {/* The aside/main pair keeps ONE tree position whether or not a TOC
          exists — flipping between layouts would remount the reader and wipe
          already-loaded chunk state (measured: the TOC arriving mid-read reset
          a chunked document to part 1). Keys pin the reconciliation. */}
      <div className={hasToc ? 'lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8' : undefined}>
        <aside key="toc" className={hasToc ? 'print:hidden' : 'hidden'}>
          {/* Mobile: a disclosure above the text. Desktop: sticky sidebar. */}
          <div className="mb-4 lg:hidden">
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <Trans>Cuprins</Trans>
                  <ChevronDown className="size-4" aria-hidden />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 rounded-lg border p-3">
                {toc}
              </CollapsibleContent>
            </Collapsible>
          </div>
          <div className="hidden lg:sticky lg:top-20 lg:block">{toc}</div>
        </aside>
        <main key="text" className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}

function SourceLink({
  act,
  inline = false,
}: {
  readonly act: LegalActDetail | null
  readonly inline?: boolean
}) {
  if (act?.officialTextUrl === null || act?.officialTextUrl === undefined) return null
  const link = (
    <a
      href={act.officialTextUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 underline"
    >
      <Trans>Vezi textul pe legislatie.just.ro</Trans>
      <ExternalLink className="size-3" aria-hidden />
    </a>
  )
  return inline ? link : <p className="mt-3">{link}</p>
}

function StateCard({
  title,
  children,
}: {
  readonly title: string
  readonly children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-6">
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
  chainThroughGroup = null,
  onGroupLoaded,
}: {
  readonly documentId: string
  readonly manifest: TldfManifestPayload
  readonly chainThroughGroup?: number | null
  readonly onGroupLoaded?: () => void
}) {
  const groupCount = manifest.chunks.length
  const [slots, setSlots] = useState<readonly ChunkSlot[]>(() =>
    Array.from({ length: groupCount }, () => ({ state: 'pending' as const })),
  )

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
              blocks={slot.payload.blocks}
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
            <Trans>
              Se încarcă partea {Math.min(loadedCount + 1, groupCount)} din {groupCount}…
            </Trans>
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
