import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ImageOff, Link2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { foldTldfBlocks } from '@/features/legal/lib/tldf/fold'
import { actionableMark, buildMarkIndex, sliceRun, type MarkIndex, type RunSegment } from '@/features/legal/lib/tldf/marks'
import type { TldfBlock, TldfMark, TldfRun } from '@/features/legal/lib/tldf/types'

/**
 * The act text in the prototype's skin: a copy of the feature's block renderer (`features/legal/components/reader/
 * tldf-blocks.tsx`) changed in CLASSES AND WRAPPERS ONLY. What that renderer proves is kept as it is: the fold
 * order of runs and children, the two visual separator collapses, the table guard, the image and list-marker
 * rules. The text content of this column is still exactly `foldTldfBlocks(blocks)` (`act.blocks.test.tsx`); every
 * word this skin adds (a state's name, a figure's label) is an attribute drawn as generated content, never a text
 * node. At promotion the classes below move into that renderer; this file is the record of the design.
 *
 * What the skin changes (owner, 26 November 2026: rethink the act page's design):
 * - the site's neutral tokens instead of the `--pnrr-*` set the page still sits on;
 * - the law's words in a serif (owner, 26 November 2026: serif, no switch to the site's sans), our apparatus
 *   (notes on changes, tables, signatures, the publication plate) in the site's sans, a size down;
 * - a heading ladder in sentence case: the rank („Capitolul I") a quiet label, the name the heading;
 * - paragraph and letter markers hang in a gutter, so numbers line up in a column and the text keeps one edge;
 * - a change note that a consolidated form adds after a provision is drawn as a note, not as the law's voice;
 * - a repealed provision says so in words; a provision changed since the base form carries no mark of its own
 *   (owner, 26 November 2026: the change notes under it say it; the gutter bar was on most lines of a real act).
 */

/** The site's sans (Inter): Tailwind's `font-sans` is not mapped to it, so the token is named directly. */
const UI = '[font-family:var(--font-family)]'

/** The law's own face. No font file is added: the serif is the reader's own (Iowan on Apple, Charter, Sitka or Cambria on Windows, Noto Serif on Android and Linux). */
const SERIF = "[font-family:'Iowan_Old_Style',Charter,'Bitstream_Charter','Sitka_Text',Cambria,'Noto_Serif',Georgia,serif]"

/** A heading's two runs in the site's sans: the rank (`ttl`) and the name (`den`). */
const HEAD =
  '[&>[data-role=ttl]]:[font-family:var(--font-family)] [&>[data-role=den]]:[font-family:var(--font-family)] [&>[data-role=den]]:font-semibold [&>[data-role=den]]:tracking-tight'
/** With a name after it the rank is a quiet label; alone it is the heading. */
const RANK =
  '[&:has(>[data-role=den])>[data-role=ttl]]:text-sm [&:has(>[data-role=den])>[data-role=ttl]]:font-medium [&:has(>[data-role=den])>[data-role=ttl]]:text-muted-foreground [&:not(:has(>[data-role=den]))>[data-role=ttl]]:text-xl [&:not(:has(>[data-role=den]))>[data-role=ttl]]:font-semibold [&:not(:has(>[data-role=den]))>[data-role=ttl]]:tracking-tight'
/** A heading that follows its parent's heading directly sits close to it, with no rule of its own between them. */
const FIRST = '[&>[data-role]+[data-kind]]:mt-5 [&>[data-role]+[data-kind]]:border-t-0 [&>[data-role]+[data-kind]]:pt-0'
/** A marker („(1)", „a)", „1.", „–") hung in the gutter of its own block: numbers line up, the text keeps one edge. */
// The marker keeps a gap of its own, so a wide one („a^1)") never touches the text.
const MARKER = '[&>[data-role=ttl]]:float-left [&>[data-role=ttl]]:pr-1.5 [&>[data-role=ttl]]:font-medium [&>[data-role=ttl]]:tabular-nums [&>[data-role=ttl]]:text-foreground/70'
const ITEM = `mt-2 pl-7 sm:pl-9 ${MARKER} [&>[data-role=ttl]]:-ml-7 [&>[data-role=ttl]]:min-w-7 sm:[&>[data-role=ttl]]:-ml-9 sm:[&>[data-role=ttl]]:min-w-9`
const QUOTED = 'mt-4 rounded-r-md border-l-2 border-foreground/30 bg-muted/60 py-3 pl-5 pr-4 [&>*:first-child]:mt-0'

const BLOCK_CLASS: Readonly<Record<string, string>> = {
  carte: `${FIRST} mt-20 border-t border-foreground/20 pt-8 ${HEAD} ${RANK} [&>[data-role=den]]:text-[1.75rem] [&>[data-role=den]]:leading-9`,
  parte: `${FIRST} mt-20 border-t border-foreground/20 pt-8 ${HEAD} ${RANK} [&>[data-role=den]]:text-[1.75rem] [&>[data-role=den]]:leading-9`,
  titlu: `${FIRST} mt-16 border-t pt-7 ${HEAD} ${RANK} [&>[data-role=den]]:text-2xl [&>[data-role=den]]:leading-8`,
  capitol: `${FIRST} mt-12 border-t pt-6 ${HEAD} ${RANK} [&>[data-role=den]]:text-xl [&>[data-role=den]]:leading-7`,
  sectiune: `${FIRST} mt-10 ${HEAD} ${RANK} [&>[data-role=den]]:text-lg [&>[data-role=den]]:leading-7`,
  subcapitol: `${FIRST} mt-10 ${HEAD} ${RANK} [&>[data-role=den]]:text-lg [&>[data-role=den]]:leading-7`,
  // The article's number is the address people cite; its name, where it has one, follows on the same line.
  articol: `group/art relative mt-9 [&>[data-role=ttl]]:[font-family:var(--font-family)] [&>[data-role=ttl]]:text-base [&>[data-role=ttl]]:font-semibold [&>[data-role=den]]:[font-family:var(--font-family)] [&>[data-role=den]]:ml-2 [&>[data-role=den]]:text-base [&>[data-role=den]]:font-normal [&>[data-role=den]]:text-muted-foreground`,
  anexa: `${FIRST} mt-20 border-t border-foreground/20 pt-8 ${HEAD} ${RANK} [&>[data-role=den]]:text-2xl [&>[data-role=den]]:leading-8`,
  apendice: `${FIRST} mt-12 ${HEAD} ${RANK} [&>[data-role=den]]:text-lg [&>[data-role=den]]:leading-7`,
  // The act's own opening lines, shown only where the page head does not already say them.
  titlu_act: `${UI} text-xl font-semibold leading-8 tracking-tight`,
  subtitlu_act: `${UI} text-base leading-7 text-muted-foreground`,
  // From `sm` the paragraph's number hangs in the gutter; on a phone it stays in the line, where the width is the text's.
  alineat: `mt-3 sm:[&:has(>[data-role=ttl])]:pl-10 [&>[data-role=ttl]]:font-medium [&>[data-role=ttl]]:tabular-nums [&>[data-role=ttl]]:text-foreground/70 sm:[&>[data-role=ttl]]:float-left sm:[&>[data-role=ttl]]:-ml-10 sm:[&>[data-role=ttl]]:min-w-10 sm:[&>[data-role=ttl]]:pr-1.5`,
  litera: ITEM,
  punct: ITEM,
  liniuta: ITEM,
  paragraf: 'mt-3',
  citat: QUOTED,
  // The Portal's notes are apparatus, not provisions: the site's sans, a size down, on a quiet ground. A served note
  // holds its lines as notes of their own: one ground for the whole, none for the lines.
  nota: `mt-4 rounded-md bg-muted/60 px-4 py-3 ${UI} text-sm leading-6 text-muted-foreground [&>[data-role=ttl]]:text-foreground [&_[data-kind=paragraf]]:mt-1.5 [&_[data-kind=nota]]:mt-1.5 [&_[data-kind=nota]]:rounded-none [&_[data-kind=nota]]:bg-transparent [&_[data-kind=nota]]:p-0`,
  emitent: `mt-3 ${UI} text-sm leading-6 text-muted-foreground [&>[data-role=ttl]]:font-medium`,
  publicare: `mt-1 ${UI} text-sm leading-6 text-muted-foreground [&>[data-role=ttl]]:font-medium`,
  semnatura: `mt-8 ${UI} text-sm leading-6 text-muted-foreground [&_[data-kind=semnatura]]:mt-0`,
  // Only the off-contract fallback: a well-formed table takes the real `<table>` below.
  tabel: 'mt-4 font-mono text-sm',
  // Drawn layouts keep their columns: no wrapping, the box scrolls sideways.
  preformatat: 'mt-4 overflow-x-auto rounded-md border bg-muted/40 px-4 py-3 font-mono text-[0.8125rem] leading-5 whitespace-pre',
  lista: 'mt-2 list-none pl-7 sm:pl-9',
  element_lista: 'mt-2 list-none',
}

/**
 * The note a consolidated form adds after a changed provision („(la 28-07-2022, Litera m) … a fost modificată de
 * …)"): the Portal's record of a change, not a provision. Drawn as a note in the site's sans, so the law's own
 * text reads on without it.
 */
const AMENDMENT_NOTE = `mt-2 border-l-2 border-primary/30 pl-3 ${UI} text-[0.8125rem] leading-5 text-muted-foreground`
/** A provision changed since the act's base form: a bar in the gutter, its meaning in the element's title. */
const CHANGED = 'relative before:absolute before:-left-3 before:bottom-1 before:top-1 before:w-0.5 before:rounded-full before:bg-primary/60'
const STRUCK = 'text-muted-foreground line-through decoration-[1.5px]'
/** The repealed state in words after the struck text, as generated content from `data-state-label`. */
const STATE_LABEL =
  'after:ml-2 after:inline-block after:content-[attr(data-state-label)] after:[font-family:var(--font-family)] after:text-xs after:font-medium after:text-status-blocked-fg'

/**
 * Other looks of four elements. The owner chose all four from a picture on 26 November 2026; the page asks for
 * them, and the base classes below are the looks they replace. Each is worn from the text's root, by the
 * elements' own attributes, so the blocks below stay as they are and the text is the same text.
 */
/** Struck text with a thin, pale line, and the repealed state as the site's status mark: a ring and the plain word. */
const SKIN_STRUCK_MARK = cn(
  '[&_[data-struck]]:decoration-foreground/40 [&_[data-struck]]:decoration-1 [&_s]:decoration-foreground/40 [&_s]:decoration-1',
  '[&_[data-state-label]]:after:content-none [&_[data-state-mark]]:inline-flex',
)
/**
 * The repealed state as the site's status mark (`LegalStatusBadge`): colour in the ring alone, the word in plain text.
 * An empty element, hidden until the look asks for it; its word is generated content, so the text is unchanged.
 */
const STATE_MARK = `ml-2 hidden items-center gap-1.5 whitespace-nowrap ${UI} text-xs text-foreground/80 before:size-2.5 before:shrink-0 before:rounded-full before:border-[1.5px] before:border-status-blocked-fg before:content-[''] after:content-[attr(data-label)]`
/** Text quoted from another act: set in by a rule alone, without the grey field (the Portal's notes keep the grey). */
const SKIN_QUOTE_RULE =
  '[&_[data-kind=citat]]:rounded-none [&_[data-kind=citat]]:bg-transparent [&_[data-kind=citat]]:py-0.5 [&_[data-quoted]]:rounded-none [&_[data-quoted]]:bg-transparent [&_[data-quoted]]:py-0.5'
/** The note of a change as plain small print under its provision, without the tinted rule. */
// By the attribute alone: an underscore in an arbitrary variant is read as a space, so the value cannot be named.
const SKIN_NOTE_PLAIN = '[&_[data-annotation]]:border-l-0 [&_[data-annotation]]:pl-0'
/**
 * The signatures as the act's closing: in the text's own face and colour, under a short rule. The lines stay one under the
 * other: the text does not say which line is an office and which a name („Contrasemnează:", an office on two
 * lines), so pairing them would be a guess.
 */
const SKIN_SIGNATURE_SET = cn(
  '[&_[data-kind=semnatura]]:text-base [&_[data-kind=semnatura]]:leading-7 [&_[data-kind=semnatura]]:text-foreground [&_[data-kind=semnatura]]:[font-family:inherit]',
  '[&>[data-kind=semnatura]]:w-fit [&>[data-kind=semnatura]]:min-w-56 [&>[data-kind=semnatura]]:border-t [&>[data-kind=semnatura]]:border-foreground/25 [&>[data-kind=semnatura]]:pt-4',
  '[&_:not([data-kind=semnatura])>[data-kind=semnatura]]:w-fit [&_:not([data-kind=semnatura])>[data-kind=semnatura]]:min-w-56 [&_:not([data-kind=semnatura])>[data-kind=semnatura]]:border-t [&_:not([data-kind=semnatura])>[data-kind=semnatura]]:border-foreground/25 [&_:not([data-kind=semnatura])>[data-kind=semnatura]]:pt-4',
)

export type ActTextSkin = {
  readonly struck?: 'red' | 'mark'
  readonly quote?: 'filled' | 'rule'
  readonly note?: 'ruled' | 'plain'
  readonly signature?: 'small' | 'set'
}

const RUN_ROLE_CLASS: Readonly<Record<string, string>> = { ttl: 'font-semibold', den: '', bdy: '' }

const ownText = (block: TldfBlock): string => block.content.map((run) => (run.sep ?? '') + run.text).join('')
const INLINE_MARKER_KINDS: ReadonlySet<string> = new Set(['alineat', 'litera', 'punct', 'liniuta'])
const DASH_RULE = /^[\s-–—]{4,}$/
const OPENS_QUOTED = /^\s*["„«]/

function displayClass(block: TldfBlock): string | undefined {
  if (block.kind !== 'paragraf' && block.kind !== 'alineat') return undefined
  const text = ownText(block)
  // The Portal's row of dashes between sections: kept in the text, drawn faint.
  if (DASH_RULE.test(text) && text.trim() !== '') return 'select-all overflow-hidden text-foreground/25'
  // A paragraph that opens with a quotation mark, in an amending act: the new wording, set apart like a `citat`.
  if (OPENS_QUOTED.test(text)) return QUOTED
  return undefined
}

function MarkedSegment({ segment }: { readonly segment: RunSegment }) {
  const mark = actionableMark(segment)
  if (mark === null) return <>{segment.text}</>
  return <MarkElement mark={mark} text={segment.text} />
}

function MarkElement({ mark, text }: { readonly mark: TldfMark; readonly text: string }) {
  if (mark.kind === 'italic') return <em>{text}</em>
  if (mark.kind === 'bold') return <strong className="font-semibold">{text}</strong>
  if (mark.kind === 'underline') return <span className="underline underline-offset-[3px]">{text}</span>
  if (mark.kind === 'struck') return <s className={STRUCK}>{text}</s>
  const link = mark.link
  if (link?.kind === 'act' && typeof link.target_act_id === 'number') {
    return (
      <Link
        to="/legislation/acts/$actId"
        params={{ actId: String(link.target_act_id) }}
        className="text-primary underline decoration-primary/30 underline-offset-[3px] hover:decoration-primary"
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
        className="text-primary underline decoration-primary/40 decoration-dotted underline-offset-[3px] hover:decoration-solid"
      >
        {text}
      </a>
    )
  }
  // A reference with no target to open: seen as a reference, honestly not a link.
  return (
    <span className="underline decoration-muted-foreground/50 decoration-dotted underline-offset-[3px]" title={t`Referință legislativă (fără țintă navigabilă)`}>
      {text}
    </span>
  )
}

function RunSpan({ run, marks, collapseSep = false }: { readonly run: TldfRun; readonly marks: MarkIndex; readonly collapseSep?: boolean }) {
  const sliced = sliceRun(marks, run)
  const className = cn(run.role !== undefined ? RUN_ROLE_CLASS[run.role] : undefined, run.struck !== undefined && STRUCK)
  return (
    <span {...(run.role !== undefined && { 'data-role': run.role })} {...(run.struck !== undefined && { 'data-struck': run.struck })} {...(className !== '' && { className })}>
      {collapseSep && run.sep === '\n' ? <span className="whitespace-normal">{run.sep}</span> : (run.sep ?? '')}
      {sliced.segments.map((segment, index) => (
        <MarkedSegment key={index} segment={segment} />
      ))}
    </span>
  )
}

/** The skin's option that reaches every block: whether a long note of the Portal shows only its first lines. */
const FoldNotes = createContext(false)
/** A note longer than this many characters is folded, when notes are folded at all. */
const LONG_NOTE = 420

type BlockProps = { readonly block: TldfBlock; readonly marks: MarkIndex; readonly onCopyLink?: ((block: TldfBlock) => void) | undefined }

/**
 * A block's runs and children in fold order. Three separators are drawn as a space and never changed: a block's
 * leading one, the one after an enumeration's marker (both as in the feature's renderer), and, in this skin, the
 * one before an article's name, so „Articolul 3" and „Definiții" share a line.
 */
function BlockContent({ block, marks, onCopyLink }: BlockProps) {
  const items = [...block.content.map((run) => ({ start: run.span[0], run })), ...(block.children ?? []).map((child) => ({ start: child.span[0], child }))].sort(
    (a, b) => a.start - b.start,
  )
  const inlineMarker = INLINE_MARKER_KINDS.has(block.kind)
  const collapseAt = new Set<number>()
  for (const [index, item] of items.entries()) {
    if (!('run' in item)) continue
    if (index === 0) collapseAt.add(index)
    const previous = items[index - 1]
    if (previous === undefined || !('run' in previous) || previous.run.role !== 'ttl') continue
    // The issuer's label and its value, the publication's label and its issue: one line each.
    if (inlineMarker || block.kind === 'emitent' || block.kind === 'publicare' || (block.kind === 'articol' && item.run.role === 'den')) collapseAt.add(index)
  }
  return (
    <>
      {items.map((item, index) =>
        'run' in item ? (
          <RunSpan key={`r${String(item.start)}`} run={item.run} marks={marks} collapseSep={collapseAt.has(index)} />
        ) : (
          <BlockView key={item.child.id} block={item.child} marks={marks} onCopyLink={onCopyLink} />
        ),
      )}
    </>
  )
}

/* ── tables, figures, lists ──────────────────────────────────────────────── */

const TABLE_REGION_LABEL = 'Tabel din act, derulabil orizontal'
/** Reference material, not prose: the site's sans, a size down, figures in columns, one hairline weight, the frame on the scroll shell. */
const TABLE_CLASS = `w-full border-collapse border-hidden ${UI} text-sm leading-5 tabular-nums`
const CELL_CLASS = 'border px-3 py-2 align-top [&_[data-kind=paragraf]]:mt-0'
const GRID_SPAN_MAX = 32767

function gridSpanProps(grid: TldfBlock['grid']): { readonly colSpan?: number; readonly rowSpan?: number } {
  const spanOf = (value: unknown): number | undefined => (typeof value === 'number' && Number.isInteger(value) && value > 1 && value <= GRID_SPAN_MAX ? value : undefined)
  const colSpan = spanOf(grid?.cols)
  const rowSpan = spanOf(grid?.rows)
  return { ...(colSpan !== undefined && { colSpan }), ...(rowSpan !== undefined && { rowSpan }) }
}

const spanOrdered = (children: readonly TldfBlock[] | undefined): readonly TldfBlock[] => [...(children ?? [])].sort((a, b) => a.span[0] - b.span[0])

/** The feature renderer's guard, unchanged: only a subtree on the table contract becomes a real `<table>`. */
function isRenderableTable(block: TldfBlock): boolean {
  const rows = block.children ?? []
  if (block.content.length !== 0 || rows.length === 0) return false
  if (rows.some((row) => row.kind !== 'rand' || row.content.length !== 0)) return false
  return !rows.some((row) => (row.children ?? []).some((cell) => cell.kind !== 'celula'))
}

/**
 * How a table wider than the column says so (owner, 26 November 2026, the text's elements): `plain`, it scrolls in
 * its frame and says nothing; `hint`, a line under it says it goes on to the right; `open`, that line also opens the
 * table at the window's width. The line's words are generated content: the text of the page is unchanged.
 */
const TableStyle = createContext<'plain' | 'hint' | 'open'>('plain')
/** A figure the act has but this page cannot show: `box`, a frame of the figure's size; `line`, one line that says so. */
const FigureStyle = createContext<'box' | 'line'>('box')

function TableRows({ block, marks, ids }: BlockProps & { readonly ids: boolean }) {
  return (
    <tbody>
      {spanOrdered(block.children).map((row) => (
        <tr key={row.id} {...(ids && { id: `tldf-${row.id}` })} data-kind="rand" {...struckAttrsOf(row)} className={cn('scroll-mt-24', struckClassOf(row))}>
          {spanOrdered(row.children).map((cell) => (
            <td
              key={cell.id}
              {...(ids && { id: `tldf-${cell.id}` })}
              data-kind="celula"
              {...struckAttrsOf(cell)}
              className={cn(CELL_CLASS, 'scroll-mt-24', struckClassOf(cell))}
              {...gridSpanProps(cell.grid)}
            >
              <BlockContent block={cell} marks={marks} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

function TableBlock({ block, marks }: BlockProps) {
  const style = useContext(TableStyle)
  const frame = useRef<HTMLDivElement>(null)
  const [wide, setWide] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const element = frame.current
    if (element === null || style === 'plain' || typeof ResizeObserver === 'undefined') return
    const measure = () => setWide(element.scrollWidth > element.clientWidth + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [style])
  return (
    <>
      <div ref={frame} className="mt-5 overflow-x-auto rounded-md border" tabIndex={0} role="region" aria-label={TABLE_REGION_LABEL}>
        <table id={`tldf-${block.id}`} data-kind="tabel" className={cn(TABLE_CLASS, 'scroll-mt-24')}>
          <TableRows block={block} marks={marks} ids />
        </table>
      </div>
      {wide ? (
        <div className={cn('mt-1.5 flex flex-wrap items-center justify-between gap-x-4 whitespace-normal text-xs leading-5 text-muted-foreground', UI)}>
          <span aria-hidden="true" data-label={t`Tabelul continuă la dreapta: derulează-l.`} className="before:content-[attr(data-label)]" />
          {style === 'open' ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={t`Deschide tabelul pe toată lățimea ferestrei`}
              data-label={t`Deschide tabelul`}
              // From `sm`: on a phone the window is no wider than the column, so opening the table there gains nothing.
              className="hidden min-h-8 items-center font-medium text-foreground underline decoration-foreground/30 underline-offset-4 before:content-[attr(data-label)] hover:decoration-foreground sm:inline-flex"
            />
          ) : null}
        </div>
      ) : null}
      {open ? (
        // Outside the text's column (a portal): the same rows, at the window's width, without the anchors' ids.
        <Dialog open onOpenChange={setOpen}>
          <DialogContent className="flex max-h-[90dvh] w-[min(96vw,84rem)] max-w-none flex-col gap-3 p-4 sm:p-5">
            <DialogTitle className={cn('text-sm font-medium', UI)}>{t`Tabel din act`}</DialogTitle>
            <div className={cn('overflow-auto rounded-md border', SERIF)}>
              <table className={TABLE_CLASS}>
                <TableRows block={block} marks={marks} ids={false} />
              </table>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}

const FIGURE_CLASS = `mx-auto flex min-h-24 max-h-96 w-full items-center justify-center whitespace-normal rounded-md border border-dashed border-foreground/25 bg-muted/40 px-4 py-6 text-center ${UI} text-sm text-muted-foreground before:content-[attr(data-figure-label)]`
const assetDimension = (value: number | undefined): number | undefined => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined)

function ImagineBlock({ block, marks }: BlockProps) {
  const line = useContext(FigureStyle) === 'line'
  const rawAlt = block.asset?.alt
  const alt = typeof rawAlt === 'string' && rawAlt.trim() !== '' ? rawAlt.trim() : undefined
  const label = alt !== undefined ? t`Figură din actul original: ${alt}` : t`Figură din actul original (imagine indisponibilă)`
  const width = assetDimension(block.asset?.width)
  const height = assetDimension(block.asset?.height)
  return (
    <div id={`tldf-${block.id}`} data-kind="imagine" {...struckAttrsOf(block)} className={cn('mt-5 scroll-mt-24', block.struck === 'full' && 'opacity-60')}>
      {line ? (
        // The figure is not served: one line says so, where a frame of the figure's size showed only emptiness.
        <div
          role="img"
          aria-label={label}
          data-figure-label={label}
          className={cn(
            'flex min-h-11 items-center gap-2.5 whitespace-normal rounded-md border border-dashed border-foreground/25 px-3 py-2 text-sm text-muted-foreground before:order-2 before:content-[attr(data-figure-label)]',
            UI,
          )}
        >
          <ImageOff className="size-4 shrink-0" aria-hidden="true" />
        </div>
      ) : (
        <div
          role="img"
          aria-label={label}
          data-figure-label={label}
          className={FIGURE_CLASS}
          {...(width !== undefined && height !== undefined && { style: { aspectRatio: `${String(width)} / ${String(height)}`, maxWidth: width } })}
        />
      )}
      <BlockContent block={block} marks={marks} />
    </div>
  )
}

function listMarkerOf(block: TldfBlock): string | undefined {
  const label = block.label?.trim()
  if (label === undefined || label === '') return undefined
  const body = foldTldfBlocks([block]).trimStart()
  const opens = body.startsWith(label) && (body.length === label.length || !/^[\p{L}\p{N}]/u.test(body.slice(label.length)))
  return opens ? undefined : label
}
const LIST_MARKER_CLASS = 'before:mr-2 before:inline-block before:min-w-6 before:font-medium before:text-foreground/70 before:content-[attr(data-list-marker)]'

function struckClassOf(block: TldfBlock): string | undefined {
  return block.struck === 'full' ? STRUCK : undefined
}

function struckAttrsOf(block: TldfBlock): { readonly 'data-struck'?: 'partial' | 'full'; readonly title?: string; readonly 'data-state-label'?: string } {
  if (block.struck === undefined) return {}
  // Only the validated rule may say „abrogat": a strike alone is what the source shows, not a legal state.
  return { 'data-struck': block.struck, ...(block.struck_repealed === true && { title: t`Text abrogat`, 'data-state-label': t`abrogat` }) }
}

/**
 * A long note of the Portal (the transitional provisions of amending acts that a consolidated form carries at its
 * head run to a screen or more), folded to its first lines. Every word stays in the page: find-in-page and copy
 * still reach it. The control's words are generated content, so the text of the page is unchanged.
 */
function FoldedNote({ block, marks, onCopyLink }: BlockProps) {
  const [open, setOpen] = useState(false)
  return (
    <div id={`tldf-${block.id}`} data-kind="nota" className={cn(BLOCK_CLASS.nota, 'scroll-mt-24')}>
      <div
        className={cn(
          !open &&
            'relative max-h-[8.25rem] overflow-hidden after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-10 after:bg-gradient-to-t after:from-muted after:to-transparent',
        )}
      >
        {/* One fold for the whole note: a long line inside it is not folded again. */}
        <FoldNotes.Provider value={false}>
          <BlockContent block={block} marks={marks} onCopyLink={onCopyLink} />
        </FoldNotes.Provider>
      </div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? t`Arată mai puțin din notă` : t`Arată toată nota`}
        data-label={open ? t`Arată mai puțin` : t`Arată toată nota`}
        className="mt-1 inline-flex min-h-11 items-center whitespace-normal font-medium text-foreground underline decoration-foreground/30 underline-offset-4 before:content-[attr(data-label)] hover:decoration-foreground sm:min-h-9"
      />
    </div>
  )
}

function BlockView({ block, marks, onCopyLink }: BlockProps) {
  const foldNotes = useContext(FoldNotes)
  if (block.kind === 'tabel' && isRenderableTable(block)) return <TableBlock block={block} marks={marks} />
  if (foldNotes && block.kind === 'nota' && block.struck === undefined && block.span[1] - block.span[0] > LONG_NOTE)
    return <FoldedNote block={block} marks={marks} onCopyLink={onCopyLink} />
  if (block.kind === 'imagine') return <ImagineBlock block={block} marks={marks} />

  const Tag = block.kind === 'lista' ? (block.type === 'OL' ? 'ol' : 'ul') : block.kind === 'element_lista' ? 'li' : 'div'
  const marker = block.kind === 'element_lista' ? listMarkerOf(block) : undefined
  const note = block.annotation_role === 'amendment_note'
  const changed = block.changed_since_base_form === true && !note
  const display = note ? undefined : displayClass(block)
  const scroll = block.kind === 'preformatat'
  return (
    <Tag
      id={`tldf-${block.id}`}
      data-kind={block.kind}
      {...(note && { 'data-annotation': 'amendment_note' })}
      {...(display === QUOTED && { 'data-quoted': '' })}
      {...(marker !== undefined && { 'data-list-marker': marker })}
      {...struckAttrsOf(block)}
      {...(changed && { 'data-changed': 'true', title: t`Modificat față de forma de bază a actului` })}
      {...(scroll && { tabIndex: 0, role: 'region', 'aria-label': t`Text aliniat pe coloane, derulabil orizontal` })}
      className={cn(
        note ? AMENDMENT_NOTE : BLOCK_CLASS[block.kind],
        display,
        marker !== undefined && LIST_MARKER_CLASS,
        struckClassOf(block),
        block.struck_repealed === true && STATE_LABEL,
        changed && CHANGED,
        'scroll-mt-24',
      )}
    >
      {block.kind === 'articol' && onCopyLink !== undefined ? (
        // An icon alone, so the article's text content is unchanged. From `lg`, in the gutter, on hover or focus.
        <button
          type="button"
          onClick={() => onCopyLink(block)}
          aria-label={t`Copiază legătura către ${block.label ?? t`acest articol`}`}
          className="absolute -left-11 -top-1.5 hidden size-10 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/art:opacity-100 lg:inline-flex"
        >
          <Link2 className="size-4" aria-hidden="true" />
        </button>
      ) : null}
      <BlockContent block={block} marks={marks} onCopyLink={onCopyLink} />
      {block.struck_repealed === true ? <span aria-hidden="true" data-state-mark="" data-label={t`abrogat`} className={STATE_MARK} /> : null}
    </Tag>
  )
}

/** Recursive character count: sizes the `content-visibility` placeholder, as in the feature's renderer. */
function charCount(blocks: readonly TldfBlock[]): number {
  let total = 0
  for (const block of blocks) {
    for (const run of block.content) total += (run.sep?.length ?? 0) + run.text.length
    if (block.children !== undefined) total += charCount(block.children)
  }
  return total
}

const NO_SKIN: ActTextSkin = {}

export function ActBlocks({
  blocks,
  marks,
  containsNonBmp,
  changedMark = false,
  foldNotes = false,
  tableStyle = 'plain',
  figureStyle = 'box',
  skin = NO_SKIN,
  onCopyLink,
}: {
  readonly blocks: readonly TldfBlock[]
  readonly marks: readonly TldfMark[]
  readonly containsNonBmp: boolean
  /** True draws a bar in the gutter of the provisions changed since the base form. Off by the owner's decision: their change notes say it. */
  readonly changedMark?: boolean
  /** True shows only the first lines of a long note of the Portal, with a control that opens it. */
  readonly foldNotes?: boolean
  /** How a table wider than the column says so, see `TableStyle`. */
  readonly tableStyle?: 'plain' | 'hint' | 'open'
  /** How a figure that is not served is drawn, see `FigureStyle`. */
  readonly figureStyle?: 'box' | 'line'
  /** Other looks of struck text, quoted text, change notes and signatures, see `ActTextSkin`. */
  readonly skin?: ActTextSkin
  /** Given, each article carries a „copy link" control in the gutter. */
  readonly onCopyLink?: (block: TldfBlock) => void
}) {
  const index = useMemo(() => buildMarkIndex(marks, containsNonBmp), [marks, containsNonBmp])
  const intrinsicHeight = useMemo(() => Math.max(1200, Math.round(charCount(blocks) * 0.5)), [blocks])
  return (
    <div
      className={cn(
        'whitespace-pre-wrap text-[1.0625rem] leading-[1.7] text-foreground [content-visibility:auto] sm:text-lg sm:leading-[1.75] [&>*:first-child]:mt-0',
        SERIF,
        !changedMark && '[&_[data-changed]]:before:hidden',
        skin.struck === 'mark' && SKIN_STRUCK_MARK,
        skin.quote === 'rule' && SKIN_QUOTE_RULE,
        skin.note === 'plain' && SKIN_NOTE_PLAIN,
        skin.signature === 'set' && SKIN_SIGNATURE_SET,
      )}
      style={{ containIntrinsicSize: `auto ${String(intrinsicHeight)}px` }}
    >
      <FoldNotes.Provider value={foldNotes}>
        <TableStyle.Provider value={tableStyle}>
          <FigureStyle.Provider value={figureStyle}>
            {blocks.map((block) => (
              <BlockView key={block.id} block={block} marks={index} onCopyLink={onCopyLink} />
            ))}
          </FigureStyle.Provider>
        </TableStyle.Provider>
      </FoldNotes.Provider>
    </div>
  )
}
