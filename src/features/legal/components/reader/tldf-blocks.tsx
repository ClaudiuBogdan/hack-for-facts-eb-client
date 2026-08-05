/**
 * The pure TLDF block renderer — blocks in, styled reading column out.
 *
 * THE ONE INVARIANT IS TEXT FIDELITY: the rendered text content is EXACTLY
 * the fold of the blocks (`(sep ?? '') + text` per run, runs and children
 * interleaved by span start) — the same sequence whose sha256 the compiler
 * pinned as `text_sha256`. Styling therefore lives entirely on wrapper
 * elements and classes; no element may inject or reorder a single character.
 * Find-in-page, copy/paste and citation all operate on the proven text. The
 * column renders under `whitespace-pre-wrap`, so `\n` separators ARE the
 * line structure.
 *
 * Marks slice runs through the tested engine (`lib/tldf/marks.ts`): resolved
 * act references become router links, unresolved/external ones become honest
 * styled states — never a dead link dressed as a live one. On a document
 * with non-BMP content a mark whose boundary would split a surrogate pair is
 * skipped by the engine (text kept, mark dropped).
 *
 * Unknown block kinds render as plain blocks and are logged ONCE per kind —
 * the vocabulary is open at the parser end, and silence would hide a new
 * kind arriving unstyled.
 */

import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { buildMarkIndex, sliceRun, actionableMark } from '../../lib/tldf/marks'
import { isOutlineHeadingKind } from '../../lib/tldf/outline'
import type { MarkIndex, RunSegment } from '../../lib/tldf/marks'
import type { TldfBlock, TldfMark, TldfRun } from '../../lib/tldf/types'

const logger = createLogger('legal-reader')

/** Block kinds with dedicated styling; anything else takes the plain fallback. */
const KNOWN_KINDS = new Set([
  'carte',
  'parte',
  'titlu',
  'capitol',
  'subcapitol',
  'sectiune',
  'articol',
  'anexa',
  'apendice',
  'alineat',
  'litera',
  'punct',
  'paragraf',
  'nota',
  'semnatura',
  'tabel',
])

const warnedKinds = new Set<string>()

const BLOCK_CLASS: Readonly<Record<string, string>> = {
  carte: 'mt-10',
  parte: 'mt-10',
  titlu: 'mt-8',
  capitol: 'mt-8',
  subcapitol: 'mt-6',
  sectiune: 'mt-6',
  articol: 'mt-6',
  anexa: 'mt-10',
  apendice: 'mt-8',
  alineat: 'mt-2',
  litera: 'mt-1 pl-5',
  punct: 'mt-1 pl-5',
  paragraf: 'mt-2',
  nota: 'mt-2 pl-4 border-l-2 border-muted text-muted-foreground',
  semnatura: 'mt-6 text-muted-foreground',
  tabel: 'mt-4 font-mono text-sm',
}

const RUN_ROLE_CLASS: Readonly<Record<string, string>> = {
  // Heading line of a structural unit ("Articolul 1", "CAPITOLUL II").
  ttl: 'font-semibold text-foreground',
  // Denomination/label run ("LEGE nr. 17").
  den: 'font-medium tracking-wide',
  // Body text — the default reading style.
  bdy: '',
}

type SegmentProps = {
  readonly segment: RunSegment
}

/**
 * One mark-sliced segment. The ACTIONABLE mark (innermost reference with a
 * link, per the engine) decides the element; the text is always the
 * segment's own — a link wraps the law's words, it never rewrites them.
 */
function MarkedSegment({ segment }: SegmentProps) {
  const mark = actionableMark(segment)
  if (mark === null) return <>{segment.text}</>
  return <MarkElement mark={mark} text={segment.text} />
}

function MarkElement({ mark, text }: { readonly mark: TldfMark; readonly text: string }) {
  const link = mark.link
  if (link?.kind === 'act' && typeof link.target_act_id === 'number') {
    return (
      <Link
        to="/legislation/acts/$actId"
        params={{ actId: String(link.target_act_id) }}
        className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
      >
        {text}
      </Link>
    )
  }
  if (link?.kind === 'external' && typeof link.href === 'string') {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline decoration-dotted underline-offset-2"
      >
        {text}
      </a>
    )
  }
  // act_missing_id, internal (wired with the ?nod= navigation pass) and
  // unresolved references: visibly a reference, honestly not a link.
  return (
    <span
      className="underline decoration-dotted decoration-muted-foreground/60 underline-offset-2"
      title={t`Referință legislativă (fără țintă navigabilă)`}
    >
      {text}
    </span>
  )
}

function RunSpan({ run, marks }: { readonly run: TldfRun; readonly marks: MarkIndex }) {
  const sliced = sliceRun(marks, run)
  const roleClass = run.role !== undefined ? RUN_ROLE_CLASS[run.role] : undefined
  return (
    <span {...(roleClass !== undefined && roleClass !== '' && { className: roleClass })}>
      {run.sep ?? ''}
      {sliced.segments.map((segment, i) => (
        <MarkedSegment key={i} segment={segment} />
      ))}
    </span>
  )
}

function BlockView({ block, marks }: { readonly block: TldfBlock; readonly marks: MarkIndex }) {
  if (!KNOWN_KINDS.has(block.kind) && !warnedKinds.has(block.kind)) {
    warnedKinds.add(block.kind)
    logger.warn('Unknown TLDF block kind, rendering as plain block', { kind: block.kind })
  }

  // Fold order: runs and children interleave by ascending span start. This is
  // the ONLY ordering that reproduces the proven clean text.
  const items = [
    ...block.content.map((run) => ({ start: run.span[0], run })),
    ...(block.children ?? []).map((child) => ({ start: child.span[0], child })),
  ].sort((a, b) => a.start - b.start)

  const heading = isOutlineHeadingKind(block.kind)
  return (
    <div
      id={`tldf-${block.id}`}
      data-kind={block.kind}
      className={cn(BLOCK_CLASS[block.kind], heading && 'scroll-mt-24')}
    >
      {items.map((item) =>
        'run' in item ? (
          <RunSpan key={`r${String(item.start)}`} run={item.run} marks={marks} />
        ) : (
          <BlockView key={item.child.id} block={item.child} marks={marks} />
        ),
      )}
    </div>
  )
}

export type TldfBlocksViewProps = {
  readonly blocks: readonly TldfBlock[]
  /** DOCUMENT-level marks (the envelope's; chunk payloads reuse the same array). */
  readonly marks: readonly TldfMark[]
  readonly containsNonBmp: boolean
}

/**
 * The reading column for one block sequence (a whole envelope, or one chunk
 * group of a giant document). `whitespace-pre-wrap` makes the `\n` separators
 * the visible line structure without touching a character.
 */
export function TldfBlocksView({ blocks, marks, containsNonBmp }: TldfBlocksViewProps) {
  const index = useMemo(() => buildMarkIndex(marks, containsNonBmp), [marks, containsNonBmp])
  return (
    <div className="whitespace-pre-wrap leading-7 [content-visibility:auto] [contain-intrinsic-size:auto_1200px]">
      {blocks.map((block) => (
        <BlockView key={block.id} block={block} marks={index} />
      ))}
    </div>
  )
}
