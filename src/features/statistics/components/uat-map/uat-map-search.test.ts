import { describe, expect, it } from 'vitest'
import { searchUats, uatSearchIndex } from './uat-map-search'

const NAMES = ['Poiana Sibiului', 'Sibiu', 'Ocna Sibiului', 'Fântânele', 'Fântânele', 'Baia Mare', 'Baia', 'Cluj-Napoca', 'Sibioara']
const COUNTIES = ['Sibiu', 'Sibiu', 'Sibiu', 'Iași', 'Arad', 'Maramureș', 'Tulcea', 'Cluj', 'Constanța']
const SIZE = [2_500, 134_000, 4_200, 3_900, 3_100, 123_000, 3_300, 290_000, 1_800]
const index = uatSearchIndex(NAMES, COUNTIES)
const find = (search: string, limit = 10) => searchUats({ index, search, size: SIZE, limit })
const named = (search: string) => find(search).found.map((uat) => NAMES[uat])

describe('searchUats', () => {
  it('puts the name typed whole first, then its beginning, then its words', () => {
    expect(named('sibiu')).toEqual(['Sibiu', 'Ocna Sibiului', 'Poiana Sibiului'])
    expect(named('sibi')).toEqual(['Sibiu', 'Sibioara', 'Ocna Sibiului', 'Poiana Sibiului'])
  })

  it('reads diacritics, case and hyphens aside, a word by its start', () => {
    expect(named('FANTANELE')).toEqual(['Fântânele', 'Fântânele'])
    expect(named('cluj napoca')).toEqual(['Cluj-Napoca'])
    expect(named('napoca')).toEqual(['Cluj-Napoca'])
    expect(named('biu')).toEqual([])
  })

  it('tells places of one name apart by a word of their county', () => {
    expect(find('fantanele iasi').found).toEqual([3])
    expect(find('fantanele arad').found).toEqual([4])
  })

  it('never finds a place by its county alone', () => {
    expect(named('maramures')).toEqual([])
    expect(named('iasi')).toEqual([])
  })

  it('puts closeness before size, orders equals by size, and counts past the limit', () => {
    expect(named('baia')).toEqual(['Baia', 'Baia Mare'])
    expect(find('fantanele').found).toEqual([3, 4])
    expect(find('sibi', 2)).toEqual({ found: [1, 8], total: 4 })
  })

  it('finds nothing when nothing is typed', () => {
    expect(find('  ')).toEqual({ found: [], total: 0 })
  })
})
