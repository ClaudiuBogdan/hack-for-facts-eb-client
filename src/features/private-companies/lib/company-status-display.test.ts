import { describe, expect, it } from 'vitest'
import {
  getCompanyStatusDisplayLabel,
  getCompanyStatusTone,
} from './company-status-display'

describe('company-status-display', () => {
  it('maps active ONRC code to positive tone and friendly label', () => {
    const status = { code: '1048', label: 'funcțiune' }
    expect(getCompanyStatusTone(status)).toBe('positive')
    expect(getCompanyStatusDisplayLabel(status)).toBe('Active')
  })

  it('normalizes Romanian diacritics when deriving active labels', () => {
    const status = { code: '9999', label: 'ÎN FUNCŢIUNE' }
    expect(getCompanyStatusTone(status)).toBe('positive')
    expect(getCompanyStatusDisplayLabel(status)).toBe('Active')
  })

  it('maps dissolution codes to negative tone', () => {
    expect(getCompanyStatusTone({ code: '1084', label: 'radiată' })).toBe(
      'negative',
    )
    expect(getCompanyStatusTone({ code: '1049', label: 'dizolvare' })).toBe(
      'negative',
    )
  })

  it('maps legal impediment codes to warning tone', () => {
    expect(
      getCompanyStatusTone({
        code: '2065',
        label: 'mandat administratori expirat',
      }),
    ).toBe('warning')
  })
})
