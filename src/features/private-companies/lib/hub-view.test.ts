import { describe, expect, it } from 'vitest'
import { COMPANY_HUB_SNAPSHOT } from './hub-snapshot'
import { hubCountyLayer, newFirmsLeadingSectors, perThousand, registrationSeries, survivalShare } from './hub-view'

describe('hub view', () => {
  it('measures a rate per 1,000 residents without rounding it', () => {
    expect(perThousand(341_116, 1_709_191)).toBeCloseTo(199.577, 3)
    expect(perThousand(5, 0)).toBe(0)
  })

  it('ranks two counties that read alike in their true order', () => {
    // Neamț and Vrancea both display „60,3"; the exact rates still order them.
    const density = hubCountyLayer(COMPANY_HUB_SNAPSHOT, 'densitate')
    const neamt = density.values.find((county) => county.code === 'NT')?.value ?? 0
    const vrancea = density.values.find((county) => county.code === 'VN')?.value ?? 0
    expect(neamt).not.toBe(vrancea)
    expect(Math.round(neamt * 10)).toBe(Math.round(vrancea * 10))
  })

  it('draws every county on each layer, against the matching national figure', () => {
    for (const indicator of ['densitate', 'infiintari', 'cifra-de-afaceri'] as const) {
      const layer = hubCountyLayer(COMPANY_HUB_SNAPSHOT, indicator)
      expect(layer.values).toHaveLength(42)
      expect(layer.values.every((county) => county.value > 0)).toBe(true)
    }
    const density = hubCountyLayer(COMPANY_HUB_SNAPSHOT, 'densitate')
    expect(density.unit).toBe('per-thousand')
    expect(density.national).toBe(perThousand(COMPANY_HUB_SNAPSHOT.national.activeFirms, COMPANY_HUB_SNAPSHOT.national.population))
    expect(hubCountyLayer(COMPANY_HUB_SNAPSHOT, 'infiintari').national).toBe(COMPANY_HUB_SNAPSHOT.national.newFirms)
    expect(hubCountyLayer(COMPANY_HUB_SNAPSHOT, 'cifra-de-afaceri').unit).toBe('lei')
  })

  it('reads a cohort’s survival, and nothing for a year it does not hold', () => {
    const registrations = [{ year: 2015, registered: 200, active: 100 }]
    expect(survivalShare(registrations, 2015)).toBe(0.5)
    expect(survivalShare(registrations, 2014)).toBeNull()
    expect(survivalShare([{ year: 2015, registered: 0, active: 0 }], 2015)).toBeNull()
  })

  it('turns the registrations into the chart’s two series, year by year', () => {
    const series = registrationSeries([
      { year: 2024, registered: 10, active: 8 },
      { year: 2025, registered: 12, active: 12 },
    ])
    expect(series.registered).toEqual([
      { period: '2024', value: 10 },
      { period: '2025', value: 12 },
    ])
    expect(series.active.map((point) => point.value)).toEqual([8, 12])
  })

  it('gives the leading sectors of the year’s new companies their share of all of them', () => {
    const sectors = newFirmsLeadingSectors(COMPANY_HUB_SNAPSHOT, 3)
    expect(sectors).toHaveLength(3)
    const [first] = sectors
    expect(first?.share).toBeCloseTo((first?.firms ?? 0) / COMPANY_HUB_SNAPSHOT.national.newFirms)
  })
})
