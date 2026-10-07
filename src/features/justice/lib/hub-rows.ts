import { t } from '@lingui/core/macro'
import { countyNameRo } from '@/lib/territory-counties'
import type { ShareRow } from '../components/justice-rows'
import { courtsOf, type MainLevel } from './hub-model'
import type { JusticeHubSnapshot } from './hub-snapshot-types'
import { countText, percentText } from './judicial-format'
import { courtName } from './judicial-labels'

/** The rows of a level's busiest courts of the year; each opens its court. */
export function courtShareRows(snapshot: JusticeHubSnapshot, level: MainLevel, limit: number): readonly ShareRow[] {
  const rows = courtsOf(snapshot, level).slice(0, limit)
  const top = Math.max(...rows.map((row) => row.count), 1)
  return rows.map((row) => ({
    key: row.code,
    courtCode: row.code,
    label: courtName(row.code),
    meta: row.county ? t`${percentText(row.share)} din dosarele nivelului, ${countyNameRo(row.county) ?? row.county}` : t`${percentText(row.share)} din dosarele nivelului`,
    value: countText(row.count),
    fraction: row.count / top,
  }))
}
