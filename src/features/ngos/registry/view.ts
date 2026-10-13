import type { RegistrySearch } from './api'
import type { AnswerAxis } from './components/registry-answer'
import type { CountyView } from './components/registry-county-map'
import { TABLE_PAGE_CAP, type GroupAxis } from './model'

const AXES: readonly GroupAxis[] = ['judet', 'localitate', 'forma', 'stare', 'an']

/**
 * The answer's view as the address says it: anything it cannot use is the
 * default; a page past the last one a reader can reach (`TABLE_PAGE_CAP`,
 * the read's 20 requests) is that last one — never a crawl from a link.
 */
export function viewOf(search: RegistrySearch): { readonly page: number; readonly axis: AnswerAxis; readonly countyView: CountyView } {
  const page = Number(search.page)
  return {
    page: Number.isInteger(page) && page >= 1 ? Math.min(page, TABLE_PAGE_CAP) : 1,
    axis: AXES.includes(search.by as GroupAxis) ? (search.by as GroupAxis) : 'inregistrari',
    countyView: search.view === 'map' ? 'map' : 'list',
  }
}
