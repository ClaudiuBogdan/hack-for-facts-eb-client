import { i18n } from '@lingui/core'

/**
 * INS publishes English beside Romanian for its axes, their members and its
 * units, and its English repeats a handful of mistakes. Read across the
 * catalog's 783 axis names and a quarter of its units on 2026-10-02: „Thousands
 * persons", „Millions lei", „Thousands cubits metres", „Squares metres",
 * „inhabitans", „CANE Rev.2". The list is ordered: the specific phrases run
 * before the rules that would otherwise take them apart.
 */
const CORRECTIONS: readonly (readonly [RegExp, string | ((match: string, ...groups: string[]) => string)])[] = [
  [/\bPrinted copies thou\b/g, 'Thousand printed copies'],
  [/\bDead born per 1000 birth\b/g, 'Stillbirths per 1000 births'],
  [/\bLEI million\b/g, 'Million lei'],
  [/\bpetitions number\b/g, 'Number of petitions'],
  [/\bEU media\b/g, 'EU average'],
  [/\bCANE\b/g, 'NACE'],
  [/\bThousandss\b/g, 'Thousand'],
  [/\bThou\b/g, 'Thousand'],
  // A multiplier before a unit is singular — „Thousand persons" — and only before a unit: „Thousands of", „Thousands and…" stay.
  [/\b(thousand|million|billion)s(?= (?:persons|people|inhabitants|lei|euro|usd|dollars|tonnes|tones|passengers|hours|kilowatts|vehicle|places|pieces|copies|metres|meters|cubic|cubics|cubits|square|squares|hectares|litres)\b)/gi, '$1'],
  [/\b([Cc])ubi(?:t|c)s\b/g, '$1ubic'],
  [/\bmetres cubic\b/g, 'cubic metres'],
  [/\b([Ss])quares(?= metres\b)/g, '$1quare'],
  [/\binhabitans\b/g, 'inhabitants'],
  [/\bPromile\b/g, 'Per mille'],
  [/\b([Nn]umber of) spectacles\b/g, '$1 performances'],
  [/\b(thousand|million|billion) tones\b/gi, '$1 tonnes'],
  [/\bclases\b/g, 'classes'],
  [/\bpolutants\b/g, 'pollutants'],
  [/\bkilowatts-hour\b/g, 'kilowatt-hours'],
]

/** INS's English with its recurring mistakes corrected. */
export function correctInsEnglish(text: string): string {
  return CORRECTIONS.reduce<string>(
    (corrected, [pattern, replacement]) =>
      corrected.replace(pattern, replacement as (substring: string, ...args: string[]) => string),
    text,
  )
}

/**
 * An INS label — an axis, a member, a unit — in the reader's language: the
 * English INS publishes, corrected, on an English page; the Romanian on a
 * Romanian one; the other language where the one asked for is missing.
 * Chosen when the page renders, never when the data is fetched, so a figure
 * read once serves both languages.
 */
export function insText(
  ro: string | null | undefined,
  en: string | null | undefined,
  locale: string = i18n.locale,
): string | null {
  const english = locale.toLowerCase().startsWith('en')
  const romanian = ro?.trim() || null
  const translated = en?.trim() ? correctInsEnglish(en.trim()) : null
  return english ? (translated ?? romanian) : (romanian ?? translated)
}
