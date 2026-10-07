import { courtName } from './judicial-labels'
import type { HubCourt } from './hub-snapshot-types'

const RESULTS = 6

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()

/** Courts whose name has a word starting with each word typed, diacritics ignored; busiest of the year first. */
export function matchCourts(courts: readonly HubCourt[], query: string, limit = RESULTS): readonly HubCourt[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  return courts
    .filter((court) => {
      const parts = fold(courtName(court.code)).split(/[\s-]+/)
      return words.every((word) => parts.some((part) => part.startsWith(word)))
    })
    .slice()
    .sort((a, b) => b.casesInYear - a.casesInYear || a.code.localeCompare(b.code))
    .slice(0, limit)
}
