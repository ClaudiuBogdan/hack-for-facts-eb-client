import { describe, expect, it } from 'vitest'
import { browsePlaces, localityLabel, placeIndexOf, placeKey, placePath, scopeOf, searchPlaces, type PlaceFeatures } from './analytics-places'

/** The API's regions and counties and the map's files, as the dev API and the 2026-03-09 files give them, trimmed. */
const GEOGRAPHY = {
  regions: [{ region: 'Centru' }, { region: 'Nord-Vest' }, { region: 'Bucuresti-Ilfov' }, { region: 'Sud-Muntenia' }, { region: 'Nord-Est' }, { region: 'Vest' }],
  counties: [
    { countyCode: 'SB', countyName: 'SIBIU', region: 'Centru' },
    { countyCode: 'CJ', countyName: 'CLUJ', region: 'Nord-Vest' },
    { countyCode: 'B', countyName: 'MUNICIPIUL BUCURESTI', region: 'Bucuresti-Ilfov' },
    { countyCode: 'DB', countyName: 'DÂMBOVIȚA', region: 'Sud-Muntenia' },
    { countyCode: 'IL', countyName: 'IALOMIȚA', region: 'Sud-Muntenia' },
    { countyCode: 'IS', countyName: 'IAȘI', region: 'Nord-Est' },
    { countyCode: 'TM', countyName: 'TIMIȘ', region: 'Vest' },
  ],
}

const uat = (natcode: string, name: string, countyMn: string, natLevName: string, insPop2021: number) => ({ properties: { natcode, name, countyMn, natLevName, insPop2021 } })

const UAT: PlaceFeatures = {
  features: [
    uat('143450', 'Sibiu', 'SB', 'Municipiu resedinta de judet', 134308),
    uat('143619', 'Mediaș', 'SB', 'Municipiu, altul decat resedinta de judet', 39505),
    uat('144928', 'Miercurea Sibiului', 'SB', 'Oras', 3619),
    uat('145275', 'Poiana Sibiului', 'SB', 'Comuna', 2346),
    uat('54975', 'Cluj-Napoca', 'CJ', 'Municipiu resedinta de judet', 286598),
    uat('179169', 'București Sectorul 3', 'B', 'Sectoarele municipiului Bucuresti', 373566),
    uat('68789', 'Sălcioara', 'DB', 'Comuna', 3742),
    uat('94330', 'Sălcioara', 'IL', 'Comuna', 2050),
  ],
}

const COUNTIES: PlaceFeatures = {
  features: [
    { properties: { countyCode: 323, mnemonic: 'SB', name: 'Sibiu' } },
    { properties: { countyCode: 127, mnemonic: 'CJ', name: 'Cluj' } },
    { properties: { countyCode: 403, mnemonic: 'B', name: 'București' } },
  ],
}

const INDEX = placeIndexOf(GEOGRAPHY, UAT, COUNTIES)
const NOWHERE = { region: null, county: null }
const names = (places: readonly { readonly name: string }[]) => places.map((item) => item.name)

describe('the place index', () => {
  it('matches with or without diacritics, cedilla or comma', () => {
    expect(placeKey('Sălcioara')).toBe('salcioara')
    expect(placeKey('Mediaş')).toBe(placeKey('Mediaș'))
    expect(placeKey('  ȘELIMBĂR ')).toBe('selimbar')
  })

  it('names every place with its kind: the level for a region or a county, the official kind for a locality', () => {
    expect(INDEX.byValue.get('regiune:Bucuresti-Ilfov')?.label).toBe('Reg. București-Ilfov')
    expect(INDEX.byValue.get('judet:SB')?.label).toBe('Jud. Sibiu')
    expect(INDEX.byValue.get('judet:B')?.label).toBe('București, cu toate sectoarele')
    expect(INDEX.byValue.get('localitate:143450')?.label).toBe('Municipiul Sibiu')
    expect(INDEX.byValue.get('localitate:143619')?.label).toBe('Municipiul Mediaș')
    expect(INDEX.byValue.get('localitate:144928')?.label).toBe('Orașul Miercurea Sibiului')
    expect(INDEX.byValue.get('localitate:145275')?.label).toBe('Comuna Poiana Sibiului')
    expect(INDEX.byValue.get('localitate:179169')?.label).toBe('Sectorul 3')
    expect(localityLabel('Nicăieri', null)).toBe('UAT Nicăieri')
  })

  it('keeps the URL values as the API and the map spell them', () => {
    expect(INDEX.regions.map((item) => item.value)).toContain('Bucuresti-Ilfov')
    expect(INDEX.counties.map((item) => item.value)).toEqual(['SB', 'CJ', 'B', 'DB', 'IL', 'IS', 'TM'])
  })

  it('has no localities before the map is read, and the regions and counties already', () => {
    const early = placeIndexOf(GEOGRAPHY, undefined, undefined)
    expect(early.localities).toBeNull()
    expect(names(early.counties)).toContain('Sibiu')
  })

  it('finds the localities without the API’s regions and counties, only their region unknown', () => {
    const alone = placeIndexOf(undefined, UAT, COUNTIES)
    expect(alone.regions).toEqual([])
    expect(searchPlaces(alone, 'sibiu', NOWHERE).localities.map((item) => item.value)).toEqual(['143450', '144928', '145275'])
    expect(alone.byValue.get('localitate:143450')?.region).toBeNull()
  })
})

describe('searching places', () => {
  it('answers a county first, then its localities, the exact name before the ones that hold it', () => {
    const found = searchPlaces(INDEX, 'sibiu', NOWHERE)
    expect(names(found.counties)).toEqual(['Sibiu'])
    expect(names(found.localities)).toEqual(['Sibiu', 'Miercurea Sibiului', 'Poiana Sibiului'])
  })

  it('never offers a county’s own code: the county covers it', () => {
    const found = searchPlaces(INDEX, 'cluj', NOWHERE)
    expect(found.localities.map((item) => item.value)).toEqual(['54975'])
    expect(INDEX.byValue.get('localitate:127')?.label).toBe('Jud. Cluj (instituțiile județului)')
  })

  it('finds a name two counties share, typed without diacritics', () => {
    expect(searchPlaces(INDEX, 'salcioara', NOWHERE).localities.map((item) => item.county)).toEqual(['DB', 'IL'])
  })

  it('finds a county by its code, and a sector by its words', () => {
    expect(names(searchPlaces(INDEX, 'CJ', NOWHERE).counties)).toEqual(['Cluj'])
    expect(searchPlaces(INDEX, 'sector 3', NOWHERE).localities.map((item) => item.value)).toEqual(['179169'])
  })

  it('answers a county’s code first, before names that merely hold its letters', () => {
    const found = searchPlaces(INDEX, 'IS', NOWHERE)
    expect(found.regions).toEqual([])
    expect(names(found.counties)[0]).toBe('Iași')
    expect(names(searchPlaces(INDEX, 'IL', NOWHERE).counties)[0]).toBe('Ialomița')
  })

  it('reads no match inside a name from two letters', () => {
    expect(names(searchPlaces(INDEX, 'ntr', NOWHERE).regions)).toEqual(['Centru'])
    expect(searchPlaces(INDEX, 'nt', NOWHERE).regions).toEqual([])
  })

  it('stays within the place picked so far', () => {
    const inCounty = searchPlaces(INDEX, 'sal', { region: 'Sud-Muntenia', county: 'IL' })
    expect(inCounty.localities.map((item) => item.value)).toEqual(['94330'])
    expect(inCounty.regions).toEqual([])
    expect(inCounty.counties).toEqual([])
  })
})

describe('browsing places', () => {
  it('offers the regions, then a region’s counties, then a county’s largest localities', () => {
    expect(names(browsePlaces(INDEX, NOWHERE).regions)).toEqual(['Centru', 'Nord-Vest', 'București-Ilfov', 'Sud-Muntenia', 'Nord-Est', 'Vest'])
    expect(names(browsePlaces(INDEX, { region: 'Sud-Muntenia', county: null }).counties)).toEqual(['Dâmbovița', 'Ialomița'])
    expect(names(browsePlaces(INDEX, { region: 'Centru', county: 'SB' }, 2).localities)).toEqual(['Sibiu', 'Mediaș'])
  })
})

describe('a picked place', () => {
  it('is shown as its path from the region down', () => {
    const path = placePath(INDEX, { level: 'localitate', values: ['143450'] })
    expect(path.map((item) => item.label)).toEqual(['Reg. Centru', 'Jud. Sibiu', 'Municipiul Sibiu'])
    expect(scopeOf(path)).toEqual({ region: 'Centru', county: 'SB' })
  })

  it('narrows the next search to itself', () => {
    expect(scopeOf(placePath(INDEX, { level: 'regiune', values: ['Centru'] }))).toEqual({ region: 'Centru', county: null })
    expect(scopeOf(placePath(INDEX, { level: 'judet', values: ['CJ'] }))).toEqual({ region: 'Nord-Vest', county: 'CJ' })
  })

  it('names a link’s county code under its county, and a code it does not know as its number', () => {
    expect(placePath(INDEX, { level: 'localitate', values: ['127'] }).map((item) => item.label)).toEqual(['Reg. Nord-Vest', 'Jud. Cluj', 'Jud. Cluj (instituțiile județului)'])
    expect(placePath(INDEX, { level: 'localitate', values: ['999999'] }).map((item) => item.label)).toEqual(['SIRUTA 999999'])
    // București's own institutions sit on its municipality, 179132: its county node (403) anchors nothing.
    expect(INDEX.byValue.get('localitate:179132')?.label).toBe('Municipiul București, fără sectoare (instituțiile municipiului)')
    expect(INDEX.byValue.has('localitate:403')).toBe(false)
  })
})

describe('București: the whole city, its own institutions, its six sectors', () => {
  const SECTORS = ['179141', '179150', '179169', '179178', '179187', '179196']
  const bucharest = placeIndexOf(
    { regions: [{ region: 'Bucuresti-Ilfov' }], counties: [{ countyCode: 'B', countyName: 'MUNICIPIUL BUCUREȘTI', region: 'Bucuresti-Ilfov' }] },
    { features: SECTORS.map((code, index) => uat(code, `București Sectorul ${String(index + 1)}`, 'B', 'Sectoarele municipiului Bucuresti', 200000)) },
    { features: [{ properties: { countyCode: 403, mnemonic: 'B', name: 'București' } }] },
  )

  it('names the county the whole city, sectors included', () => {
    expect(bucharest.byValue.get('judet:B')?.label).toBe('București, cu toate sectoarele')
  })

  it('names 179132 the municipality’s own institutions, without the sectors', () => {
    expect(bucharest.byValue.get('localitate:179132')).toMatchObject({ label: 'Municipiul București, fără sectoare (instituțiile municipiului)', county: 'B' })
  })

  it('names each of the six sectors on its own, under the whole city', () => {
    expect(SECTORS.map((code) => bucharest.byValue.get(`localitate:${code}`)?.label)).toEqual(['Sectorul 1', 'Sectorul 2', 'Sectorul 3', 'Sectorul 4', 'Sectorul 5', 'Sectorul 6'])
    expect(placePath(bucharest, { level: 'localitate', values: ['179169'] }).map((item) => item.label)).toEqual(['Reg. București-Ilfov', 'București, cu toate sectoarele', 'Sectorul 3'])
  })
})
