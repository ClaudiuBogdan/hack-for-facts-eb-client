import { describe, expect, it } from 'vitest'
import type { StatisticsExampleObservation } from '@/schemas/statistics'
import { buildLandingExample } from './landing-example'

const obs = (
  level: StatisticsExampleObservation['level'],
  code: string,
  year: number,
  value: string | null,
): StatisticsExampleObservation => ({
  level,
  code,
  siruta: level === 'LAU' ? code : null,
  name: code,
  year,
  value,
  unitSymbol: 'pers.',
})

describe('buildLandingExample', () => {
  it('picks the latest year common to ALL territories', () => {
    const example = buildLandingExample([
      obs('NATIONAL', 'RO', 2024, '5453155'),
      obs('NUTS3', 'CJ', 2024, '261239'),
      obs('LAU', '54975', 2024, '195025'),
      // 2025 exists only nationally — must not be picked.
      obs('NATIONAL', 'RO', 2025, '5500000'),
    ])

    expect(example?.year).toBe(2024)
    expect(example?.rows.map((row) => row.level)).toEqual([
      'NATIONAL',
      'NUTS3',
      'LAU',
    ])
    expect(example?.lauShareOfCounty).toBeCloseTo(74.65, 1)
  })

  it('returns null when no common year exists', () => {
    const example = buildLandingExample([
      obs('NATIONAL', 'RO', 2024, '100'),
      obs('LAU', '54975', 2023, '10'),
    ])
    expect(example).toBeNull()
  })

  it('treats null values as absent for the common-year requirement', () => {
    const example = buildLandingExample([
      obs('NATIONAL', 'RO', 2024, '100'),
      obs('NUTS3', 'CJ', 2024, null),
      obs('LAU', '54975', 2024, '10'),
      obs('NATIONAL', 'RO', 2023, '90'),
      obs('NUTS3', 'CJ', 2023, '50'),
      obs('LAU', '54975', 2023, '9'),
    ])
    expect(example?.year).toBe(2023)
  })
})
