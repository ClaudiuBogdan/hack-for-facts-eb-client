import { t } from '@lingui/core/macro'

/**
 * How the comparison names what it compares: a territory's identity, its
 * level, and its name as the page prints it.
 */

/** A territory's identity as the legend and charts see it. */
export interface ComparisonSeriesDescriptor {
  readonly code: string
  readonly label: string
  readonly color: string
  /** Deterministic from the URL token shape — present even for empty rows. */
  readonly level: 'NATIONAL' | 'NUTS3' | 'LAU'
}

/**
 * Level badges (and the absolute-values note) appear ONLY when the compared
 * levels actually mix — a same-level set would wear N identical tags
 * (user ruling C2).
 */
export function hasMixedComparisonLevels(
  series: readonly ComparisonSeriesDescriptor[],
): boolean {
  return new Set(series.map((entry) => entry.level)).size > 1
}

/** Short level tag shown beside mixed-level series (identity, not colour). */
export function comparisonLevelLabel(
  level: ComparisonSeriesDescriptor['level'],
): string {
  switch (level) {
    case 'NATIONAL':
      return t`țară`
    case 'NUTS3':
      return t`județ`
    case 'LAU':
      return t`localitate`
  }
}

/** Words a Romanian place name keeps in lower case after its first word („Baia de Arieș", „Valea lui Mihai"). */
const LOWER_CASE_WORDS = new Set(['de', 'din', 'pe', 'la', 'sub', 'lui', 'cu'])

function sentenceCase(text: string): string {
  return text
    .toLocaleLowerCase('ro')
    .split(' ')
    .map((word, index) =>
      index > 0 && LOWER_CASE_WORDS.has(word)
        ? word
        : word
            .split('-')
            .map((part) => part.charAt(0).toLocaleUpperCase('ro') + part.slice(1))
            .join('-'),
    )
    .join(' ')
}

/**
 * A territory's name as the comparison prints it: the place itself, in
 * sentence case where INS sends capitals, with the legal form it leads with
 * („MUNICIPIUL CLUJ-NAPOCA") set apart as its kind („municipiu"), so a
 * commune and a town of one name stay two rows.
 */
export function comparisonPlaceName(raw: string): { readonly name: string; readonly kind: string | null } {
  const trimmed = raw.trim().replace(/\s+/g, ' ')
  const shouting = trimmed === trimmed.toLocaleUpperCase('ro')
  const match = /^(MUNICIPIUL|ORAȘUL|ORASUL|ORAȘ|ORAS|COMUNA|JUDEȚUL|JUDETUL)\s+(.+)$/i.exec(trimmed)
  const body = match?.[2] ?? trimmed
  const name = shouting ? sentenceCase(body) : body
  switch (match?.[1]?.toUpperCase()) {
    case 'MUNICIPIUL':
      return { name, kind: t`municipiu` }
    case 'ORAȘUL':
    case 'ORASUL':
    case 'ORAȘ':
    case 'ORAS':
      return { name, kind: t`oraș` }
    case 'COMUNA':
      return { name, kind: t`comună` }
    case 'JUDEȚUL':
    case 'JUDETUL':
      return { name, kind: t`județ` }
    default:
      return { name, kind: null }
  }
}
