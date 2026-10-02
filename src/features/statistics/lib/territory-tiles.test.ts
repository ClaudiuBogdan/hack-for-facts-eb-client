import { describe, expect, it } from 'vitest'
import type { StatisticsIndicatorTile } from '@/schemas/statistics'
import { shortIndicatorName, tileChosenPeriod, tileCompareSearch, tileDetailSearch } from './territory-tiles'

describe('shortIndicatorName', () => {
  it.each([
    // What it counts, not the axes it is broken down by; the place is the page.
    ['Nascuti vii pe judete si localitati', 'Nascuti vii'],
    ['Numarul mediu al salariatilor pe judete si localitati', 'Numarul mediu al salariatilor'],
    ['Locuinte existente la sfarsitul anului pe forme de proprietate, judete si localitati', 'Locuinte existente la sfarsitul anului'],
    ['Decedati sub 1 an pe  judete si localitati', 'Decedati sub 1 an'],
    ['Emigranti definitivi pe judete si localitati de plecare', 'Emigranti definitivi'],
    [
      'Ponderea somerilor inregistrati la sfarsitul lunii in totalul resurselor de munca, pe sexe, judete si localitati',
      'Ponderea somerilor inregistrati la sfarsitul lunii in totalul resurselor de munca',
    ],
    [
      'Institutii si companii de spectacole sau concerte dupa felul institutiilor si companiilor de spectacole sau concerte,pe judete si localitati',
      'Institutii si companii de spectacole sau concerte dupa felul institutiilor si companiilor de spectacole sau concerte',
    ],
    // What INS adds after the breakdown stays.
    ['Suprafata spatiilor verzi pe judete si localitati (municipii si orase)', 'Suprafata spatiilor verzi (municipii si orase)'],
    [
      'Persoane condamnate/sanctionate definitiv aflate in penitenciare (inclusiv centre de detentie si centre educative), pe judete si localitati (la sfarsitul anului)',
      'Persoane condamnate/sanctionate definitiv aflate in penitenciare (inclusiv centre de detentie si centre educative) (la sfarsitul anului)',
    ],
    // A name that opens in capitals reads in sentence case.
    ['POPULATIA DUPA DOMICILIU la 1 ianuarie pe grupe de varsta si varste, sexe, judete si localitati', 'Populatia dupa domiciliu la 1 ianuarie'],
    ['LEGALLY RESIDENT POPULATION, by age group and ages, sex, counties and localities at January 1st.', 'Legally resident population at January 1st'],
    ['Departures from the residence, counties and localities', 'Departures from the residence'],
    ['Permanent emigrants by counties and localities of departure', 'Permanent emigrants'],
    // A reference date already in the name is not said twice.
    [
      'Share of registered unemployed at the end of the month in the total labor resources, by gender, counties and localities, at the end of the month\n',
      'Share of registered unemployed at the end of the month in the total labor resources',
    ],
  ])('%s', (name, expected) => {
    expect(shortIndicatorName(name)).toBe(expected)
  })

  it('leaves a name with no place breakdown, and an acronym, as they are', () => {
    expect(shortIndicatorName('Cifra de afaceri CAEN Rev.2')).toBe('Cifra de afaceri CAEN Rev.2')
    expect(shortIndicatorName('UAT pe judete si localitati')).toBe('UAT')
  })
})

const tile = (overrides: Partial<StatisticsIndicatorTile> = {}): StatisticsIndicatorTile =>
  ({
    datasetCode: 'FOM104D',
    periodicity: ['ANNUAL'],
    tileState: 'available',
    latestPeriod: '2020',
    sparklineCadence: 'ANNUAL',
    ...overrides,
  }) as StatisticsIndicatorTile

describe('the links of a tile read at a chosen period', () => {
  it('carry nothing on the latest period, or where the tile shows no cell', () => {
    expect(tileChosenPeriod(tile(), null)).toBeNull()
    expect(tileChosenPeriod(tile({ tileState: 'period-missing', latestPeriod: null }), '2020')).toBeNull()
    expect(tileCompareSearch(tile(), '54975', 'CJ', null)).not.toHaveProperty('perioada')
    expect(tileDetailSearch(tile(), '54975', null)).toEqual({ teritoriu: 'siruta:54975' })
  })

  it('end the comparison at the period and mark it on the series, at its cadence', () => {
    const chosen = tileChosenPeriod(tile(), '2020')
    expect(chosen).toEqual({ period: '2020', cadence: 'ANNUAL' })
    expect(tileCompareSearch(tile(), '54975', 'CJ', chosen)).toEqual({
      cod: 'FOM104D',
      teritorii: ['siruta:54975', 'cod:CJ', 'cod:RO'],
      perioada: '2020',
    })
    // One cadence: naming it would only add a pin to reset.
    expect(tileDetailSearch(tile(), '54975', chosen)).toEqual({ teritoriu: 'siruta:54975', perioada: '2020' })
  })

  it('keep the period of a monthly series as the month the tile shows', () => {
    const monthly = tile({ periodicity: ['MONTHLY'], latestPeriod: '2020-12', sparklineCadence: 'MONTHLY' })
    const chosen = tileChosenPeriod(monthly, '2020')
    expect(tileCompareSearch(monthly, '54975', 'CJ', chosen)).toMatchObject({ perioada: '2020-12' })
    expect(tileDetailSearch(monthly, '54975', chosen)).toEqual({ teritoriu: 'siruta:54975', perioada: '2020-12' })
  })

  it('leave the comparison unbounded for a matrix published at more than one cadence, and name the cadence on the series', () => {
    const mixed = tile({ periodicity: ['MONTHLY', 'ANNUAL'] })
    const chosen = tileChosenPeriod(mixed, '2020')
    expect(tileCompareSearch(mixed, '54975', 'CJ', chosen)).not.toHaveProperty('perioada')
    expect(tileDetailSearch(mixed, '54975', chosen)).toEqual({ teritoriu: 'siruta:54975', perioada: '2020', frecventa: 'ANNUAL' })
  })
})

describe('the dataset page address', () => {
  it('reads a marked period, a bare year included, and drops one it cannot read', async () => {
    const { statisticsDatasetDetailSearchSchema } = await import('@/schemas/statistics')
    expect(statisticsDatasetDetailSearchSchema.parse({ perioada: 2020 })).toMatchObject({ perioada: '2020' })
    expect(statisticsDatasetDetailSearchSchema.parse({ perioada: '2020-12' })).toMatchObject({ perioada: '2020-12' })
    expect(statisticsDatasetDetailSearchSchema.parse({ perioada: 'ieri' }).perioada).toBeUndefined()
  })
})
