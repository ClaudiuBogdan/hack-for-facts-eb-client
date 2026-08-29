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
 *
 * TLDF 1.1 adds PRESENTATION kinds (design: scrapper
 * `prod-db/PORTAL_TABLE_CAPTURE_DESIGN.md`), rendered as real HTML structure
 * under the same fidelity invariant. `tabel`/`rand`/`celula` become
 * `<table><tbody><tr><td>` — the `<tbody>` is explicit and the subtree shape
 * is guarded, because the HTML parser FOSTER-PARENTS any non-table content
 * out of a `<table>`, so a server-rendered table carrying stray runs would
 * reparse (and hydrate) into a different tree with characters out of order;
 * an off-contract table subtree keeps the plain-div rendering instead — same
 * characters, nothing for the parser to relocate. `imagine` is a
 * zero-character block whose asset carries NO locator (an image is resolved
 * by BLOCK ID at the server; the envelope never holds a portal URL), so it
 * renders an honest placeholder whose visible label is CSS generated
 * content + `aria-label` — never a text node. `lista`/`element_lista` become
 * real list elements with native markers suppressed: a marker is either
 * already in the character stream or restored from `label` as CSS content,
 * never doubled, never browser-invented. Production still serves format 1.0
 * (which has none of these kinds), so 1.0 documents render exactly as
 * before by construction.
 */

import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { buildMarkIndex, sliceRun, actionableMark } from '../../lib/tldf/marks'
import type { MarkIndex, RunSegment } from '../../lib/tldf/marks'
import { foldTldfBlocks } from '../../lib/tldf/fold'
import type { TldfBlock, TldfMark, TldfRun } from '../../lib/tldf/types'

const logger = createLogger('legal-reader')

/**
 * The compiler's CLOSED kind vocabulary — mirrors `TLDF_KIND_VALUES` in the
 * scrapper's `prod/tldf/format.ts` at format 1.1 (29 kinds: the 23 of v1.0
 * plus the presentation families `tabel`/`rand`/`celula`, `imagine`, and
 * `lista`/`element_lista`), enumerated once instead of discovered one
 * unknown-kind warning at a time. Anything else still takes the plain
 * fallback and logs.
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
  'lista',
  'element_lista',
  'preformatat',
])

const warnedKinds = new Set<string>()
/** Fingerprints of off-contract `tabel` shapes already logged — one warn per
    distinct (clause, child-kinds), not per block. A 13k-row annex that all
    fail the same way must not emit 13k lines. */
const warnedTableShapes = new Set<string>()

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
  // For `tabel` this slot is only the OFF-CONTRACT fallback — a well-formed
  // v1.1 table takes the real `<table>` path in BlockView; a malformed one
  // renders flat, where monospace keeps any space-padded alignment readable.
  tabel: 'mt-4 font-mono text-sm',
  preformatat: 'mt-4 font-mono text-sm',
  // v1.1 source-asserted lists. Native markers are suppressed HERE
  // (`list-none`) — not via Tailwind preflight, which only resets `ol, ul,
  // menu` and would leave an off-contract `element_lista` (an `<li>` outside
  // a `lista`) with a browser-invented bullet on top of the in-stream marker.
  // A marker captured as run text must not be doubled, and an attribute-
  // carried one is restored via LIST_MARKER_CLASS instead. The indent
  // matches the litera/punct grain.
  lista: 'mt-2.5 pl-6 list-none',
  element_lista: 'mt-2.5 list-none',
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
  // Emphasis and strike marks are SEMANTIC, not references: before 2026-08-26
  // every non-link mark fell through to the dotted "unresolved reference"
  // face, so an italic drug name read as a broken citation. `struck` draws
  // the source strike (user decision: visible strikethrough); legal meaning
  // is asserted only by the BLOCK's struck_repealed, never by the mark.
  if (mark.kind === 'italic') return <em>{text}</em>
  if (mark.kind === 'bold') return <strong>{text}</strong>
  if (mark.kind === 'underline') {
    return <span className="underline underline-offset-2">{text}</span>
  }
  if (mark.kind === 'struck') {
    return <s className="text-muted-foreground decoration-[1.5px]">{text}</s>
  }
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
  // Role rows fold into runs, so a struck TTL/DEN/BDY arrives here rather
  // than as a block — same visible-strikethrough treatment (2026-08-26).
  const struckClass = run.struck !== undefined ? STRUCK_TEXT_CLASS : undefined
  return (
    <span
      {...(run.role !== undefined && { 'data-role': run.role })}
      {...(run.struck !== undefined && { 'data-struck': run.struck })}
      {...(cn(roleClass, struckClass) !== '' && {
        className: cn(roleClass, struckClass),
      })}
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

type BlockProps = { readonly block: TldfBlock; readonly marks: MarkIndex }

/**
 * A block's interleaved run/child sequence in FOLD ORDER — runs and children
 * by ascending span start, stable ties keeping document order — plus the
 * visual-only separator collapses. Extracted so every wrapper element (plain
 * div, `<td>`, `<li>`, `<ol>`/`<ul>`, the imagine shell) reproduces exactly
 * the sequence the fold proves; the wrapper varies, the characters never do.
 */
function BlockContent({ block, marks }: BlockProps) {
  // Fold order: runs and children interleave by ascending span start. This is
  // the ONLY ordering that reproduces the proven clean text.
  const items = [
    ...block.content.map((run) => ({ start: run.span[0], run })),
    ...(block.children ?? []).map((child) => ({ start: child.span[0], child })),
  ].sort((a, b) => a.start - b.start)

  // Which separators collapse visually (never textually): a block-leading
  // one — the block-element boundary already breaks the line, so it only
  // painted a phantom blank line — and, on enumeration grains, the one right
  // after the marker run, so "(1)"/"a)" joins its body.
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
    <>
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
    </>
  )
}

/* ── v1.1 presentation rendering ──────────────────────────────────────────── */

/**
 * The document's table face, not an app widget's: a 2px structural outer
 * border, ONE hairline weight inside, zero radius, the reading column's serif
 * inherited at a step down (tables are dense reference material — the CPV/NACE
 * crosswalk annexes), cells top-aligned. Under `border-collapse` the 2px outer
 * edge wins over the 1px cell hairlines at the perimeter, so the two weights
 * never double up.
 */
const TABLE_CLASS =
  'w-full border-collapse border-2 border-[var(--pnrr-border)] text-[0.9375rem] leading-[1.5]'

/**
 * Cell text is "a stack of row-synchronized visual lines", not prose
 * (PORTAL_TABLE_CAPTURE_DESIGN, gaphunt-tables amendment 2: row 8 of the
 * 178667 crosswalk carries 34 hard-wrapped lines per cell) — so the reading
 * column's paragraph margin collapses to a line stack inside cells. Descendant
 * scope on purpose: a nested table's cells want the same.
 */
const CELL_CLASS =
  'border border-[var(--pnrr-subtle)] px-3 py-1.5 align-top [&_[data-kind=paragraf]]:mt-0'

/** Serving smallint bound — mirrors `tldfGridSchema`. The API boundary already
    validates it; re-checked here because tests (and any future caller) can
    feed blocks straight into the renderer. */
const GRID_SPAN_MAX = 32767

/**
 * `grid` → `colSpan`/`rowSpan`. ABSENT is the one canonical 1×1 encoding
 * (spec §3.2 — `grid` is emitted iff it differs from (1,1)), so 1 — or
 * anything malformed (0, negative, fractional, non-numeric) — emits NO
 * attribute: a plain cell, never a throw.
 */
function gridSpanProps(grid: TldfBlock['grid']): {
  readonly colSpan?: number
  readonly rowSpan?: number
} {
  const spanOf = (value: unknown): number | undefined =>
    typeof value === 'number' && Number.isInteger(value) && value > 1 && value <= GRID_SPAN_MAX
      ? value
      : undefined
  const colSpan = spanOf(grid?.cols)
  const rowSpan = spanOf(grid?.rows)
  return {
    ...(colSpan !== undefined && { colSpan }),
    ...(rowSpan !== undefined && { rowSpan }),
  }
}

/** Children in fold order (ascending span start; stable ties keep document
    order — exactly `foldTldfBlocks`'s merge, so cell placement is the proven
    character order). */
const spanOrdered = (children: readonly TldfBlock[] | undefined): readonly TldfBlock[] =>
  [...(children ?? [])].sort((a, b) => a.span[0] - b.span[0])

type TableGuardClause =
  | 'owns_runs'
  | 'no_rows'
  | 'non_rand_child'
  | 'rand_owns_runs'
  | 'non_celula_child'

type TableGuardRejection = {
  readonly clause: TableGuardClause
  readonly childKinds: readonly string[]
}

/**
 * The foster-parenting guard (PORTAL_TABLE_CAPTURE_DESIGN, panel verdict 10):
 * the browser's HTML parser relocates ANY non-table content out of
 * `<table>`/`<tr>`, so a server-rendered table with stray runs or non-row
 * children would reparse — and hydrate — into a different tree, with
 * characters out of order in the live DOM. Only a subtree matching the v1.1
 * contract (`tabel`/`rand` own no runs; rows are `rand`; cells are `celula`)
 * renders as a real table; anything else keeps the plain-div rendering —
 * same characters, nothing for the parser to move. Returns the rejecting
 * clause (and the offending child kinds) so a contract drift is logged
 * instead of silently flattening every table in the corpus.
 */
function tableGuardRejection(block: TldfBlock): TableGuardRejection | null {
  const rows = block.children ?? []
  const childKinds = rows.map((row) => row.kind)
  if (block.content.length !== 0) {
    return { clause: 'owns_runs', childKinds }
  }
  if (rows.length === 0) {
    return { clause: 'no_rows', childKinds }
  }
  if (rows.some((row) => row.kind !== 'rand')) {
    return { clause: 'non_rand_child', childKinds }
  }
  if (rows.some((row) => row.content.length !== 0)) {
    return { clause: 'rand_owns_runs', childKinds }
  }
  const cellKinds = rows.flatMap((row) => (row.children ?? []).map((cell) => cell.kind))
  if (cellKinds.some((kind) => kind !== 'celula')) {
    return { clause: 'non_celula_child', childKinds: cellKinds }
  }
  return null
}

function warnUnrenderableTable(rejection: TableGuardRejection): void {
  const fingerprint = `${rejection.clause}:${rejection.childKinds.join(',')}`
  if (warnedTableShapes.has(fingerprint)) return
  warnedTableShapes.add(fingerprint)
  logger.warn('TLDF tabel failed the renderable-table guard, rendering as plain block', {
    clause: rejection.clause,
    childKinds: rejection.childKinds,
  })
}

function TableBlock({ block, marks }: BlockProps) {
  return (
    // The scroll shell is chrome (a 6-column annex table can outgrow the
    // 78ch column); the table element itself stays the addressable block.
    <div className="mt-4 overflow-x-auto">
      <table
        id={`tldf-${block.id}`}
        data-kind="tabel"
        className={cn(TABLE_CLASS, 'scroll-mt-24')}
      >
        {/* Explicit <tbody>: without it the SSR string serializes `table > tr`,
            the browser reparses it WITH a parser-inserted tbody, and hydration
            mismatches (panel verdict 10). */}
        <tbody>
          {spanOrdered(block.children).map((row) => (
            <tr
              key={row.id}
              id={`tldf-${row.id}`}
              data-kind="rand"
              {...struckAttrsOf(row)}
              className={cn('scroll-mt-24', struckClassOf(row))}
            >
              {spanOrdered(row.children).map((cell) => (
                <td
                  key={cell.id}
                  id={`tldf-${cell.id}`}
                  data-kind="celula"
                  {...struckAttrsOf(cell)}
                  className={cn(CELL_CLASS, 'scroll-mt-24', struckClassOf(cell))}
                  {...gridSpanProps(cell.grid)}
                >
                  {/* A cell MAY own runs (bare `<td>` text) and may carry
                      whole child blocks — including a nested table, which
                      re-enters BlockView and is judged on its own shape. An
                      empty celula renders an empty <td>: dropping it would
                      shift every later cell left (the §3.2 exemption). */}
                  <BlockContent block={cell} marks={marks} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * The `imagine` placeholder face. The visible label is CSS generated content
 * from `data-figure-label` — with `aria-label` carrying the same text for
 * assistive tech — and NEVER a text node: the column's textContent must stay
 * exactly the fold, and an imagine block is a zero-character block. (CSS
 * `attr()` also needs no escaping, unlike a literal `content` string.) Sans
 * type on purpose: the placeholder is our chrome speaking, not the law's
 * serif voice.
 */
const IMAGE_PLACEHOLDER_CLASS =
  'mx-auto flex min-h-24 max-h-96 w-full items-center justify-center whitespace-normal border border-dashed border-[var(--pnrr-subtle)] bg-[var(--pnrr-hover)] px-4 py-6 text-center [font-family:var(--font-family)] text-sm text-[var(--pnrr-muted)] before:content-[attr(data-figure-label)]'

const assetDimension = (value: number | undefined): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined

/**
 * v1.1 `imagine` — an anchored zero-character block. Its asset deliberately
 * carries no locator (no portal URL, no object-store key: the server resolves
 * an image by BLOCK ID, which keeps the reader's browser away from the origin
 * and the privacy gate enforceable). Until that asset endpoint serves bytes,
 * the honest rendering is a placeholder that SAYS what it is — never an empty
 * div, never a broken `<img>`. `alt`, when the source carried one, is the
 * document's own description and leads the label; the compiler can emit
 * `alt: ''` and zero dimensions, which count as absent here.
 */
function ImagineBlock({ block, marks }: BlockProps) {
  const rawAlt = block.asset?.alt
  const alt = typeof rawAlt === 'string' && rawAlt.trim() !== '' ? rawAlt.trim() : undefined
  const label =
    alt !== undefined
      ? t`Figură din actul original: ${alt}`
      : t`Figură din actul original (imagine indisponibilă)`
  const width = assetDimension(block.asset?.width)
  const height = assetDimension(block.asset?.height)
  return (
    <div
      id={`tldf-${block.id}`}
      data-kind="imagine"
      {...struckAttrsOf(block)}
      className={cn('mt-4 scroll-mt-24', block.struck === 'full' && 'opacity-60')}
    >
      <div
        role="img"
        aria-label={label}
        data-figure-label={label}
        className={IMAGE_PLACEHOLDER_CLASS}
        // Declared dimensions shape the placeholder to the figure's footprint
        // so the document keeps its visual rhythm; the min/max clamps keep a
        // degenerate ratio from collapsing or swallowing the column.
        {...(width !== undefined &&
          height !== undefined && {
            style: { aspectRatio: `${String(width)} / ${String(height)}`, maxWidth: width },
          })}
      />
      {/* Contract: imagine owns no text. If a malformed artifact carries runs
          or children anyway, fidelity outranks the contract — render them
          (outside the role="img" shell, so nothing hides from the a11y tree).
          Normally renders nothing. */}
      <BlockContent block={block} marks={marks} />
    </div>
  )
}

/**
 * `element_lista` markers. In the scrapper pipeline BOTH of `markerTextOf`'s
 * paths leave the marker in the character stream: `portal-html-sanitize.ts`
 * `materializeListMarkers` injects the `data-list-text` attribute value as
 * REAL TEXT inside the li's first p/h*, and `preparePortalHtml` — the single
 * preparation both parsers apply — always calls it; `structure-parser.ts`
 * `markerTextOf` then returns that same attribute as the block's `label`
 * (the other path is a leading classless span, also real text). The check
 * below is therefore not a belt-and-braces net for an exotic case: it is
 * the ONLY thing standing between `label` and a doubled marker. Native list
 * markers are suppressed locally (`list-none`); when the item's folded text
 * does not already open with the label as a marker, the label is restored
 * as CSS generated content — visible, zero textContent. Never both, and
 * never a browser-invented number.
 *
 * The materialiser injects the attribute VERBATIM while `markerTextOf`
 * TRIMS it, so a `data-list-text=" I."` divergence (leading space in the
 * stream, trimmed label) is the realistic doubling shape this check exists
 * to catch. Do not "simplify" it away.
 */
function listMarkerOf(block: TldfBlock): string | undefined {
  const label = block.label?.trim()
  if (label === undefined || label === '') return undefined
  return foldedTextOpensWithMarker(foldTldfBlocks([block]), label) ? undefined : label
}

/**
 * True when the item's folded text already opens with `label` as a MARKER,
 * not as a coincidental prefix. `1.` matches `1. Textul` (boundary after the
 * label: end-of-text or a non-alphanumeric) and does not match `1.5% dobanda`.
 * The body is trimStart'd — same trim behaviour `listMarkerOf` has always
 * used; `label` is the already-trimmed value.
 */
function foldedTextOpensWithMarker(folded: string, label: string): boolean {
  const body = folded.trimStart()
  if (!body.startsWith(label)) return false
  const remainder = body.slice(label.length)
  return remainder === '' || !/^[\p{L}\p{N}]/u.test(remainder)
}

/** Applied only alongside `data-list-marker`: an empty `::before` with a
    margin would still paint stray leading space. */
const LIST_MARKER_CLASS = 'before:mr-2 before:content-[attr(data-list-marker)]'

/* ── v1.1 source-state rendering (user decision 2026-08-26) ──────────────── */

/**
 * Visible strikethrough, maximum fidelity first: nothing hidden, nothing
 * moved. A strike alone is SOURCE EVIDENCE — only `struck_repealed` (the
 * validated narrow rule) is allowed to say "abrogat".
 */
const STRUCK_TEXT_CLASS = 'line-through decoration-[1.5px] text-muted-foreground'

function struckClassOf(block: TldfBlock): string | undefined {
  // 'partial' draws via exact `struck` marks; the block face stays upright.
  return block.struck === 'full' ? STRUCK_TEXT_CLASS : undefined
}

function struckAttrsOf(block: TldfBlock): {
  readonly 'data-struck'?: 'partial' | 'full'
  readonly title?: string
} {
  if (block.struck === undefined) return {}
  return {
    'data-struck': block.struck,
    ...(block.struck_repealed === true && { title: t`Text abrogat` }),
  }
}

function BlockView({ block, marks }: BlockProps) {
  if (!KNOWN_KINDS.has(block.kind) && !warnedKinds.has(block.kind)) {
    warnedKinds.add(block.kind)
    logger.warn('Unknown TLDF block kind, rendering as plain block', { kind: block.kind })
  }

  if (block.kind === 'tabel') {
    const rejection = tableGuardRejection(block)
    if (rejection === null) {
      return <TableBlock block={block} marks={marks} />
    }
    warnUnrenderableTable(rejection)
  }
  if (block.kind === 'imagine') {
    return <ImagineBlock block={block} marks={marks} />
  }

  // v1.1 lists take real list elements with no shape guard: unlike tables,
  // the HTML parser never relocates stray content out of a list, so an
  // off-contract child renders in place — invalid markup at worst, but
  // hydration-consistent and character-exact. `rand`/`celula` outside a
  // renderable table deliberately fall through to the plain div.
  const Tag =
    block.kind === 'lista'
      ? block.type === 'OL'
        ? 'ol'
        : 'ul'
      : block.kind === 'element_lista'
        ? 'li'
        : 'div'
  const marker = block.kind === 'element_lista' ? listMarkerOf(block) : undefined

  return (
    <Tag
      id={`tldf-${block.id}`}
      data-kind={block.kind}
      {...(marker !== undefined && { 'data-list-marker': marker })}
      {...struckAttrsOf(block)}
      className={cn(
        BLOCK_CLASS[block.kind],
        displayClass(block),
        marker !== undefined && LIST_MARKER_CLASS,
        struckClassOf(block),
        'scroll-mt-24',
      )}
    >
      <BlockContent block={block} marks={marks} />
    </Tag>
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
