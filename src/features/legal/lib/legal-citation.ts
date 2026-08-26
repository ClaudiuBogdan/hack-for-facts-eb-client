/**
 * Client mirror of the server's conservative citation grammar
 * (`hack-for-facts-eb-server/src/modules/legal/core/citation.ts`): a
 * `<type-word> … <number>/<year>` shape such as "Legea 53/2003", "legea nr.
 * 53/2003", "OUG 57 / 2019", "hg 1/2016".
 *
 * DISPLAY heuristic only — it decides which empty-state message the Caută tab
 * shows ("citation not found" vs the phrase-honesty explanation) and lets the
 * mock lane emulate the server's citation shortcut; it never decides which
 * act a query resolves to (the server's parser owns that). If the two
 * grammars ever drift, the cost is a slightly-wrong message, not a wrong act.
 */

/** Common Romanian act-type words/abbreviations — the server's alias table. */
const TYPE_ALIASES: Record<string, string> = {
  lege: 'lege',
  legea: 'lege',
  l: 'lege',
  oug: 'oug',
  og: 'og',
  ordonanta: 'og',
  hotarare: 'hotarare',
  hotararea: 'hotarare',
  hg: 'hotarare',
  h: 'hotarare',
  ordin: 'ordin',
  ordinul: 'ordin',
  o: 'ordin',
  decizie: 'decizie',
  decizia: 'decizie',
  decret: 'decret',
  decretul: 'decret',
}

const fold = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .toLowerCase()

export type LegalCitationShape = {
  readonly actType: string
  readonly actNumber: string
  readonly actYear: number
}

/**
 * Parse a numbered-citation shape, or null when the text is not one (a name
 * like "codul muncii" or a phrase like "concediu de odihnă" both fall to
 * null — the server routes those to alias/lexical retrieval).
 */
export function parseLegalCitationShape(
  raw: string,
): LegalCitationShape | null {
  const text = fold(raw)
    .replace(/nr\.?/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
  const match = /^([a-z]+)\b.*?(\d{1,5})\s*\/\s*(\d{4})\b/u.exec(text)
  if (match === null) return null
  const [, typeWord, num, year] = match
  const actType = TYPE_ALIASES[typeWord ?? '']
  if (actType === undefined || num === undefined || year === undefined)
    return null
  const actYear = Number(year)
  if (actYear < 1850 || actYear > 2100) return null
  return { actType, actNumber: num, actYear }
}
