import { render, screen } from '@/test/test-utils'
import { describe, expect, it } from 'vitest'
import type { InsTimePeriod } from '@/schemas/ins'
import { formatHubPeriod } from '../../lib/period'
import { buildSparklinePaths } from '../../lib/territory-sparkline'
import { TerritorySparkline } from './territory-sparkline'

const year = (value: number): InsTimePeriod => ({
  iso_period: String(value),
  year: value,
  quarter: null,
  month: null,
  periodicity: 'ANNUAL',
})
const month = (value: number, m: number): InsTimePeriod => ({
  iso_period: `${value}-${String(m).padStart(2, '0')}`,
  year: value,
  quarter: null,
  month: m,
  periodicity: 'MONTHLY',
})

describe('buildSparklinePaths', () => {
  it('draws one path for an unbroken series', () => {
    const paths = buildSparklinePaths([[year(2021), '1'], [year(2022), '2'], [year(2023), '3']], 100, 20)
    expect(paths).toHaveLength(1)
    expect(paths[0]).toMatch(/^M2\.0,18\.0 L50\.0,10\.0 L98\.0,2\.0$/)
  })

  it('breaks the line at a missing period and at a cell with no value — never a bridge', () => {
    // 2022 missing between 2021 and 2023; 2024 published without a value.
    const paths = buildSparklinePaths(
      [[year(2020), '1'], [year(2021), '2'], [year(2023), '3'], [year(2024), null], [year(2025), '2'], [year(2026), '1']],
      120,
      20,
    )
    expect(paths).toHaveLength(2)
    expect(paths[0]).toMatch(/^M.* L[^L]*$/)
    expect(paths[0].split(' ')).toHaveLength(2)
    expect(paths[1].split(' ')).toHaveLength(2)
  })

  it('draws nothing from a single readable point, and a flat series as a line', () => {
    expect(buildSparklinePaths([[year(2023), '5']], 100, 20)).toEqual([])
    expect(buildSparklinePaths([[year(2022), '5'], [year(2023), 'x']], 100, 20)).toEqual([])
    const flat = buildSparklinePaths([[year(2022), '5'], [year(2023), '5']], 100, 20)
    expect(flat).toHaveLength(1)
  })

  it('reads months as consecutive, so a monthly series is one run', () => {
    const paths = buildSparklinePaths([[month(2024, 11), '1'], [month(2024, 12), '2'], [month(2025, 1), '3']], 100, 20)
    expect(paths).toHaveLength(1)
  })
})

describe('TerritorySparkline', () => {
  it('names its span and range as the rows name periods', () => {
    render(<TerritorySparkline points={[[month(2024, 11), '1.5'], [month(2024, 12), '2.5']]} />)
    const image = screen.getByRole('img')
    // Named as the rows name periods, never the raw „2024-11".
    expect(image).toHaveAccessibleName(
      new RegExp(`${formatHubPeriod('2024-11')} până în ${formatHubPeriod('2024-12')}`),
    )
    expect(image).not.toHaveAccessibleName(/2024-11/)
    expect(image).toHaveAccessibleName(/1[.,]5 și 2[.,]5/)
  })

  it('says in words when the series is too short to draw', () => {
    render(<TerritorySparkline points={[[year(2024), '1']]} />)
    expect(screen.getByText('Serie prea scurtă pentru grafic')).toBeInTheDocument()
  })
})
