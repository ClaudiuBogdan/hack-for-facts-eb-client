/**
 * The act READER — `/legislation/acts/$actId/text` (stenogram-reader model).
 *
 * Composes the three committed layers: the render transport (classified
 * failures, mock/live), the mark-slicing engine, and the fidelity-gated block
 * renderer. What this page shows IS the proven clean text; everything else on
 * it is chrome around that claim.
 *
 * CHUNKED DOCUMENTS are never an infinite scroller hiding extent: the
 * manifest declares "partea N din M" up front, groups load progressively
 * (IntersectionObserver sentinel, with an explicit button as the universal
 * fallback), and a failed group offers retry INLINE without discarding what
 * already renders.
 *
 * FAILURE STATES ARE CONTENT, not apologies: "no servable text",
 * "restricted", "inconsistent" and "transport" each render their own fact,
 * and only retryable ones offer a retry. The portal source link is the
 * escape hatch on every one of them.
 *
 * `?doc=` reads a specific non-canonical expression. `?nod=` (a
 * document_nodes PATH) is validated by the route and reserved: resolving it
 * to a char offset needs the outline surface, wired in the live-API pass.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ExternalLink, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LegalActDetail } from '@/schemas/legal'
import { fetchLegalRender } from '../../api/legal-render-api'
import { useLegalAct } from '../../hooks/use-legal-act'
import { useLegalRender } from '../../hooks/use-legal-render'
import { LegalRenderFailureError } from '../../lib/legal-render-error'
import type { LegalRenderFailure } from '../../lib/legal-render-error'
import type { TldfChunkPayload, TldfManifestPayload } from '../../lib/tldf/types'
import { TldfBlocksView } from './tldf-blocks'

type Props = {
  readonly actId: string
  readonly initialAct?: LegalActDetail | null
  /** `?doc=` — read this expression instead of the canonical document. */
  readonly docOverride?: string
}

export function LegalReaderPage({ actId, initialAct, docOverride }: Props) {
  const actQuery = useLegalAct(actId, initialAct)
  const act = actQuery.data ?? null
  const documentId = docOverride ?? act?.canonical?.documentId ?? null
  const render = useLegalRender(documentId)

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

  return (
    <ReaderShell actId={actId} act={act}>
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
        <article id="reader-content" lang="ro">
          <TldfBlocksView
            blocks={render.data.tldf.blocks}
            marks={render.data.tldf.marks}
            containsNonBmp={render.data.tldf.contains_non_bmp}
          />
        </article>
      )}
      {render.data !== undefined && render.data.kind === 'manifest' && (
        <ChunkedReader documentId={documentId} manifest={render.data.tldf} />
      )}
      {/* The base route never answers `kind: 'chunk'`; the schema union simply carries it. */}
    </ReaderShell>
  )
}

function ReaderShell({
  actId,
  act,
  children,
}: {
  readonly actId: string
  readonly act: LegalActDetail | null
  readonly children: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 print:max-w-none">
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
      </header>
      <main>{children}</main>
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
 */
function ChunkedReader({
  documentId,
  manifest,
}: {
  readonly documentId: string
  readonly manifest: TldfManifestPayload
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
