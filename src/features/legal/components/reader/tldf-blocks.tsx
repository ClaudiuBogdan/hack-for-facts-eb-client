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
 * line structure — with two VISUAL exceptions (user decision 2026-08-12,
 * the gap complaint), both `white-space: normal` spans around a separator,
 * never a changed character: a block's LEADING `\n` collapses (the block
 * element already breaks the line, so it only painted a phantom blank line
 * inside every block), and in enumeration blocks (alineat/litera/punct/
 * liniuta) the `\n` between the marker run and its body collapses to a
 * space, so "(1)" and "a)" sit on the same line as their text.
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
import type { MarkIndex, RunSegment } from '../../lib/tldf/marks'
import type { TldfBlock, TldfMark, TldfRun } from '../../lib/tldf/types'

const logger = createLogger('legal-reader')

/**
 * The compiler's CLOSED kind vocabulary — mirrors `TLDF_KIND_VALUES` in the
 * scrapper's `prod/tldf/format.ts` (23 kinds), enumerated once instead of
 * discovered one unknown-kind warning at a time. `tabel` is kept although
 * absent from v1 of that enum. Anything else still takes the plain fallback
 * and logs.
 */
const KNOWN_KINDS = new Set([
  'carte',
  'parte',
  'titlu',
  'titlu_act',
  'subtitlu_act',
  'capitol',
  'subcapitol',
  'sectiune',
  'articol',
  'anexa',
  'apendice',
  'alineat',
  'litera',
  'liniuta',
  'punct',
  'paragraf',
  'bloc',
  'citat',
  'nota',
  'emitent',
  'publicare',
  'semnatura',
  'tabel',
  'rand',
  'celula',
  'imagine',
  'preformatat',
])

const warnedKinds = new Set<string>()

/**
 * The UI sans inside the reader. Tailwind's `font-sans` is NOT mapped to the
 * app's Inter token (`--font-family` lands on `body` only), so headings must
 * reference the token directly or they silently fall back to the system UI
 * stack — measured as `-apple-system` against Inter everywhere else.
 */
const HEAD_FONT = '[&>[data-role=ttl]]:[font-family:var(--font-family)]'

/**
 * Per-kind spacing plus a heading scale. The `[&>[data-role=ttl]]` variants
 * style ONLY the block's own heading runs (children are `div`s, so `>` never
 * reaches their text): the structural ladder steps 30/28/22/19px against the
 * 18px serif body — on a 40.000px document the skeleton has to be visible
 * from type alone — and titlu/capitol carry a hairline rule above. Styling
 * lives entirely on wrappers; the character stream is untouched.
 */
/**
 * Container kinds carry TWO runs: the rank ("Titlul I", role `ttl`) and the
 * denumire ("Dispoziții generale", role `den`). The number is the address,
 * the title is the content — so the rank renders as a small letterspaced
 * eyebrow and the denumire takes the display size. (Child-variant utilities
 * out-specify the run's own role classes, so the per-kind sizes win.) The
 * eyebrow is `:has`-gated: a container WITHOUT a denumire keeps a real
 * heading size instead of degrading to a 14px whisper. `uppercase` here is
 * text-transform — visual only; copy, find-in-page and the fold keep the
 * served characters exactly.
 */
const RANK_EYEBROW =
  '[&:has(>[data-role=den])>[data-role=ttl]]:text-sm [&:has(>[data-role=den])>[data-role=ttl]]:font-bold [&:has(>[data-role=den])>[data-role=ttl]]:uppercase [&:has(>[data-role=den])>[data-role=ttl]]:tracking-wider [&:has(>[data-role=den])>[data-role=ttl]]:text-muted-foreground [&:not(:has(>[data-role=den]))>[data-role=ttl]]:text-[1.375rem] [&:not(:has(>[data-role=den]))>[data-role=ttl]]:font-bold [&:not(:has(>[data-role=den]))>[data-role=ttl]]:tracking-tight'
const DEN_FONT = '[&>[data-role=den]]:[font-family:var(--font-family)]'

const BLOCK_CLASS: Readonly<Record<string, string>> = {
  carte: `mt-16 border-t border-[var(--pnrr-subtle)] pt-8 ${HEAD_FONT} ${RANK_EYEBROW} ${DEN_FONT} [&>[data-role=den]]:text-3xl [&>[data-role=den]]:font-black [&>[data-role=den]]:tracking-tight`,
  parte: `mt-16 border-t border-[var(--pnrr-subtle)] pt-8 ${HEAD_FONT} ${RANK_EYEBROW} ${DEN_FONT} [&>[data-role=den]]:text-3xl [&>[data-role=den]]:font-black [&>[data-role=den]]:tracking-tight`,
  titlu: `mt-16 border-t border-[var(--pnrr-subtle)] pt-8 ${HEAD_FONT} ${RANK_EYEBROW} ${DEN_FONT} [&>[data-role=den]]:text-[1.75rem] [&>[data-role=den]]:font-black [&>[data-role=den]]:tracking-tight`,
  // The document's own masthead — the title lines the law opens with.
  titlu_act: 'text-lg leading-relaxed',
  subtitlu_act: 'text-base leading-relaxed',
  capitol: `mt-11 border-t border-[var(--pnrr-subtle)] pt-6 ${HEAD_FONT} ${RANK_EYEBROW} ${DEN_FONT} [&>[data-role=den]]:text-[1.375rem] [&>[data-role=den]]:font-bold`,
  subcapitol: `mt-8 ${HEAD_FONT} [&>[data-role=ttl]]:text-[1.1875rem] [&>[data-role=ttl]]:font-bold`,
  sectiune: `mt-8 ${HEAD_FONT} [&>[data-role=ttl]]:text-[1.1875rem] [&>[data-role=ttl]]:font-bold`,
  articol: `mt-8 ${HEAD_FONT} [&>[data-role=ttl]]:text-[1.1875rem] [&>[data-role=ttl]]:font-semibold`,
  // Same rank/denumire model as the containers above — "Anexa nr. 1" is
  // usually den-less and takes the :has fallback size.
  anexa: `mt-16 border-t border-[var(--pnrr-subtle)] pt-8 ${HEAD_FONT} ${RANK_EYEBROW} ${DEN_FONT} [&>[data-role=den]]:text-[1.375rem] [&>[data-role=den]]:font-bold`,
  apendice: `mt-11 ${HEAD_FONT} ${RANK_EYEBROW} ${DEN_FONT} [&>[data-role=den]]:font-bold`,
  alineat: 'mt-2.5',
  // Same step as alineat, NOT tighter: at mt-1.5 the gap between two litere
  // matched the leading inside one, so multi-line items (the definitions
  // articles — the densest, most-consulted part of most laws) fused into an
  // unparseable column. Short single-line runs still read as a list.
  litera: 'mt-2.5 pl-6',
  // Dash-items ("– ...") — same list grain as litera/punct.
  liniuta: 'mt-2.5 pl-6',
  punct: 'mt-2.5 pl-6',
  paragraf: 'mt-2.5',
  // A structurally-classified quotation — the same container the
  // OPENS_QUOTED heuristic approximates when the parser didn't mark one.
  citat: 'mt-3 border-l-[3px] border-[var(--pnrr-border)] bg-[var(--pnrr-hover)] py-2 pl-5 pr-3',
  nota: 'mt-3 pl-4 border-l-2 border-muted text-muted-foreground text-[0.95em]',
  // Publication metadata plate (EMITENT / Publicat în) — kept quiet; the
  // fișa above states the same facts with provenance.
  emitent: 'mt-4 text-[0.95em] text-muted-foreground',
  publicare: 'mt-3 text-[0.95em] text-muted-foreground',
  semnatura: 'mt-8 text-muted-foreground',
  // Column-aligned content: a proportional serif destroys the alignment.
  tabel: 'mt-4 font-mono text-sm',
  preformatat: 'mt-4 font-mono text-sm',
}

const RUN_ROLE_CLASS: Readonly<Record<string, string>> = {
  // Heading line of a structural unit ("Articolul 1", "CAPITOLUL II").
  // No color here: emitent/publicare mute their whole block, and a forced
  // `text-foreground` made the same label near-black on one act and muted on
  // another depending on class order.
  ttl: 'font-semibold',
  // Denomination/label run ("LEGE nr. 17") — the document's own masthead.
  den: '[font-family:var(--font-family)] font-semibold tracking-wide',
  // Body text — the default reading style.
  bdy: '',
}

/**
 * Display heuristics over the block's OWN text (children excluded). Both are
 * presentation-only: the characters render exactly as served.
 * - An all-dashes paragraph is the portal's section separator — kept in the
 *   character stream, visually receded to a rule-like line.
 * - A block opening with a quotation mark inside an amending act is the
 *   QUOTED NEW WORDING ("va avea următorul cuprins: «...»") — it gets a
 *   left-rule container so instruction and inserted law stop reading as the
 *   same voice.
 */
const ownText = (block: TldfBlock): string =>
  block.content.map((run) => (run.sep ?? '') + run.text).join('')

/**
 * Enumeration grains whose marker run ("(1)", "a)", "1.", "–") joins its
 * body on one line: the `\n` between them renders as a space (the separator
 * character itself is untouched — see the module docblock).
 */
const INLINE_MARKER_KINDS: ReadonlySet<string> = new Set([
  'alineat',
  'litera',
  'punct',
  'liniuta',
])

const DASH_RULE = /^[\s-–—]{4,}$/
const OPENS_QUOTED = /^\s*["„«]/

function displayClass(block: TldfBlock): string | undefined {
  if (block.kind !== 'paragraf' && block.kind !== 'alineat') return undefined
  const text = ownText(block)
  if (DASH_RULE.test(text) && text.trim() !== '') {
    return 'text-[var(--pnrr-subtle)] select-all overflow-hidden'
  }
  if (OPENS_QUOTED.test(text)) {
    return 'mt-3 border-l-[3px] border-[var(--pnrr-border)] bg-[var(--pnrr-hover)] py-2 pl-5 pr-3'
  }
  return undefined
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

function RunSpan({
  run,
  marks,
  collapseSep = false,
}: {
  readonly run: TldfRun
  readonly marks: MarkIndex
  /** Render the separator in a `white-space: normal` span so it collapses
      visually — the character stays in the text content untouched. */
  readonly collapseSep?: boolean
}) {
  const sliced = sliceRun(marks, run)
  const roleClass = run.role !== undefined ? RUN_ROLE_CLASS[run.role] : undefined
  return (
    <span
      {...(run.role !== undefined && { 'data-role': run.role })}
      {...(roleClass !== undefined && roleClass !== '' && { className: roleClass })}
    >
      {/* Gated on '\n' exactly: the documented exceptions collapse LINE
          BREAKS only — a ' ' separator must keep rendering as the space
          character it is. */}
      {collapseSep && run.sep === '\n' ? (
        <span className="whitespace-normal">{run.sep}</span>
      ) : (
        (run.sep ?? '')
      )}
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

  // Which separators collapse visually (never textually): a block-leading
  // one — the div boundary already breaks the line, so it only painted a
  // phantom blank line — and, on enumeration grains, the one right after
  // the marker run, so "(1)"/"a)" joins its body.
  const inlineMarker = INLINE_MARKER_KINDS.has(block.kind)
  const collapseAt = new Set<number>()
  for (const [index, item] of items.entries()) {
    if (!('run' in item)) continue
    if (index === 0) collapseAt.add(index)
    const previous = items[index - 1]
    if (
      inlineMarker &&
      previous !== undefined &&
      'run' in previous &&
      previous.run.role === 'ttl'
    ) {
      collapseAt.add(index)
    }
  }

  return (
    <div
      id={`tldf-${block.id}`}
      data-kind={block.kind}
      className={cn(BLOCK_CLASS[block.kind], displayClass(block), 'scroll-mt-24')}
    >
      {items.map((item, index) =>
        'run' in item ? (
          <RunSpan
            key={`r${String(item.start)}`}
            run={item.run}
            marks={marks}
            collapseSep={collapseAt.has(index)}
          />
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
/** Recursive character count — sizes the `content-visibility` placeholder. */
function charCount(blocks: readonly TldfBlock[]): number {
  let total = 0
  for (const block of blocks) {
    for (const run of block.content) total += (run.sep?.length ?? 0) + run.text.length
    if (block.children !== undefined) total += charCount(block.children)
  }
  return total
}

export function TldfBlocksView({ blocks, marks, containsNonBmp }: TldfBlocksViewProps) {
  const index = useMemo(() => buildMarkIndex(marks, containsNonBmp), [marks, containsNonBmp])
  // ~0.5px per character at this measure (≈78ch lines, 31.5px line height,
  // legal text's short lines push it up) — a flat 1200px placeholder made a
  // 20.000px document collapse to nothing until scrolled, so every anchor
  // jump landed on ground that then moved.
  const intrinsicHeight = useMemo(
    () => Math.max(1200, Math.round(charCount(blocks) * 0.5)),
    [blocks],
  )
  return (
    // Serif at 18px/1.75 — long-form legal reading, distinct from the sans UI
    // around it (Charter ships on macOS/iOS, Cambria on Windows, Georgia is
    // the floor everywhere); headings return to Inter via the per-kind
    // classes above.
    <div
      className="whitespace-pre-wrap [font-family:Charter,Cambria,Georgia,serif] text-[1.125rem] leading-[1.75] text-[var(--pnrr-fg)] [content-visibility:auto]"
      style={{ containIntrinsicSize: `auto ${String(intrinsicHeight)}px` }}
    >
      {blocks.map((block) => (
        <BlockView key={block.id} block={block} marks={index} />
      ))}
    </div>
  )
}
