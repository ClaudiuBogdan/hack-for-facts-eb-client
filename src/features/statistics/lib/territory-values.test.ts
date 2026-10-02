import { describe, expect, it, vi } from 'vitest'
import { formatTileValue, tileStatusLabel } from './territory-values'

vi.mock('./format', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./format')>()
  return { ...actual, activeNumberLocale: () => 'ro-RO' }
})

const tile = (value: string | null, valueStatus: string | null = null) => ({
  value,
  valueStatus,
  unitSymbol: 'persons',
  unitNameRo: 'Numar persoane',
})

describe('formatTileValue', () => {
  it('reads a decimal comma and names the unit', () => {
    expect(formatTileValue(tile('1234,5'))).toEqual({ value: '1.234,5', unit: 'persoane' })
  })

  it('shows nothing for an empty or withheld value rather than a zero', () => {
    expect(formatTileValue(tile(''))).toBeNull()
    expect(formatTileValue(tile('  '))).toBeNull()
    expect(formatTileValue(tile('12', 'c'))).toBeNull()
    expect(formatTileValue(tile(null))).toBeNull()
  })
})

describe('tileStatusLabel', () => {
  it('spells the known flags and keeps an unknown one verbatim', () => {
    expect(tileStatusLabel('c')).toBe('confidențial')
    expect(tileStatusLabel('b')).toContain('b')
    expect(tileStatusLabel('b')).not.toBe('indisponibil')
    expect(tileStatusLabel(null)).toBeNull()
  })
})

describe('formatTileValue in the reader\'s language', () => {
  const water = { value: '607313', valueStatus: null, unitSymbol: 'other', unitNameRo: 'Mii metri cubi', unitNameEn: 'Thousands cubits metres' }

  it('names a unit INS words itself in its corrected English on an English page, and in Romanian on a Romanian one', async () => {
    // The test setup's Lingui mock is a plain object whose `activate` does nothing: the locale is set on it directly.
    const { i18n } = (await import('@lingui/core')) as unknown as { i18n: { locale: string } }
    const previous = i18n.locale
    try {
      i18n.locale = 'en'
      expect(formatTileValue(water)?.unit).toBe('Thousand cubic metres')
      i18n.locale = 'ro'
      expect(formatTileValue(water)?.unit).toBe('Mii metri cubi')
    } finally {
      i18n.locale = previous
    }
  })
})
