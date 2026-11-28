import type { LegalEventKind } from '@/schemas/legal'
import { LEGAL_EVENT_KINDS, legalChangesSearchSchema, type LegalChangesSearch } from '@/schemas/legal-search'
import { NEW_LAW_KINDS } from './legal-changes-blocks'

/**
 * The Modificări page's state in the address (owner, 28 November 2026): the tab, the chosen kinds and the period
 * as `fila`, `fel`, `de`, `pana`. A view is a link anyone can send. Old links, written with the page's earlier keys,
 * are forwarded to these by the route (`changesSearchOfOld`).
 */

export type ChangesTab = 'schimbari' | 'legi-noi' | 'fara-data'

export type ChangesState = {
  readonly tab: ChangesTab
  readonly kinds: readonly LegalEventKind[]
  readonly since: string | null
  readonly until: string | null
}

const isKind = (value: string): value is LegalEventKind => (LEGAL_EVENT_KINDS as readonly string[]).includes(value)

function kindsOf(fel: string | undefined): readonly LegalEventKind[] {
  if (fel === undefined) return []
  const kinds: LegalEventKind[] = []
  for (const part of fel.split(',')) {
    const kind = part.trim()
    if (isKind(kind) && !kinds.includes(kind)) kinds.push(kind)
  }
  return kinds
}

export function changesStateOf(search: LegalChangesSearch): ChangesState {
  const tab: ChangesTab = search.fila ?? 'schimbari'
  const undated = tab === 'fara-data'
  return {
    tab,
    kinds: kindsOf(search.fel),
    since: undated ? null : (search.de ?? null),
    until: undated ? null : (search.pana ?? null),
  }
}

/**
 * The address of a state. Every key of the page is named — the old ones as `undefined` — because the router merges
 * a child's search over the passthrough root's: a key left out would survive from the previous address.
 */
export function changesSearchOf(state: ChangesState): LegalChangesSearch {
  const undated = state.tab === 'fara-data'
  return {
    fila: state.tab === 'schimbari' ? undefined : state.tab,
    fel: state.kinds.length > 0 ? state.kinds.join(',') : undefined,
    de: undated || state.since === null ? undefined : state.since,
    pana: undated || state.until === null ? undefined : state.until,
    view: undefined,
    since: undefined,
    until: undefined,
    kind: undefined,
    source: undefined,
  }
}

const OLD_KEYS = ['view', 'since', 'until', 'kind', 'source'] as const

/**
 * An old link's address in the new keys, or null when the link has no old key. `view=nedatate` is the undated tab
 * (its window dropped: the server refuses the pair); `view=viitoare|toate` are gone (the upcoming changes are always
 * on top); `kind` becomes `fel`, on the new-laws tab when it is one of its kinds; `since`/`until` become `de`/`pana`;
 * `source` is gone; `lang` is kept. Junk values are dropped as the schema drops them.
 */
export function changesSearchOfOld(raw: Record<string, unknown>): Record<string, string> | null {
  if (!OLD_KEYS.some((key) => raw[key] !== undefined)) return null
  const search = legalChangesSearchSchema.parse(raw)
  const tab: ChangesTab = search.view === 'nedatate' ? 'fara-data' : search.kind !== undefined && NEW_LAW_KINDS.includes(search.kind) ? 'legi-noi' : (search.fila ?? 'schimbari')
  const kinds = search.kind !== undefined ? [search.kind] : kindsOf(search.fel)
  const undated = tab === 'fara-data'
  const since = undated ? undefined : (search.since ?? search.de)
  const until = undated ? undefined : (search.until ?? search.pana)
  const lang = typeof raw.lang === 'string' ? raw.lang : undefined
  return {
    ...(tab !== 'schimbari' && { fila: tab }),
    ...(kinds.length > 0 && { fel: kinds.join(',') }),
    ...(since !== undefined && { de: since }),
    ...(until !== undefined && { pana: until }),
    ...(lang !== undefined && { lang }),
  }
}
