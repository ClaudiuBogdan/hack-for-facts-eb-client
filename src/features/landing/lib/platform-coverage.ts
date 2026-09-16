import { scraperDatasetCatalog } from '@/lib/scraper-references'
import { visibleGroups, type LandingGroup } from './landing-groups'

/**
 * What this platform holds — deliberately kept apart from the national figures
 * in the strip above it.
 *
 * The two are different universes. `NATIONAL_FACTS` describes the country;
 * these describe our coverage of it, and the institution count in particular is
 * a subset — principal ordonatori de credite that reported budget execution,
 * not a census of Romanian public institutions. Printed in the same row as a
 * national total, a reader would divide one by the other and get a number that
 * means nothing. So they live in the provenance band, under a heading that says
 * what they are.
 *
 * Everything here is derived at call time from the domain list and the scraper
 * catalog, so it cannot drift out of date. The institution count is the one
 * figure that is served rather than derived; `useInstitutionCount` fetches it
 * and the band omits it until it has.
 */
export type PlatformCoverage = {
  readonly groups: readonly LandingGroup[]
  /** Surfaces the reader can reach today, gates applied. */
  readonly surfaces: number
  /** Datasets registered in the scraper catalog. */
  readonly datasets: number
  /** Of those, the ones an API serves live. */
  readonly servedLive: number
}

export function getPlatformCoverage(): PlatformCoverage {
  const groups = visibleGroups()
  return {
    groups,
    surfaces: groups.reduce((sum, group) => sum + group.entries.length, 0),
    datasets: scraperDatasetCatalog.length,
    servedLive: scraperDatasetCatalog.filter((dataset) => dataset.apiReady).length,
  }
}
