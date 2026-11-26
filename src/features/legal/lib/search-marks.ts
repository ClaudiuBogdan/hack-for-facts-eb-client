import type { LegalSearchSectionHit } from '@/schemas/legal'

/**
 * The search page's pure parts (round 2, owner, 26 November 2026): where the question's words sit in a name or a
 * description, and an act's provision hits gathered by the provision they come from.
 */

/** Words too common to say why an act matched. */
const COMMON = new Set(['din', 'sau', 'care', 'prin', 'pentru', 'privind', 'unei', 'unui', 'este', 'sunt', 'nr'])

const WORD_CHARACTER = /[\p{L}\p{N}]/u

/** Lower case and no diacritics, one character out per character in, so a place in the folded text is the place in the text. */
function fold(text: string): string {
  let out = ''
  for (let index = 0; index < text.length; index++) {
    const unit = text.charAt(index)
    const bare = unit.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    out += bare.length > 0 ? bare.charAt(0) : unit
  }
  return out
}

/** The question's words worth marking: three characters or more, none of the common ones. */
export function questionWords(q: string): readonly string[] {
  const words = fold(q.normalize('NFC'))
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 3 && !COMMON.has(word))
  return [...new Set(words)]
}

export type MarkedPart = { readonly text: string; readonly hit: boolean }

/**
 * A text cut around its words that begin with one of the question's, whatever the case and the diacritics („odihna"
 * marks „odihnă", „civil" marks „civilă" whole: Romanian inflects at the end). The parts joined are the text
 * itself (in NFC).
 */
export function markWords(text: string, words: readonly string[]): readonly MarkedPart[] {
  const source = text.normalize('NFC')
  if (words.length === 0 || source.length === 0) return [{ text: source, hit: false }]
  const folded = fold(source)
  const marked = new Array<boolean>(source.length).fill(false)
  for (const word of words) {
    let from = folded.indexOf(word)
    while (from !== -1) {
      const before = from === 0 ? '' : folded.charAt(from - 1)
      let end = from + word.length
      if (!WORD_CHARACTER.test(before)) {
        while (end < folded.length && WORD_CHARACTER.test(folded.charAt(end))) end++
        marked.fill(true, from, end)
      }
      from = folded.indexOf(word, end)
    }
  }
  const parts: MarkedPart[] = []
  let start = 0
  for (let index = 1; index <= source.length; index++) {
    if (index === source.length || marked[index] !== marked[start]) {
      parts.push({ text: source.slice(start, index), hit: marked[start] === true })
      start = index
    }
  }
  return parts
}

export type ProvisionGroup = {
  readonly key: string
  readonly documentId: string
  /** The provision's path in its document (`?nod=`), when the engine named it. */
  readonly nodePath: string | null
  readonly label: string | null
  /** The engine's fragments from this provision, in its order, none twice. */
  readonly fragments: readonly string[]
  readonly servedForm: LegalSearchSectionHit['servedForm']
}

/**
 * One act's provision hits, gathered by provision: the engine sends a fragment per hit, and several fragments of
 * one long provision would otherwise repeat its label. A hit with no path is grouped by its document and label.
 */
export function groupProvisions(hits: readonly LegalSearchSectionHit[]): readonly ProvisionGroup[] {
  const groups = new Map<string, { documentId: string; nodePath: string | null; label: string | null; fragments: string[]; servedForm: LegalSearchSectionHit['servedForm'] }>()
  for (const hit of hits) {
    if (hit.snippet === null) continue
    const key = `${hit.documentId}|${hit.nodePath ?? `label:${hit.nodeLabel ?? ''}`}`
    const group = groups.get(key)
    if (group === undefined) groups.set(key, { documentId: hit.documentId, nodePath: hit.nodePath, label: hit.nodeLabel, fragments: [hit.snippet], servedForm: hit.servedForm })
    else if (!group.fragments.includes(hit.snippet)) group.fragments.push(hit.snippet)
  }
  return [...groups.entries()].map(([key, group]) => ({ key, ...group }))
}
