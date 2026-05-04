import { describe, expect, it, vi } from 'vitest'
import { formatPnrrCompactCurrencyDisplayParts } from './pnrr-compact-currency-display'

const localeState = vi.hoisted(() => ({ locale: 'en' as 'en' | 'ro' }))

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>()
  return {
    ...actual,
    getUserLocale: () => localeState.locale,
  }
})

describe('formatPnrrCompactCurrencyDisplayParts', () => {
  it('returns amount and unit parts for English compact currency display', () => {
    localeState.locale = 'en'

    expect(formatPnrrCompactCurrencyDisplayParts(126_544_000, 'RON')).toEqual({
      amount: '632.72',
      unit: 'M RON',
    })
  })

  it('returns amount and unit parts for Romanian compact currency display', () => {
    localeState.locale = 'ro'

    expect(formatPnrrCompactCurrencyDisplayParts(126_544_000, 'RON')).toEqual({
      amount: '632,72',
      unit: 'mil. RON',
    })
  })
})
