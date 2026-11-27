import { useMemo, useState, type FormEvent, type MouseEvent } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowDown, ArrowRight, ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LegalOutlineEntry } from '@/schemas/legal'
import { articleKey, contentsParents, contentsRows, findArticle, isArticleEntry, outlineAncestors, tocLabel } from '../../lib/legal-outline'
import { domAnchorForPath } from '../../lib/tldf/nod-resolve'

/**
 * The act's contents (owner, 26 November 2026, the act page's redesign): the served outline as a short list of
 * headings, each level a step further in with one faint line down its left edge, and every run of articles as a grid
 * of equal cells under its heading — a law's articles are addresses, people look them up by number. A field jumps
 * to an article by its number, and a long outline folds to its first level and the branch the reader is in.
 *
 * Selection is the parent's concern: the contents never scroll or navigate themselves.
 */

/** The articles' run is a grid of numbers; the field that jumps to one shows from this many articles. */
const JUMP_FROM = 8

/** „8^1" is how the outline writes article 8¹: the index is drawn raised, as the law prints it. */
export function ArticleNumber({ value }: { readonly value: string }) {
  const [base, index] = value.split('^')
  if (index === undefined || base === undefined) return <>{value}</>
  return (
    <>
      {base}
      <sup className="text-[0.65em]">{index}</sup>
    </>
  )
}

/** The switch between the whole contents and the folded one. */
export function ContentsToggle({
  collapsed,
  onToggle,
  touch = false,
}: {
  readonly collapsed: boolean
  readonly onToggle: () => void
  /** In the phone's sheet: a 44 px target. */
  readonly touch?: boolean
}) {
  const Icon = collapsed ? ChevronsUpDown : ChevronsDownUp
  // Named by what it does, in the words it shows: „Arată tot" on a folded list, „Restrânge" on a whole one.
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1 rounded-md px-2 text-xs font-normal text-muted-foreground hover:bg-muted hover:text-foreground',
        touch ? 'h-11' : 'h-8',
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      <span>{collapsed ? t`Arată tot` : t`Restrânge`}</span>
    </button>
  )
}

/** The jump to an article by its number: a row of the contents' box, closed by a rule (`ruled`), or a field (the sheet). */
export function GoToArticle({
  entries,
  onSelect,
  touch = false,
  ruled = false,
}: {
  readonly entries: readonly LegalOutlineEntry[]
  readonly onSelect: (entry: LegalOutlineEntry) => void
  readonly touch?: boolean
  readonly ruled?: boolean
}) {
  const [missing, setMissing] = useState<string | null>(null)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const field = new FormData(event.currentTarget).get('articol')
    const asked = (typeof field === 'string' ? field : '').trim().replace(/^art(?:icolul|icol|\.)?\s*/iu, '')
    if (asked === '') return
    // As the reader writes it: „8^1", „8¹", „8 1" and „08" all name an article the outline keys „8^1" or „8".
    const found = findArticle(entries, asked)
    setMissing(found === undefined ? asked : null)
    if (found !== undefined) onSelect(found)
  }
  return (
    <form onSubmit={submit} className={cn(!ruled && 'pb-3')}>
      <div className={cn('flex items-center', ruled ? 'border-b focus-within:bg-muted/50' : 'rounded-md border focus-within:border-foreground/40 focus-within:ring-1 focus-within:ring-ring')}>
        <input
          name="articol"
          autoComplete="off"
          aria-label={t`Mergi la articolul cu numărul`}
          placeholder={t`Mergi la articolul…`}
          className={cn('min-w-0 flex-1 bg-transparent px-3 text-base font-normal outline-none placeholder:text-muted-foreground sm:text-sm', touch ? 'h-11' : 'h-10')}
        />
        <button
          type="submit"
          aria-label={t`Mergi la articol`}
          className={cn('inline-flex shrink-0 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground', touch ? 'size-11' : 'size-10')}
        >
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      {/* Polite, not a `status` role: the page keeps one status, the sentence about a refused document. */}
      <p aria-live="polite" className={cn('text-xs font-normal leading-5 text-muted-foreground', missing !== null && (ruled ? 'border-b px-3 py-1.5' : 'mt-1.5'))}>
        {missing !== null ? <Trans>Forma afișată nu are un articol {missing}.</Trans> : null}
      </p>
    </form>
  )
}

/** One faint line per level a row sits inside, at the left edge of the heading that holds it. */
function LevelGuides({ level }: { readonly level: number }) {
  return (
    <>
      {Array.from({ length: level }, (_, index) => (
        <span key={index} aria-hidden="true" className="absolute inset-y-0 w-px bg-border" style={{ left: `${String(index * 0.75 + 0.0625)}rem` }} />
      ))}
    </>
  )
}

/** The way from the contents to the act's record at the page's end: the contents' last, fixed row. */
export function ContentsRecordLink({
  onGo,
  touch = false,
  href = '#act-fisa',
}: {
  readonly onGo: () => void
  readonly touch?: boolean
  /** The record's own address, for a new tab: the page's, without the place in the text. */
  readonly href?: string
}) {
  return (
    <a
      href={href}
      onClick={(event) => {
        // A new tab or window is the browser's to open, as for the entries above.
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        onGo()
      }}
      className={cn(
        'flex shrink-0 items-center justify-between border-t text-sm text-muted-foreground hover:bg-muted hover:text-foreground',
        touch ? 'min-h-12 px-4' : 'min-h-10 px-3',
      )}
    >
      <Trans>Fișa actului</Trans>
      <ArrowDown className="size-4" aria-hidden="true" />
    </a>
  )
}

type Props = {
  readonly entries: readonly LegalOutlineEntry[]
  /** The outline path of the place currently in view (scroll sync). */
  readonly activePath: string | null
  readonly onSelect: (entry: LegalOutlineEntry) => void
  /** In the phone's sheet: 44 px targets. */
  readonly touch?: boolean
  /** The jump field is drawn by the container (a ruled row of the box) and not here. */
  readonly bare?: boolean
  /** Folded: only the first level shows, and the branch that holds `openPath`. */
  readonly collapsed?: boolean
  /** The place whose branch a folded list keeps open: where the reader is. */
  readonly openPath?: string | null
  /**
   * An entry's own address, as a link opened in a new tab or copied would need it. Without it an entry points at
   * its block on this page (`#tldf-…`), which a new tab finds only when that part of the text is already loaded.
   */
  readonly hrefFor?: (entry: LegalOutlineEntry) => string
  readonly className?: string
}

/**
 * The contents. Each level sits a step further in, and the article numbers sit in cells of one width, so every run
 * of articles at one level falls in the same columns whatever its numbers are. Each level draws a faint line down
 * its left edge for as long as it lasts: a paragraph's line stops under its last article, and the chapter's own
 * articles hang on the chapter's line, after a little air.
 */
export function LegalReaderToc({ entries, activePath, onSelect, touch = false, bare = false, collapsed = false, openPath = null, hrefFor, className }: Props) {
  const { rows, parents } = useMemo(() => {
    const nested = contentsRows(entries)
    return { rows: nested, parents: contentsParents(nested) }
  }, [entries])
  const trail = useMemo(() => new Set(outlineAncestors(entries, activePath).map((entry) => entry.path)), [entries, activePath])
  /** Folded: the headings that are open, which are the one the reader is at and those that hold it. Null when all is shown. */
  const open = useMemo(() => {
    if (!collapsed) return null
    const set = new Set<number>()
    let at = rows.findIndex((row) => (row.kind === 'heading' ? row.entry.path === openPath : row.entries.some((entry) => entry.path === openPath)))
    if (rows[at]?.kind === 'heading') set.add(at)
    while (at >= 0) {
      const holder = parents[at] ?? null
      if (holder === null) break
      set.add(holder)
      at = holder
    }
    return set
  }, [collapsed, rows, parents, openPath])
  const articleCount = useMemo(() => entries.filter(isArticleEntry).length, [entries])

  if (entries.length === 0) return null

  const shown = (index: number) => {
    const holder = parents[index] ?? null
    return open === null || holder === null || open.has(holder)
  }
  const hrefOf = (entry: LegalOutlineEntry) => hrefFor?.(entry) ?? `#${domAnchorForPath(entry.path)}`
  const go = (entry: LegalOutlineEntry) => (event: MouseEvent<HTMLAnchorElement>) => {
    // A new tab or window is the browser's to open: the entry's own address goes there.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onSelect(entry)
  }

  return (
    <nav aria-label={t`Cuprinsul actului`} className={cn('text-sm', className)}>
      {articleCount >= JUMP_FROM && !bare ? <GoToArticle entries={entries} onSelect={onSelect} touch={touch} /> : null}
      <ol>
        {rows.map((row, index) =>
          !shown(index) ? null : row.kind === 'heading' ? (
            <li key={row.entry.path} style={{ paddingLeft: `${String(row.level * 0.75)}rem` }} className={cn('relative py-px', row.level === 0 && 'pt-2 first:pt-0')}>
              <LevelGuides level={row.level} />
              <a
                href={hrefOf(row.entry)}
                onClick={go(row.entry)}
                aria-current={activePath === row.entry.path ? 'location' : undefined}
                className={cn(
                  '-mx-2 flex items-start gap-2 rounded-md px-2 leading-5 hover:bg-muted',
                  touch ? 'py-3' : 'py-1.5',
                  activePath === row.entry.path ? 'bg-muted font-medium text-foreground' : trail.has(row.entry.path) ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span className="min-w-0 flex-1">{tocLabel(row.entry)}</span>
                {/* Folded: a heading that holds more says so, and which way it stands. Going to it opens it. */}
                {open !== null && parents[index + 1] === index ? (
                  <ChevronRight className={cn('mt-0.5 size-4 shrink-0 text-muted-foreground', open.has(index) && 'rotate-90')} aria-hidden="true" />
                ) : null}
              </a>
            </li>
          ) : (
            // A run that follows another with no heading between them belongs to a level that has just been left: air above it.
            <li
              key={row.entries[0]?.path}
              style={{ paddingLeft: `${String(row.level * 0.75)}rem` }}
              className={cn('relative flex pb-1.5', rows[index - 1]?.kind === 'articles' && 'pt-2')}
            >
              <LevelGuides level={row.level} />
              {/* What the numbers are, at the grid's top left. The list's own name says it to a screen reader. */}
              <span aria-hidden="true" className={cn('flex shrink-0 items-center pl-1.5 text-xs font-medium text-foreground', touch ? 'h-11 w-11' : 'h-8 w-9')}>
                <Trans>Art.</Trans>
              </span>
              <ol className={cn('grid min-w-0 flex-1', touch ? 'grid-cols-[repeat(auto-fill,2.75rem)]' : 'grid-cols-[repeat(auto-fill,2.25rem)]')} aria-label={t`Articole`}>
                {row.entries.map((entry) => (
                  <li key={entry.path}>
                    <a
                      href={hrefOf(entry)}
                      onClick={go(entry)}
                      aria-label={tocLabel(entry)}
                      aria-current={activePath === entry.path ? 'location' : undefined}
                      className={cn(
                        'flex w-full items-center justify-center rounded-md text-[0.8125rem] tabular-nums',
                        touch ? 'h-11' : 'h-8',
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
