import { t } from '@lingui/core/macro'
import type { LegalOutlineEntry } from '@/schemas/legal'
import { legalNodeKindLabel } from './legal-vocabulary'

/**
 * The served outline as the act page's contents and reading bar use it. Depth is the server's fixed grammar rank,
 * never parsed from the path (`unmarked:N` keys carry no hierarchy); nesting also asks the text spans, because served
 * outlines can be flat or out of order (an annex served in the middle of the articles, LEG-CEJT).
 */

/** An outline longer than this many entries starts folded: a code's contents are several screens long. */
export const CONTENTS_FOLD_FROM = 40

export const isArticleEntry = (entry: LegalOutlineEntry): boolean => entry.nodeKind === 'articol'

/** An entry's name, never blank: the served label, else the kind and its number, else an honest placeholder. */
export function tocLabel(entry: LegalOutlineEntry): string {
  if (entry.label !== null && entry.label.trim() !== '') return entry.label
  const kind = legalNodeKindLabel(entry.nodeKind)
  if (entry.numberKey !== null) return `${kind} ${entry.numberKey}`
  // Never a blank row: the POR class is filtered server-side, but any other
  // label-less heading still gets an honest placeholder.
  return `${kind} — ${t`fără titlu`}`
}

/** An article's short address in the contents' grid: its number, else its label without the word „Articolul". */
export function articleKey(entry: LegalOutlineEntry): string {
  return entry.numberKey ?? tocLabel(entry).replace(/^Art(?:icolul|icol|\.)\s*/iu, '')
}

const RAISED_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹'

/**
 * An article number as a reader may type it, in the outline's own writing: „8^1" for article 8¹. A raised index
 * (as the law prints it and the contents draw it), a space, a point or a dash between number and index all mean
 * the caret; the word „art." before it, capitals and leading zeros mean nothing.
 */
export function articleNumberAsKey(typed: string): string {
  return typed
    .trim()
    .toLowerCase()
    .replace(/^art(?:icolul|icol|\.)?\s*/u, '')
    .replace(/\s*[⁰¹²³⁴⁵⁶⁷⁸⁹]+/gu, (run) => `^${[...run.trim()].map((digit) => String(RAISED_DIGITS.indexOf(digit))).join('')}`)
    .replace(/^(\d+)\s*[\s.-]\s*(\d+)$/u, '$1^$2')
    .replace(/^0+(?=\d)/u, '')
}

/** The longest text read as an article number. */
export const ARTICLE_TYPED_MAX = 40

/** The article a typed number names, if the outline has it. */
export function findArticle(outline: readonly LegalOutlineEntry[], typed: string): LegalOutlineEntry | undefined {
  // No article number is this long („Articolul 1234^12"): a long paste names none, and is not searched (its runs
  // of spaces would cost the regexes below time on every keystroke; Codex review, round 2).
  if (typed.length > ARTICLE_TYPED_MAX) return undefined
  const asked = articleNumberAsKey(typed)
  if (asked === '') return undefined
  const articles = outline.filter(isArticleEntry)
  // As written first: an outline that really numbers an article „8.1" is found by „8.1", and „8¹" finds the
  // article keyed „8^1" before one keyed „8.1".
  const literal = typed.trim().toLowerCase().replace(/^art(?:icolul|icol|\.)?\s*/u, '')
  const keyed = (match: (key: string) => boolean) => articles.find((entry) => match(articleKey(entry).toLowerCase()))
  return keyed((key) => key === literal) ?? keyed((key) => key === asked) ?? keyed((key) => articleNumberAsKey(key) === asked)
}

export type ContentsRow =
  | { readonly kind: 'heading'; readonly entry: LegalOutlineEntry; readonly level: number }
  | { readonly kind: 'articles'; readonly entries: readonly LegalOutlineEntry[]; readonly level: number }

/**
 * The outline as rows: a heading at its nesting level, then the run of articles under it as one grid. A heading
 * stays open while the next entries are below its rank AND inside its span of the text: rank alone would nest the
 * title after an annex served mid-articles under that annex (LEG-CEJT). Inside means both ends: an annex listed
 * before its place in the text has a span that ends after everything, and holds nothing that starts before it.
 */
export function contentsRows(outline: readonly LegalOutlineEntry[]): readonly ContentsRow[] {
  const rows: ContentsRow[] = []
  type Open = { readonly depth: number; readonly start: number | null; readonly end: number | null }
  const open: Open[] = []
  const inside = (parent: Open, entry: LegalOutlineEntry) =>
    entry.charStart === null || ((parent.start === null || entry.charStart >= parent.start) && (parent.end === null || entry.charStart < parent.end))
  let run: LegalOutlineEntry[] | null = null
  for (const entry of outline) {
    while (open.length > 0 && !inside(open[open.length - 1] ?? { depth: 0, start: null, end: null }, entry)) {
      open.pop()
      run = null
    }
    if (isArticleEntry(entry)) {
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
    open.push({ depth: entry.depth, start: entry.charStart, end: entry.charEnd })
  }
  return rows
}

/** Each row's holder: the index of the nearest heading row above it at a lower level, or null at the first level. */
export function contentsParents(rows: readonly ContentsRow[]): readonly (number | null)[] {
  const holders: (number | null)[] = []
  const stack: number[] = []
  rows.forEach((row, index) => {
    while (stack.length > 0 && (rows[stack[stack.length - 1] ?? 0]?.level ?? 0) >= row.level) stack.pop()
    holders.push(stack[stack.length - 1] ?? null)
    if (row.kind === 'heading') stack.push(index)
  })
  return holders
}

/** The entries above an outline entry (its chapter, its title…), outermost first: above in rank, and around it in the text. */
export function outlineAncestors(outline: readonly LegalOutlineEntry[], path: string | null): readonly LegalOutlineEntry[] {
  const index = outline.findIndex((entry) => entry.path === path)
  const self = outline[index]
  if (self === undefined) return []
  const chain: LegalOutlineEntry[] = []
  let depth = self.depth
  for (let cursor = index - 1; cursor >= 0; cursor--) {
    const entry = outline[cursor]
    // Where the outline gives spans, never by rank alone (LEG-CEJT).
    const around =
      entry === undefined ||
      self.charStart === null ||
      ((entry.charStart === null || self.charStart >= entry.charStart) && (entry.charEnd === null || self.charStart < entry.charEnd))
    if (entry !== undefined && entry.depth < depth && around) {
      chain.unshift(entry)
      depth = entry.depth
    }
  }
  return chain
}
