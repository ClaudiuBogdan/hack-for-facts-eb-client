import { describe, expect, it } from 'vitest'
import { ngoProfileHref, ngoProfileLink, registryNumberFromPath, registryNumberToPath } from './ngo-address'

describe('a registry number in an address', () => {
  it.each([
    ['1471/A/2012', '1471-A-2012'],
    ['1/A/122', '1-A-122'],
    ['99/B/2000`', '99-B-2000`'],
    ['212/A/1991212/A/1991', '212-A-1991212-A-1991'],
    ['17121/A/20', '17121-A-20'],
  ])('%s is written %s', (registryNumber, path) => {
    expect(registryNumberToPath(registryNumber)).toBe(path)
    expect(registryNumberFromPath(path)).toBe(registryNumber)
  })

  it('undoes exactly for a literal holding the characters the writing uses', () => {
    for (const registryNumber of ['12-3/A/2020', 'a~b/A/2020', '~-/-~', '--', '~~']) {
      const path = registryNumberToPath(registryNumber)
      expect(registryNumberFromPath(path)).toBe(registryNumber)
    }
    expect(registryNumberToPath('12-3/A/2020')).toBe('12~-3-A-2020')
  })

  it('names no registry number for an address the writing does not make', () => {
    expect(registryNumberFromPath('')).toBeNull()
    expect(registryNumberFromPath('   ')).toBeNull()
    expect(registryNumberFromPath('12~x')).toBeNull()
    expect(registryNumberFromPath('12~')).toBeNull()
  })
})

describe('an organisation’s profile link', () => {
  it('is the CUI’s where one is admitted, else the registry number’s, else none', () => {
    expect(ngoProfileLink({ cui: '30339344', registryNumber: '1471/A/2012' })).toEqual({ to: '/ngos/$cui', params: { cui: '30339344' } })
    expect(ngoProfileLink({ cui: null, registryNumber: '3117/A/2026' })).toEqual({ to: '/ngos/registry/$number', params: { number: '3117-A-2026' } })
    expect(ngoProfileLink({ cui: '', registryNumber: null })).toBeNull()
  })

  it('is a path for the search', () => {
    expect(ngoProfileHref({ cui: '30339344', registryNumber: null })).toBe('/ngos/30339344')
    expect(ngoProfileHref({ cui: null, registryNumber: '99/B/2000`' })).toBe('/ngos/registry/99-B-2000%60')
    expect(ngoProfileHref({ cui: null, registryNumber: null })).toBeNull()
  })
})
