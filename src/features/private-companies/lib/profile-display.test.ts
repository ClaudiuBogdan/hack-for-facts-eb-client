import { describe, expect, it } from 'vitest'
import { danteInternationalProfile } from '../mocks/fixtures'
import {
  formatPrivateCompanyRegistrationDate,
  getPrivateCompanySourceReferences,
} from './profile-display'

describe('profile-display', () => {
  it('formats valid registration dates for display', () => {
    expect(formatPrivateCompanyRegistrationDate('2002-06-15')).toBe(
      '15.06.2002',
    )
  })

  it('returns null for missing or invalid registration dates', () => {
    expect(formatPrivateCompanyRegistrationDate(null)).toBeNull()
    expect(formatPrivateCompanyRegistrationDate('not-a-date')).toBeNull()
  })

  it('returns source references in stable page order', () => {
    expect(
      getPrivateCompanySourceReferences(danteInternationalProfile),
    ).toEqual([
      {
        id: 'onrc',
        name: 'ONRC open data',
        snapshotDate: '2026-05-06',
        label: 'firme-06-05-2026',
      },
      {
        id: 'anaf',
        name: 'ANAF public fiscal data',
        snapshotDate: '2026-05-16',
        label: undefined,
      },
    ])
  })
})
