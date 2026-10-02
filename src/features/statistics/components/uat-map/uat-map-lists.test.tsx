import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { UatMapGeometry, UatMapSeries } from '../../lib/uat-map-snapshot'
import { CountyList } from './uat-map-lists'
import { countyRanks, rankOf } from './uat-map-reading'
import type { SeriesMeta } from './uat-map-series'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...props }: { readonly children: ReactNode; readonly to: string; readonly params?: Readonly<Record<string, string>> }) => (
    <a href={to.replace('$siruta', params?.siruta ?? '')} {...props}>
      {children}
    </a>
  ),
}))

// Five places: București first in the country, then three in Cluj, and one in Cluj with no figure.
const geometry = {
  siruta: ['179132', '54975', '55268', '57706', '55000'],
  name: ['București', 'Cluj-Napoca', 'Turda', 'Dej', 'Fără date'],
  county: ['B', 'CJ', 'CJ', 'CJ', 'CJ'],
} as unknown as UatMapGeometry
const values = [1_000_000, 195_025, 9_730, 9_730, null]
const series = { total: { values, national: null, counties: {} } } as unknown as UatMapSeries
const meta = { unit: 'locuri de muncă', digits: 0, signed: false } as unknown as SeriesMeta

describe('CountyList', () => {
  it('numbers a county by its places in the county, the country kept in the title', () => {
    const { rank, order } = rankOf(values)
    const countyRank = countyRanks(order, geometry.county, values).rank
    render(<CountyList county="CJ" meta={meta} series={series} geometry={geometry} rank={rank} countyRank={countyRank} order={order} onHover={() => {}} />)

    const rows = screen.getAllByRole('link')
    expect(rows.map((row) => row.textContent?.match(/^locul (\d+|—)/)?.[1])).toEqual(['1', '2', '2', '—'])
    expect(rows[0]).toHaveAttribute('title', 'Locul 2 în țară')
    expect(within(rows[0]!).getByText(/locul 2 în țară/)).toHaveClass('sr-only')
    // Equal figures share a place, in the county as in the country.
    expect(rows[1]).toHaveAttribute('title', 'Locul 3 în țară')
    expect(rows[2]).toHaveAttribute('title', 'Locul 3 în țară')
    expect(rows[3]).not.toHaveAttribute('title')
  })
})
