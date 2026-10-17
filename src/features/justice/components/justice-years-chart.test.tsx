import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { JusticeYearsChart } from './justice-years-chart'

vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

const bars = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => ({ year: from + index, count: 1000 + index, partial: from + index < 2023, running: from + index === to }))

describe('the years chart', () => {
  it('fits a short history in its frame', () => {
    const html = renderToStaticMarkup(<JusticeYearsChart bars={bars(2019, 2026)} lastMonth="2026-06" compact />)
    expect(html).not.toContain('overflow-x-auto')
  })

  it('gives a long history (a court page describing an older year) a readable width per year and scrolls (JC26-UI-01)', () => {
    const html = renderToStaticMarkup(<JusticeYearsChart bars={bars(2007, 2026)} lastMonth="2026-06" compact />)
    expect(html).toContain('overflow-x-auto')
    expect(html).toContain('min-w-10')
    // Every year keeps its screen-reader count.
    for (const year of [2007, 2015, 2026]) expect(html).toContain(`${year}: `)
  })
})
