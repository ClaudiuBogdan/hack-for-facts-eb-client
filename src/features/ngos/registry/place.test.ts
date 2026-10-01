import { describe, expect, it } from 'vitest'
import { i18n } from '@lingui/core'
import { NGO_REGISTRY_SUMMARY } from '@/features/ngos/hub/registry-summary'
import { countyPlaceOf, countyPlaces, searchCounties } from './place'

i18n.load('ro', {})
i18n.activate('ro')

const places = countyPlaces(NGO_REGISTRY_SUMMARY.counties)
const names = (term: string) => searchCounties(places, term).map((place) => place.name)

describe('the counties as places', () => {
  it('carry the registry’s spelling, their name and their kind', () => {
    expect(places).toHaveLength(42)
    expect(places.find((place) => place.code === 'CJ')).toMatchObject({ value: 'CLUJ', name: 'Cluj', label: 'Jud. Cluj' })
    expect(places.find((place) => place.code === 'B')).toMatchObject({ name: 'București', label: 'Municipiul București' })
    expect(places.find((place) => place.code === 'DB')?.value).toBe('DÂMBOVITA')
  })
  it('name a spelling the registry does not use as the address gave it', () => {
    expect(countyPlaceOf(places, 'DAMBOVITA').label).toBe('DAMBOVITA')
  })
})

describe('the county search', () => {
  it('answers a code typed whole first', () => {
    expect(names('is')[0]).toBe('Iași')
    expect(names('B')[0]).toBe('București')
    expect(names('CJ')).toEqual(['Cluj'])
  })
  it('ignores diacritics, cedilla and comma alike', () => {
    expect(names('dambovita')).toEqual(['Dâmbovița'])
    expect(names('Dâmboviţa')).toEqual(['Dâmbovița'])
    expect(names('salaj')).toEqual(['Sălaj'])
  })
  it('matches a name’s start and its words, and inside a name only from three letters', () => {
    expect(names('bra')).toEqual(['Brașov', 'Brăila'])
    expect(names('nasaud')).toEqual(['Bistrița-Năsăud'])
    expect(names('ra')).not.toContain('Brăila')
    expect(names('raș')).toContain('Brașov')
  })
  it('finds nothing for nothing', () => {
    expect(names('  ')).toEqual([])
    expect(names('xyz')).toEqual([])
  })
})
