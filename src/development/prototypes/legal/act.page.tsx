import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowLeft, ArrowRight, ArrowUpRight, List } from 'lucide-react'
import { DataStatusBadge } from '@/components/data-trust/data-status-badge'
import { Button } from '@/components/ui/button'
import { ChoiceSelect } from '@/components/ui/choice-select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { LegalStatusBadge } from '@/features/legal/components/legal-status-badge'
import { uniqueGazettePublication } from '@/features/legal/lib/act-facts'
import { formatLegalDate, formatLegalNumber } from '@/features/legal/lib/legal-format'
import { isConsolidationVersion, isSelectableVersion, orderVersionsNewestFirst, portalConsolidationNote, versionDateOf, versionKindLabel, type ShownVersion } from '@/features/legal/lib/legal-versions'
import { legalActTypeLabel, legalGazettePartLabel, legalIssuerLabel, legalNodeKindLabel, legalRelationLabel } from '@/features/legal/lib/legal-vocabulary'
import { domAnchorForPath } from '@/features/legal/lib/tldf/nod-resolve'
import type { TldfBlock, TldfMark } from '@/features/legal/lib/tldf/types'
import { cn } from '@/lib/utils'
import type { LegalActDetail, LegalOutlineEntry, LegalReferenceGroup } from '@/schemas/legal'
import { ActBlocks } from './act.blocks'

/**
 * The act page, rethought (owner, 26 November 2026: header, side panel, closing section and the page's elements).
 * A view over a plain model, so the same page is drawn from the specimen (no read) and from a served act.
 *
 * The idea: the text is the page, and the reader always knows three things without scrolling back: which act, which
 * form of its text, and where in it they are. So the page has four parts and no boxes around them:
 * 1. a head that names the act in the site's own type (no more the heavy 3rem title on the old token set): the
 *    status as a mark, the citation, what the act is about, and three facts in one line;
 * 2. a slim bar that stays at the top while reading: the contents button on a phone, the place in the act
 *    („Capitolul I › Secțiunea a 2-a › Articolul 3") and the form shown;
 * 3. the contents beside the text: headings as a short outline, and the articles as a grid of numbers under their
 *    heading (a law's articles are addresses, people look them up by number), with a field that jumps to one;
 * 4. after the text, the act's record as plain rows (publication, forms, changes, references, source) instead of
 *    one accordion: each row a label and what is known, long lists cut with their size said.
 *
 * Kept from the page's recorded decisions: the text on the same page and first; the served outline as the only
 * navigation; nothing hidden (struck text stays visible); the summary's and the consolidated form's sentences
 * word for word. Changed, each for the owner to confirm: the form selector moves into the line above the text
 * and the reading bar names the form; the record is rows, not an accordion.
 */

export type ActPageModel = {
  readonly act: LegalActDetail
  /** What the act is about („privind achizițiile publice"), when the text's own masthead gave it. */
  readonly subject: string | null
  /** The form whose text is on screen (the listed version, with what the render says it served laid over it). */
  readonly shown: ShownVersion | null
  readonly blocks: readonly TldfBlock[]
  readonly marks: readonly TldfMark[]
  readonly containsNonBmp: boolean
  readonly outline: readonly LegalOutlineEntry[]
  /** The outline's read, when it is not simply there: the contents never says „none" while it loads or after it failed. */
  readonly outlineState?: 'pending' | 'failed'
  /**
   * For a text served in parts: asked when a place of the outline is not on the page. True when its part is now
   * being read; the page then goes there once the part arrives.
   */
  readonly onReach?: (path: string) => boolean
  /**
   * How a provision changed since the act's base form is marked. Owner, 26 November 2026: no mark, the change notes
   * under the provisions say it. The bar in the gutter and the bar with a line that explains it were the other two.
   */
  readonly changedMark?: 'bar' | 'legend' | 'none'
  /** Made-up data: the page says so beside the status. */
  readonly mock: boolean
  readonly onForm?: (documentId: string) => void
  /**
   * How much room the text's apparatus takes above the text (owner, 26 November 2026: can this part be cleaner on
   * a desktop; what must stay, what can be folded or moved aside). The owner chose `rail`, from a picture of the three:
   * - `full`: the version, the whole notice of the unofficial form, the warnings, then the text;
   * - `compact`: one line for the version and the notice's first sentence, the rest behind „Detalii"; the warnings
   *   go under the summary they qualify; a long note of the Portal shows its first lines;
   * - `rail`: on a wide screen all of it moves to a column at the text's right that stays in view; narrower, as
   *   `compact`.
   */
  readonly apparatus?: 'full' | 'compact' | 'rail'
  /** The act's warnings (the live page's component), placed by `apparatus`. */
  readonly warnings?: ReactNode
  /** What must be said about the text before it is read (the live page's own notices), between the form line and the text. */
  readonly notices?: ReactNode
  /** Shown in the text's place while it loads or when it cannot be shown. */
  readonly textState?: ReactNode
  /** After the text: the next part's control, for a text served in parts. */
  readonly afterText?: ReactNode
}

/** The page's one grid: the contents' column and the reading column, shared by the head, the bar and the body. */
const GRID = 'mx-auto grid w-full max-w-6xl grid-cols-1 px-4 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-x-12'
const COLUMN = 'min-w-0 max-w-[42rem]'
const LINK = 'font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary'
const CONTROL = 'h-11 sm:h-10'
/** A control that opens more of the same page. Not blue: blue is for a link that goes somewhere (owner, 26 November 2026). */
const MORE = 'font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground'
/** With the side column: from 88rem a wider page, the same left edge for the head, the bar and the body; narrower, the usual width. */
const GRID_WIDE = 'mx-auto grid w-full max-w-6xl grid-cols-1 px-4 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-x-12 min-[88rem]:max-w-[84rem]'

/* ── notices and states: the page's small vocabulary ─────────────────────── */

type Tone = 'neutral' | 'caution' | 'blocked'
const TONE_RULE: Readonly<Record<Tone, string>> = { neutral: 'border-foreground/30', caution: 'border-status-partial-fg', blocked: 'border-status-blocked-fg' }

/** Something to know about what is shown: a rule in the tone's colour, the first sentence in full weight, no box. */
export function ActNotice({ tone = 'neutral', title, children, action }: { readonly tone?: Tone; readonly title: ReactNode; readonly children?: ReactNode; readonly action?: ReactNode }) {
  return (
    <div role="note" className={cn('border-l-2 py-0.5 pl-4 text-sm leading-6', TONE_RULE[tone])}>
      <p className="font-medium text-foreground">{title}</p>
      {children !== undefined ? <div className="text-muted-foreground">{children}</div> : null}
      {action !== undefined ? <div className="mt-1.5">{action}</div> : null}
    </div>
  )
}

/** The text's place when there is no text to show: what happened, what it means, one way forward. */
export function ActTextState({ title, children, action }: { readonly title: ReactNode; readonly children?: ReactNode; readonly action?: ReactNode }) {
  return (
    <div className="rounded-md border px-5 py-6">
      <p className="text-base font-medium">{title}</p>
      {children !== undefined ? <p className="mt-1 max-w-prose text-sm leading-6 text-muted-foreground">{children}</p> : null}
      {action !== undefined ? <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">{action}</div> : null}
    </div>
  )
}

/** The text while it loads: lines of the reading column's own measure, so nothing jumps when the text arrives. */
export function ActTextLoading() {
  return (
    <div role="status" aria-label={t`Se încarcă textul…`} className="space-y-3 py-2">
      {['w-1/3', 'w-full', 'w-11/12', 'w-full', 'w-4/5', 'w-1/4', 'w-full', 'w-10/12'].map((width, index) => (
        <div key={index} className={cn('h-4 animate-pulse rounded bg-muted motion-reduce:animate-none', width, (index === 0 || index === 5) && 'mt-8 h-5')} />
      ))}
    </div>
  )
}

export function SourceLink({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  return (
    // Inline, so the arrow stays with the last word when the link wraps in a narrow column.
    <a href={href} target="_blank" rel="noopener noreferrer" className={cn(LINK, 'text-sm')}>
      {children}
      <ArrowUpRight className="ml-1 inline size-3.5 align-[-2px]" aria-hidden="true" />
    </a>
  )
}

/* ── the head ────────────────────────────────────────────────────────────── */

function BackLink({ className }: { readonly className?: string }) {
  return (
    <Link to="/legislation" className={cn('inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground sm:min-h-10', className)}>
      <ArrowLeft className="size-4" aria-hidden="true" />
      <Trans>Legislația României</Trans>
    </Link>
  )
}

function ActHead({ act, subject, mock, grid }: Pick<ActPageModel, 'act' | 'subject' | 'mock'> & { readonly grid: string }) {
  const { i18n } = useLingui()
  const den = act.canonical?.den ?? null
  const publication = uniqueGazettePublication(act)
  // The same facts, in the same words and at the same weight as the live head: nothing is promoted here.
  const moCitation =
    publication !== null && publication.issueNumber !== null
      ? [`nr. ${String(publication.issueNumber)}`, publication.partCode !== null ? `(${legalGazettePartLabel(publication.partCode)})` : null, publication.issueDate !== null ? `din ${formatLegalDate(publication.issueDate, i18n.locale)}` : null]
          .filter((part): part is string => part !== null)
          .join(' ')
      : null
  const classification = [
    legalActTypeLabel(act.actType),
    act.issuerSlug !== null ? legalIssuerLabel(act.issuerSlug) : null,
    act.entryIntoForce !== null ? t`în vigoare din ${formatLegalDate(act.entryIntoForce, i18n.locale)}` : null,
    act.aliases.length > 0 ? t`cunoscut și ca ${act.aliases.join(', ')}` : null,
  ].filter((part): part is string => part !== null)
  return (
    <header className={cn(grid, 'pb-7 pt-4 sm:pb-9 lg:pt-8')}>
      <div className="hidden lg:block">
        <BackLink className="-mt-2.5" />
      </div>
      <div className={COLUMN}>
        <BackLink className="lg:hidden" />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <LegalStatusBadge status={act.status} strong />
          {mock ? <DataStatusBadge status="mock" /> : null}
        </div>
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{act.displayCitation}</h1>
        {subject !== null ? <p className="mt-2 text-lg leading-7 text-muted-foreground sm:text-xl sm:leading-8">{subject}</p> : null}
        <div className="mt-5 space-y-1 text-sm leading-6 text-muted-foreground">
          {den !== null && den !== act.displayCitation ? <p className="text-foreground">{den}</p> : null}
          {classification.length > 0 ? (
            <ul className="flex flex-col gap-x-6 gap-y-1 sm:flex-row sm:flex-wrap">
              {classification.map((part) => (
                <li key={part}>{part}</li>
              ))}
            </ul>
          ) : null}
          {moCitation !== null ? (
            <p>
              <Trans>Publicat în Monitorul Oficial {moCitation}</Trans>
            </p>
          ) : null}
          {act.dataSource === 'legal_v2' ? (
            <p className="text-xs leading-5">
              {act.bridgedFields.length > 0 ? (
                <Trans>Starea, legăturile și rezumatul provin din corpusul anterior.</Trans>
              ) : (
                <Trans>Starea, legăturile și rezumatul nu sunt disponibile pentru acest act: corpusul anterior nu îl conține.</Trans>
              )}
            </p>
          ) : null}
        </div>
      </div>
    </header>
  )
}

/* ── the contents ────────────────────────────────────────────────────────── */

const isArticle = (entry: LegalOutlineEntry): boolean => entry.nodeKind === 'articol'
const entryLabel = (entry: LegalOutlineEntry): string => entry.label ?? legalNodeKindLabel(entry.nodeKind)
/** An article's short address in the grid: its number, else its label without the word „Articolul". */
const articleKey = (entry: LegalOutlineEntry): string => entry.numberKey ?? entryLabel(entry).replace(/^Art(?:icolul|\.)\s*/iu, '')

/** „8^1" is how the outline writes article 8¹: the index is drawn raised, as the law prints it. */
function ArticleNumber({ value }: { readonly value: string }) {
  const [base, index] = value.split('^')
  if (index === undefined || base === undefined) return <>{value}</>
  return (
    <>
      {base}
      <sup className="text-[0.65em]">{index}</sup>
    </>
  )
}

type ContentsRow = { readonly kind: 'heading'; readonly entry: LegalOutlineEntry; readonly level: number } | { readonly kind: 'articles'; readonly entries: readonly LegalOutlineEntry[]; readonly level: number }

/** The served outline as rows: a heading at its nesting level, then the run of articles under it as one grid. */
function contentsRows(outline: readonly LegalOutlineEntry[]): readonly ContentsRow[] {
  const rows: ContentsRow[] = []
  // A heading stays open while the next entries are below its rank AND inside its span of the text: some outlines
  // serve an annex in the middle of the articles (LEG-CEJT), and rank alone would nest the next title under it.
  const open: { readonly depth: number; readonly end: number | null }[] = []
  const inside = (parent: { readonly end: number | null }, entry: LegalOutlineEntry) => parent.end === null || entry.charStart === null || entry.charStart < parent.end
  let run: LegalOutlineEntry[] | null = null
  for (const entry of outline) {
    while (open.length > 0 && !inside(open[open.length - 1] ?? { end: null }, entry)) {
      open.pop()
      run = null
    }
    if (isArticle(entry)) {
      if (run === null) {
        run = []
        rows.push({ kind: 'articles', entries: run, level: open.length })
      }
      run.push(entry)
      continue
    }
    run = null
    while (open.length > 0 && (open[open.length - 1]?.depth ?? 0) >= entry.depth) open.pop()
    rows.push({ kind: 'heading', entry, level: open.length })
    open.push({ depth: entry.depth, end: entry.charEnd })
  }
  return rows
}

type ContentsProps = {
  readonly outline: readonly LegalOutlineEntry[]
  /** A heading's name by path („Dispoziții generale"): the outline serves the rank alone, the text holds the name. */
  readonly names: ReadonlyMap<string, string>
  readonly activePath: string | null
  /** The active entry's ancestors, lit a step quieter than the entry itself. */
  readonly trail: ReadonlySet<string>
  readonly onGo: (path: string) => void
  /** In the phone's sheet: 44px targets. */
  readonly touch?: boolean
}

function GoToArticle({ outline, onGo, touch }: Pick<ContentsProps, 'outline' | 'onGo' | 'touch'>) {
  const [missing, setMissing] = useState<string | null>(null)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const asked = String(new FormData(event.currentTarget).get('articol') ?? '')
      .trim()
      .replace(/^art(?:icolul|\.)?\s*/iu, '')
    if (asked === '') return
    const found = outline.find((entry) => isArticle(entry) && articleKey(entry).toLowerCase() === asked.toLowerCase())
    setMissing(found === undefined ? asked : null)
    if (found !== undefined) onGo(found.path)
  }
  return (
    <form onSubmit={submit} className="pb-3">
      <div className="flex items-center rounded-md border focus-within:border-foreground/40 focus-within:ring-1 focus-within:ring-ring">
        <input
          name="articol"
          autoComplete="off"
          aria-label={t`Mergi la articolul cu numărul`}
          placeholder={t`Mergi la articolul…`}
          className={cn('min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground sm:text-sm', touch === true ? 'h-11' : 'h-10')}
        />
        <button type="submit" aria-label={t`Mergi la articol`} className={cn('inline-flex shrink-0 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground', touch === true ? 'size-11' : 'size-10')}>
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      <p role="status" className={cn('text-xs leading-5 text-muted-foreground', missing !== null && 'mt-1.5')}>
        {missing !== null ? <Trans>Forma afișată nu are un articol {missing}.</Trans> : null}
      </p>
    </form>
  )
}

function Contents({ outline, names, activePath, trail, onGo, touch = false }: ContentsProps) {
  const rows = useMemo(() => contentsRows(outline), [outline])
  const articleCount = useMemo(() => outline.filter(isArticle).length, [outline])
  const go = (path: string) => (event: { preventDefault: () => void }) => {
    event.preventDefault()
    onGo(path)
  }
  return (
    <nav aria-label={t`Cuprinsul actului`} className="text-sm">
      {articleCount >= 8 ? <GoToArticle outline={outline} onGo={onGo} touch={touch} /> : null}
      <ol className="space-y-0.5">
        {rows.map((row) =>
          row.kind === 'heading' ? (
            <li key={row.entry.path} style={{ paddingLeft: `${String(row.level * 0.75)}rem` }} className={cn(row.level === 0 && 'pt-2 first:pt-0')}>
              <a
                href={`#${domAnchorForPath(row.entry.path)}`}
                onClick={go(row.entry.path)}
                aria-current={activePath === row.entry.path ? 'location' : undefined}
                className={cn(
                  '-mx-2 block rounded-md px-2 leading-5 hover:bg-muted',
                  touch ? 'py-3' : 'py-1.5',
                  activePath === row.entry.path ? 'bg-muted font-medium text-foreground' : trail.has(row.entry.path) ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span className={cn(names.has(row.entry.path) && 'text-muted-foreground')}>{entryLabel(row.entry)}</span>
                {names.has(row.entry.path) ? <span className="text-foreground"> {names.get(row.entry.path)}</span> : null}
              </a>
            </li>
          ) : (
            <li key={row.entries[0]?.path} style={{ paddingLeft: `${String(row.level * 0.75)}rem` }} className="pb-1.5">
              <ol className="-mx-1 flex flex-wrap items-center gap-0.5" aria-label={t`Articole`}>
                {/* Owner, 26 November 2026: say what the numbers are, at the grid's top left. The list's own name says it to a screen reader. */}
                <li aria-hidden="true" className={cn('inline-flex items-center px-1.5 text-xs font-medium text-foreground', touch ? 'h-11' : 'h-8')}>
                  <Trans>Art.</Trans>
                </li>
                {row.entries.map((entry) => (
                  <li key={entry.path}>
                    <a
                      href={`#${domAnchorForPath(entry.path)}`}
                      onClick={go(entry.path)}
                      aria-label={entryLabel(entry)}
                      title={names.get(entry.path)}
                      aria-current={activePath === entry.path ? 'location' : undefined}
                      className={cn(
                        'inline-flex items-center justify-center rounded-md px-1.5 text-[0.8125rem] tabular-nums',
                        touch ? 'h-11 min-w-11' : 'h-8 min-w-8',
                        activePath === entry.path ? 'bg-foreground font-medium text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <ArticleNumber value={articleKey(entry)} />
                    </a>
                  </li>
                ))}
              </ol>
            </li>
          ),
        )}
      </ol>
    </nav>
  )
}

/* ── where the reader is ─────────────────────────────────────────────────── */

/**
 * The outline entry at the top of the reading area: the deepest block whose box crosses a thin band under the bar.
 * A block is observed whole (an article's box, not its heading), so the place holds while a long article scrolls.
 */
function useActivePath(outline: readonly LegalOutlineEntry[], ready: unknown): string | null {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    if (outline.length === 0 || typeof IntersectionObserver === 'undefined') return
    const order = new Map(outline.map((entry, index) => [domAnchorForPath(entry.path), index]))
    const inBand = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target.id)
          else inBand.delete(entry.target.id)
        }
        let deepest = -1
        for (const id of inBand) deepest = Math.max(deepest, order.get(id) ?? -1)
        // Nothing under the band: the reader is in text outside every heading (the preamble, the signatures) or past the text.
        setActive(deepest >= 0 ? (outline[deepest]?.path ?? null) : null)
      },
      { rootMargin: '-12% 0px -80% 0px' },
    )
    for (const id of order.keys()) {
      const element = document.getElementById(id)
      if (element !== null) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [outline, ready])
  return active
}

/** The entries above an outline entry (its chapter, its title…), outermost first. */
function ancestorsOf(outline: readonly LegalOutlineEntry[], path: string | null): readonly LegalOutlineEntry[] {
  const index = outline.findIndex((entry) => entry.path === path)
  const self = outline[index]
  if (self === undefined) return []
  const chain: LegalOutlineEntry[] = []
  let depth = self.depth
  for (let cursor = index - 1; cursor >= 0 && depth > 1; cursor--) {
    const entry = outline[cursor]
    // Above in rank and, where the outline gives spans, around this place in the text: never by rank alone (LEG-CEJT).
    const around = entry === undefined || entry.charEnd === null || self.charStart === null || self.charStart < entry.charEnd
    if (entry !== undefined && entry.depth < depth && around) {
      chain.unshift(entry)
      depth = entry.depth
    }
  }
  return chain
}

/** Heading names by block id, read from the text's own `den` runs. */
function headingNames(blocks: readonly TldfBlock[], into: Map<string, string> = new Map()): Map<string, string> {
  for (const block of blocks) {
    const name = block.content.find((run) => run.role === 'den')?.text.trim()
    // Some outlines already serve the name in the label („Titlul II Impozitul pe profit"): it is not said twice.
    if (name !== undefined && name !== '' && block.label?.includes(name) !== true) into.set(block.id, name)
    if (block.children !== undefined) headingNames(block.children, into)
  }
  return into
}

/* ── the reading bar ─────────────────────────────────────────────────────── */

const formName = (kind: string, date: string | null, locale: string): string => (date === null ? versionKindLabel(kind) : `${formatLegalDate(date, locale)}, ${versionKindLabel(kind)}`)

/** The shown form's date: its version date, else the first publication of the listed version it names. */
function shownDate(act: LegalActDetail, shown: ShownVersion): string | null {
  if (shown.versionDate !== null) return shown.versionDate
  const listed = act.documents.find((form) => form.documentId === shown.documentId)
  return listed === undefined ? null : versionDateOf(listed)
}

/* ── the lead: the summary and the form shown ────────────────────────────── */

function Summary({ act, warnings }: { readonly act: LegalActDetail; readonly warnings?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const text = act.summary?.plainLanguageSummary?.trim() ?? act.summary?.description?.trim() ?? ''
  if (text === '') return null
  return (
    <section aria-labelledby="act-pe-scurt" className="border-b pb-6">
      <h2 id="act-pe-scurt" className="text-sm font-medium">
        <Trans>Pe scurt</Trans>
      </h2>
      <p className={cn('mt-1 text-base leading-7', !open && 'line-clamp-4 sm:line-clamp-3')}>{text}</p>
      {text.length > 240 ? (
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={cn(MORE, 'mt-1 inline-flex min-h-11 items-center text-sm sm:min-h-10')}>
          {open ? <Trans>Arată mai puțin</Trans> : <Trans>Citește tot rezumatul</Trans>}
        </button>
      ) : null}
      {/* Said in sight, as on the live page: a reader must not take the summary for the law. */}
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        <Trans>Rezumat generat de AI din textul actului. Este un strat explicativ, nu textul legii și nu consultanță juridică.</Trans>
      </p>
      {/* The warnings qualify the summary, so they sit on it (the live page's own rule). */}
      {warnings !== undefined ? <div className="mt-3">{warnings}</div> : null}
    </section>
  )
}

function FormSelect({ act, shown, onForm, anchor = false, stacked = false }: Pick<ActPageModel, 'act' | 'onForm'> & { readonly shown: ShownVersion; readonly anchor?: boolean; readonly stacked?: boolean }) {
  const { i18n } = useLingui()
  const forms = orderVersionsNewestFirst(act.documents.filter(isSelectableVersion))
  return (
    <div className={cn('flex gap-x-3 gap-y-1.5 text-sm', stacked ? 'flex-col' : 'flex-wrap items-center')}>
      <span className="scroll-mt-20 text-muted-foreground" {...(anchor && { id: 'act-forma' })}>
        <Trans>Versiunea textului</Trans>
      </span>
      {forms.length > 1 && onForm !== undefined && forms.some((form) => form.documentId === shown.documentId) ? (
        <ChoiceSelect
          value={shown.documentId}
          groups={[{ options: forms.map((form) => ({ value: form.documentId, label: formName(form.versionKind, versionDateOf(form), i18n.locale) })) }]}
          onChange={onForm}
          label={t`Versiunea textului`}
          triggerClassName={cn(CONTROL, 'min-w-0 max-w-full gap-2 text-sm font-medium', stacked ? 'w-full' : 'w-auto')}
        />
      ) : (
        <span className="font-medium">{formName(shown.versionKind, shownDate(act, shown), i18n.locale)}</span>
      )}
    </div>
  )
}

/**
 * The notice of an unofficial consolidated form (LEG-X3AV), its sentences word for word. Whole, or folded: the
 * first sentence and the Portal's own note with its date stay in sight; the guidance and the link open under
 * „Detalii".
 */
function ConsolidationNotice({ shown, folded = false }: { readonly shown: ShownVersion; readonly folded?: boolean }) {
  const { i18n } = useLingui()
  const [open, setOpen] = useState(false)
  if (!isConsolidationVersion(shown)) return null
  const note = portalConsolidationNote(shown, (value) => formatLegalDate(value, i18n.locale))
  const portal =
    note !== null ? (
      <>
        <Trans>Portalul Legislativ indică „{note}”.</Trans>{' '}
      </>
    ) : null
  const guidance = (
    <Trans>Pentru a stabili dispozițiile aplicabile la o dată, consultați în Monitorul Oficial actul, republicările, actele modificatoare și dispozițiile tranzitorii relevante.</Trans>
  )
  const source =
    shown.sourceUrl !== null ? (
      <SourceLink href={shown.sourceUrl}>
        <Trans>Forma consolidată pe Portalul Legislativ</Trans>
      </SourceLink>
    ) : undefined
  if (!folded) {
    return (
      <ActNotice tone="caution" title={<Trans>Formă consolidată neoficială, cu caracter informativ.</Trans>} action={source}>
        {portal}
        {guidance}
      </ActNotice>
    )
  }
  return (
    <div role="note" className="border-l-2 border-status-partial-fg pl-4 text-sm leading-6">
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-medium text-foreground">
          <Trans>Formă consolidată neoficială, cu caracter informativ.</Trans>
        </span>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="act-forma-detalii" className={cn(MORE, 'inline-flex min-h-11 items-center sm:min-h-0')}>
          {open ? <Trans>Mai puțin</Trans> : <Trans>Detalii</Trans>}
        </button>
      </p>
      {/* The Portal's own note and its date stay in sight with the first sentence (LEG-X3AV, the legislation session's
          reading, 26 November 2026): it is the date the text reflects, to set against the date a reader asks about. */}
      {portal !== null ? <p className="text-muted-foreground">{portal}</p> : null}
      <div id="act-forma-detalii" hidden={!open} className="pb-1 text-muted-foreground">
        {guidance}
        {source !== undefined ? <div className="mt-1.5">{source}</div> : null}
      </div>
    </div>
  )
}

/* ── the closing record ──────────────────────────────────────────────────── */

function RecordRow({ title, children }: { readonly title: ReactNode; readonly children: ReactNode }) {
  return (
    <div className="grid gap-x-8 gap-y-2 border-t py-5 sm:grid-cols-[10rem_minmax(0,1fr)]">
      <h3 className="text-sm font-medium leading-6">{title}</h3>
      <div className="min-w-0 text-sm leading-6">{children}</div>
    </div>
  )
}

/** A long list cut to its first rows, the rest behind one control that says how many there are. */
function Cut<T>({ items, first = 5, render }: { readonly items: readonly T[]; readonly first?: number; readonly render: (item: T, index: number) => ReactNode }) {
  const [all, setAll] = useState(false)
  const shown = all || items.length <= first + 2 ? items : items.slice(0, first)
  return (
    <>
      <ul className="divide-y">{shown.map((item, index) => render(item, index))}</ul>
      {items.length > first + 2 ? (
        <button type="button" onClick={() => setAll(!all)} aria-expanded={all} className={cn(MORE, 'mt-1 inline-flex min-h-11 items-center sm:min-h-10')}>
          {all ? <Trans>Arată mai puține</Trans> : <Trans>Arată toate cele {items.length}</Trans>}
        </button>
      ) : null}
    </>
  )
}

function References({ group }: { readonly group: LegalReferenceGroup }) {
  const { i18n } = useLingui()
  return (
    <>
      <Cut
        items={group.items}
        render={(item, index) => (
          <li key={index} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 py-2 sm:grid-cols-[9rem_minmax(0,1fr)]">
            <span className="text-muted-foreground">{legalRelationLabel(item.relation)}</span>
            {item.act !== null ? (
              <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <Link to="/legislation/acts/$actId" params={{ actId: item.act.actId }} className={LINK}>
                  {item.act.displayCitation}
                </Link>
                <LegalStatusBadge status={item.act.status} />
              </span>
            ) : (
              <span>{item.targetRaw}</span>
            )}
          </li>
        )}
      />
      {group.hasMore ? (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {group.totalCount !== null ? (
            <Trans>
              Se afișează {formatLegalNumber(group.items.length, i18n.locale)} din {formatLegalNumber(group.totalCount, i18n.locale)}. Lista completă apare odată cu directorul de acte.
            </Trans>
          ) : (
            <Trans>Se afișează primele {formatLegalNumber(group.items.length, i18n.locale)}. Lista completă apare odată cu directorul de acte.</Trans>
          )}
        </p>
      ) : null}
    </>
  )
}

function ActRecord({ act, shown, onForm }: Pick<ActPageModel, 'act' | 'shown' | 'onForm'>) {
  const { i18n } = useLingui()
  const date = (value: string | null) => (value === null ? t`fără dată` : formatLegalDate(value, i18n.locale))
  const publication = uniqueGazettePublication(act)
  const forms = orderVersionsNewestFirst(act.documents.filter((form) => form.versionKind !== 'stub-header'))
  return (
    <section aria-labelledby="act-fisa" className="mt-20 scroll-mt-24 border-t-2 border-foreground pt-6">
      <h2 id="act-fisa" className="pb-5 text-xl font-semibold tracking-tight">
        <Trans>Fișa actului</Trans>
      </h2>
      {publication !== null && publication.issueNumber !== null ? (
        <RecordRow title={<Trans>Publicare</Trans>}>
          <p>
            <Trans>
              Monitorul Oficial nr. {publication.issueNumber} din {date(publication.issueDate)}
            </Trans>
          </p>
          {publication.pdfUrl !== null ? (
            <SourceLink href={publication.pdfUrl}>
              <Trans>Numărul, pe monitoruloficial.ro</Trans>
            </SourceLink>
          ) : null}
        </RecordRow>
      ) : null}
      {forms.length > 0 ? (
        <RecordRow title={<Trans>Formele textului</Trans>}>
          <Cut
            items={forms}
            render={(form) => {
              const here = form.documentId === shown?.documentId
              const readable = isSelectableVersion(form)
              return (
                <li key={form.documentId} className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-baseline gap-x-4 py-2 sm:grid-cols-[9rem_minmax(0,1fr)]">
                  <span className="tabular-nums text-muted-foreground">{date(versionDateOf(form))}</span>
                  <span className="flex flex-wrap items-baseline gap-x-3">
                    {readable && !here && onForm !== undefined ? (
                      <button type="button" onClick={() => onForm(form.documentId)} className={cn(LINK, 'text-left')}>
                        {versionKindLabel(form.versionKind)}
                      </button>
                    ) : (
                      <span className={cn(here && 'font-medium')}>{versionKindLabel(form.versionKind)}</span>
                    )}
                    {here ? (
                      <span className="text-muted-foreground">
                        <Trans>afișată acum</Trans>
                      </span>
                    ) : !readable ? (
                      <span className="text-muted-foreground">
                        <Trans>text indisponibil</Trans>
                      </span>
                    ) : null}
                  </span>
                </li>
              )
            }}
          />
        </RecordRow>
      ) : null}
      {act.timeline !== null && act.timeline.length > 0 ? (
        <RecordRow title={<Trans>Ce s-a întâmplat cu actul</Trans>}>
          {act.timelineComplete === true ? null : (
            <p role="status" className="pb-2 text-muted-foreground">
              {act.timelineComplete === null ? <Trans>Nu știm dacă lista este completă.</Trans> : <Trans>Lista nu este completă: actul are mai multe evenimente decât s-au putut încărca.</Trans>}
            </p>
          )}
          <Cut
            items={[...act.timeline].reverse()}
            render={(entry, index) => (
              <li key={index} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 py-2 sm:grid-cols-[9rem_minmax(0,1fr)]">
                <span className="tabular-nums text-muted-foreground">{date(entry.effectiveDate)}</span>
                {entry.relatedActId !== null ? (
                  <Link to="/legislation/acts/$actId" params={{ actId: entry.relatedActId }} className={LINK}>
                    {entry.label}
                  </Link>
                ) : (
                  <span>{entry.label}</span>
                )}
              </li>
            )}
          />
        </RecordRow>
      ) : null}
      {act.outLinks !== null && act.outLinks.items.length > 0 ? (
        <RecordRow title={<Trans>Acte la care trimite</Trans>}>
          <References group={act.outLinks} />
        </RecordRow>
      ) : null}
      {act.inLinks !== null && act.inLinks.items.length > 0 ? (
        <RecordRow title={<Trans>Acte care trimit la el</Trans>}>
          <References group={act.inLinks} />
        </RecordRow>
      ) : null}
      {act.officialTextUrl !== null ? (
        <RecordRow title={<Trans>Sursa</Trans>}>
          <SourceLink href={act.officialTextUrl}>
            <Trans>Textul, pe legislatie.just.ro</Trans>
          </SourceLink>
        </RecordRow>
      ) : null}
    </section>
  )
}

/* ── the page ────────────────────────────────────────────────────────────── */

export function ActPageView({ model, children }: { readonly model: ActPageModel; readonly children?: ReactNode }) {
  const { act, subject, shown, blocks, marks, containsNonBmp, outline, outlineState, onReach, mock, onForm, notices, warnings, apparatus = 'rail', textState, afterText, changedMark = 'none' } = model
  const grid = apparatus === 'rail' ? GRID_WIDE : GRID
  const { i18n } = useLingui()
  const [sheet, setSheet] = useState(false)
  /** One short sentence in the bar, in the place's stead for a moment: a link was copied, or a place could not be reached. */
  const [said, setSaid] = useState<string | null>(null)
  /** A place asked for whose part of the text is still being read. */
  const [wanted, setWanted] = useState<string | null>(null)
  const names = useMemo(() => headingNames(blocks), [blocks])
  const activePath = useActivePath(outline, blocks)
  const ancestors = useMemo(() => ancestorsOf(outline, activePath), [outline, activePath])
  const trail = useMemo(() => new Set(ancestors.map((entry) => entry.path)), [ancestors])
  const active = outline.find((entry) => entry.path === activePath)

  const go = (path: string) => {
    setSheet(false)
    // After the sheet has let go of the page's scroll.
    requestAnimationFrame(() => {
      const target = document.getElementById(domAnchorForPath(path))
      if (target !== null) target.scrollIntoView({ block: 'start' })
      // A text served in parts: the place exists, its part is not on the page yet. Its part is read, then the page goes there.
      else if (onReach?.(path) === true) {
        setWanted(path)
        setSaid(t`Se încarcă partea de text în care se află…`)
      } else setSaid(t`Locul acesta nu este în textul afișat.`)
    })
  }
  useEffect(() => {
    if (wanted === null) return
    const target = document.getElementById(domAnchorForPath(wanted))
    if (target === null) return
    target.scrollIntoView({ block: 'start' })
    setWanted(null)
    setSaid(null)
  }, [wanted, blocks])
  /** A form picked from the record at the page's end: the reader is taken back to where the text starts. */
  const pickForm =
    onForm === undefined
      ? undefined
      : (documentId: string) => {
          onForm(documentId)
          document.getElementById('act-forma')?.scrollIntoView({ block: 'start' })
        }
  const copyLink = (block: TldfBlock) => {
    const address = new URL(`/legislation/acts/${act.actId}`, window.location.origin)
    if (shown !== null && shown.documentId !== act.canonical?.documentId) address.searchParams.set('doc', shown.documentId)
    address.searchParams.set('nod', block.id)
    void navigator.clipboard?.writeText(address.toString()).then(
      () => setSaid(t`Legătura către ${block.label ?? t`articol`} a fost copiată.`),
      () => setSaid(t`Legătura nu a putut fi copiată.`),
    )
  }
  useEffect(() => {
    if (said === null) return
    const timer = window.setTimeout(() => setSaid(null), 3500)
    return () => window.clearTimeout(timer)
  }, [said])
  // In a long contents the lit place is kept in sight, inside the panel only.
  useEffect(() => {
    if (activePath === null) return
    // The panel's own scroll is moved, never the window's: `scrollIntoView` would move both.
    const panel = document.querySelector('[data-act-contents]')
    const lit = panel?.querySelector('[aria-current=location]')
    if (panel == null || lit == null) return
    const frame = panel.getBoundingClientRect()
    const mark = lit.getBoundingClientRect()
    if (mark.top < frame.top + 8 || mark.bottom > frame.bottom - 48) panel.scrollTop += mark.top - frame.top - frame.height / 2
  }, [activePath])

  const contents = (touch: boolean) => <Contents outline={outline} names={names} activePath={activePath} trail={trail} onGo={go} touch={touch} />

  return (
    <div className="bg-background pb-24 text-foreground [font-family:var(--font-family)]">
      <ActHead act={act} subject={subject} mock={mock} grid={grid} />

      {/* The reading bar: stays while the text scrolls. */}
      <div className="sticky top-0 z-20 border-y bg-background">
        <div className={cn(grid, 'items-center')}>
          <p className="hidden text-sm font-medium lg:block">
            <Trans>Cuprins</Trans>
          </p>
          <div className="flex min-h-12 min-w-0 items-center gap-3">
            {outline.length > 0 ? (
              <Sheet open={sheet} onOpenChange={setSheet}>
                <SheetTrigger asChild>
                  <Button variant="outline" className={cn(CONTROL, 'shrink-0 gap-2 px-3 lg:hidden')}>
                    <List className="size-4" aria-hidden="true" />
                    <Trans>Cuprins</Trans>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[min(22rem,88vw)] overflow-y-auto p-0">
                  <SheetHeader className="border-b px-4 py-3 text-left">
                    <SheetTitle className="text-base">
                      <Trans>Cuprins</Trans>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="px-4 py-4">{contents(true)}</div>
                </SheetContent>
              </Sheet>
            ) : null}
            <p className="flex min-w-0 flex-1 items-baseline text-sm text-muted-foreground">
              {/* Only the one-off sentence is announced: the place changes with every scroll. */}
              <span role="status" className="truncate text-foreground">
                {said}
              </span>
              {said !== null ? null : active === undefined ? (
                <span className="truncate">{act.displayCitation}</span>
              ) : (
                <>
                  {/* The chapter and section give way first: the place itself is never cut. From `sm` only. */}
                  {ancestors.length > 0 ? (
                    <span className="hidden min-w-0 truncate sm:inline">
                      {ancestors
                        .slice(-2)
                        .map((entry) => entryLabel(entry))
                        .join(' › ')}
                    </span>
                  ) : null}
                  {ancestors.length > 0 ? (
                    <span aria-hidden="true" className="hidden shrink-0 px-1.5 sm:inline">
                      ›
                    </span>
                  ) : null}
                  <span className="shrink-0 font-medium text-foreground">{entryLabel(active)}</span>
                </>
              )}
            </p>
            {shown !== null ? (
              <p className="hidden shrink-0 text-sm text-muted-foreground md:block">
                {/* For a consolidation the date is the Portal's own note's, never one this page works out (LEG-X3AV). */}
                <Trans>Forma din {formName(shown.versionKind, isConsolidationVersion(shown) ? shown.portalLabelDate : shownDate(act, shown), i18n.locale)}</Trans>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* With the side column, from 88rem (1408 px): contents, text, and what is to know about the text, each in its own column. */}
      <div className={cn(grid, 'pt-6', apparatus === 'rail' && 'min-[88rem]:grid-cols-[16rem_minmax(0,42rem)_17rem]')}>
        <aside className="hidden lg:block">
          <div data-act-contents className="sticky top-16 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain pb-8 pr-2">
            {outline.length > 0 ? (
              contents(false)
            ) : outlineState === 'pending' ? (
              <div role="status" aria-label={t`Se încarcă cuprinsul…`} className="space-y-3 pt-1">
                {['w-2/3', 'w-full', 'w-5/6', 'w-1/2'].map((width) => (
                  <div key={width} className={cn('h-3.5 animate-pulse rounded bg-muted motion-reduce:animate-none', width)} />
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                {outlineState === 'failed' ? <Trans>Cuprinsul nu s-a putut încărca — textul rămâne integral mai jos.</Trans> : <Trans>Acest text nu are un cuprins.</Trans>}
              </p>
            )}
          </div>
        </aside>
        <main className={COLUMN}>
          <Summary act={act} warnings={apparatus === 'compact' ? warnings : undefined} />
          {shown !== null ? (
            // On the wide screen of `rail` this block gives way to the column at the right.
            <div className={cn('space-y-3 py-5', apparatus === 'rail' && 'min-[88rem]:hidden')}>
              <FormSelect act={act} shown={shown} onForm={onForm} anchor />
              <ConsolidationNotice shown={shown} folded={apparatus !== 'full'} />
            </div>
          ) : null}
          {notices !== undefined ? <div className="space-y-4 pb-5">{notices}</div> : null}
          {warnings !== undefined && apparatus !== 'compact' ? <div className={cn('pb-5', apparatus === 'rail' && 'min-[88rem]:hidden')}>{warnings}</div> : null}
          {textState === undefined && changedMark === 'legend' && blocks.length > 0 ? (
            <p className="flex items-center gap-2.5 pb-4 text-xs leading-5 text-muted-foreground">
              <span aria-hidden="true" className="h-4 w-0.5 shrink-0 rounded-full bg-primary/60" />
              <Trans>Linia din stânga textului marchează dispozițiile modificate față de forma de bază a actului.</Trans>
            </p>
          ) : null}
          {textState ?? (
            <article aria-label={t`Textul actului`} className="pt-2">
              <ActBlocks blocks={blocks} marks={marks} containsNonBmp={containsNonBmp} changedMark={changedMark !== 'none'} foldNotes={apparatus !== 'full'} onCopyLink={copyLink} />
            </article>
          )}
          {afterText}
          <ActRecord act={act} shown={shown} onForm={pickForm} />
          {children}
        </main>
        {apparatus === 'rail' && shown !== null ? (
          <aside aria-label={t`Despre textul afișat`} className="hidden min-[88rem]:block">
            <div className="sticky top-16 max-h-[calc(100dvh-5rem)] space-y-4 overflow-y-auto overscroll-contain pb-8">
              <FormSelect act={act} shown={shown} onForm={onForm} stacked />
              <ConsolidationNotice shown={shown} />
              {warnings !== undefined ? <div>{warnings}</div> : null}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  )
}
