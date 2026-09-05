import {
  counties,
  observation,
  source,
  exampleSource,
} from '../test/native-landing-fixtures'
import { describe, expect, it } from 'vitest'
import type { NativeLandingSource } from './native-landing-types'
import {
  buildNativeCountyStory,
  buildNativeLandingExample,
  validateLandingCountyUniverse,
} from './native-landing'

const story = (input: NativeLandingSource) =>
  buildNativeCountyStory(input, 2016, 2025)
describe('complete native county population story', () => {
  it('keeps all-flat results available and sends compact provenance without whole history', () => {
    const result = story(source())
    expect(result).toMatchObject({
      status: 'AVAILABLE',
      expectedCount: 42,
      eligibleCount: 42,
      unchangedCount: 42,
      declines: [],
      gains: [],
    })
    expect(result.source).not.toHaveProperty('observations')
  })
  it('compares close long decimals by exact cross-products and preserves original strings', () => {
    const input = source()
    const rows = input.observations.map((r) =>
      ['AB', 'AG'].includes(r.territory!.code ?? '')
        ? {
            ...r,
            value:
              r.time_period.year === 2016
                ? '100000000000000000000000000000.0000'
                : r.territory!.code === 'AB'
                  ? '100000000000000000000000000000.0001'
                  : '100000000000000000000000000000.0002',
          }
        : r,
    )
    const result = story({ ...input, observations: rows })
    expect(result.status).toBe('AVAILABLE')
    expect(result.gains.map((r) => r.code)).toEqual(['AG', 'AB'])
    expect(result.gains[0].end.value).toBe(
      '100000000000000000000000000000.0002',
    )
    expect(result.gains[0].selection).toEqual({
      clasificari: ['D0:0', 'D1:510'],
      unitate: '0',
    })
  })
  it('sorts negative changes, rounds only display percentages and breaks ties deterministically', () => {
    const input = source()
    const result = story({
      ...input,
      observations: input.observations.map((r) =>
        r.time_period.year === 2025 &&
        ['AB', 'AG'].includes(r.territory!.code ?? '')
          ? { ...r, value: '87.65' }
          : r,
      ),
    })
    expect(result.declines.map((r) => r.code)).toEqual(['AB', 'AG'])
    expect(result.declines[0].pctChange).toBe('-12.4')
  })
  it.each([null, '0', '-1'])(
    'withholds every ranking for an invalid county start %s',
    (value) => {
      const input = source()
      const result = story({
        ...input,
        observations: input.observations.map((r) =>
          r.territory!.code === 'B' && r.time_period.year === 2016
            ? { ...r, value }
            : r,
        ),
      })
      expect(result.status).toBe('UNAVAILABLE')
      expect(result.declines).toEqual([])
      expect(result.gains).toEqual([])
      expect(result.issues[0].code).toBe('B')
    },
  )
  it('withholds ranking for a wholly missing county rather than shrinking its universe', () => {
    const input = source()
    const result = story({
      ...input,
      observations: input.observations.filter((r) => r.territory!.code !== 'B'),
    })
    expect(result).toMatchObject({
      status: 'UNAVAILABLE',
      eligibleCount: 41,
      issues: [{ code: 'B', reason: 'MISSING' }],
    })
  })
  it('rejects disjoint-year alternatives before endpoint selection', () => {
    const input = source()
    const result = story({
      ...input,
      observations: [...input.observations, observation('B', 2010, '100', 11)],
    })
    expect(result.issues).toEqual([{ code: 'B', reason: 'AMBIGUOUS' }])
  })
  it('withholds qualified history and flagged endpoints while retaining source observations', () => {
    const input = source()
    const flagged = input.observations.map((r) =>
      r.territory!.code === 'B' && r.time_period.year === 2025
        ? { ...r, value_status: 'p' }
        : r,
    )
    expect(story({ ...input, observations: flagged }).issues).toMatchObject([
      { code: 'B', reason: 'STATUS' },
    ])
    const qualified = observation('B', 2010)
    qualified.dimensions.geography!.qualified = true
    expect(
      story({ ...input, observations: [...input.observations, qualified] })
        .issues,
    ).toEqual([{ code: 'B', reason: 'QUALIFIED' }])
  })
  it.each(
    [
      counties.slice(1),
      [...counties.slice(1), counties[1]],
      counties.map((c) => (c.code === 'B' ? { ...c, code: 'ZZ' } : c)),
      counties.map((c) => (c.code === 'B' ? { ...c, level: 'LAU' } : c)),
    ].map((catalog) => [catalog] as const),
  )('requires exact independent county membership %#', (catalog) =>
    expect(() => validateLandingCountyUniverse(catalog)).toThrow(),
  )
  it('fails structural duplicate, wrong-unit and missing-custody data', () => {
    const input = source()
    expect(() =>
      story({
        ...input,
        observations: input.observations.map((row) => ({
          ...row,
          value_status: undefined,
        })),
      }),
    ).toThrow('status')
    expect(() =>
      story({
        ...input,
        observations: [...input.observations, input.observations[0]],
      }),
    ).toThrow()
    expect(() =>
      story({
        ...input,
        observations: input.observations.map((r) => ({
          ...r,
          unit: { code: '1' },
        })),
      }),
    ).toThrow()
    expect(() =>
      story({
        ...input,
        descriptor: {
          ...input.descriptor,
          metadata: { ...input.descriptor.metadata, custody_sha256: undefined },
        },
      }),
    ).toThrow('custody')
  })
})
describe('native landing fixed-territory example', () => {
  it('keeps the latest common year explicit and records later source coverage', () => {
    const input = exampleSource()
    const result = buildNativeLandingExample({
      ...input,
      observations: input.observations.filter(
        (r) => r.territory!.code === 'RO' || r.time_period.year !== 2025,
      ),
    })
    expect(result.status).toBe('AVAILABLE')
    if (result.status !== 'AVAILABLE') throw new Error('expected available')
    expect(result.year).toBe(2024)
    expect(result.latestYearByTerritory).toContainEqual(
      expect.objectContaining({
        code: 'RO',
        year: 2025,
        observation: expect.objectContaining({
          value: '110',
          value_status: null,
        }),
      }),
    )
    expect(result.rows).toHaveLength(3)
    expect(result.rows[0].observation.value).toBe('100')
  })
  it('does not advertise a later null cell and retains the status of later numeric coverage', () => {
    const input = exampleSource()
    const result = buildNativeLandingExample({
      ...input,
      observations: input.observations.map((r) =>
        r.time_period.year === 2025
          ? {
              ...r,
              value: r.territory!.code === 'RO' ? '110' : null,
              value_status: 'p',
            }
          : r,
      ),
    })
    expect(result.status).toBe('AVAILABLE')
    if (result.status !== 'AVAILABLE') throw new Error('expected available')
    expect(result.year).toBe(2024)
    expect(result.latestYearByTerritory).toEqual([
      expect.objectContaining({
        code: 'RO',
        year: 2025,
        observation: expect.objectContaining({
          value: '110',
          value_status: 'p',
        }),
      }),
      expect.objectContaining({ code: 'CJ', year: 2024 }),
      expect.objectContaining({ code: '54975', year: 2024 }),
    ])
  })
  it('never drops a missing territory or picks a clean year from ambiguous history', () => {
    const input = exampleSource()
    expect(
      buildNativeLandingExample({
        ...input,
        observations: input.observations.filter(
          (r) => r.territory!.code !== '54975',
        ),
      }),
    ).toMatchObject({ status: 'UNAVAILABLE', reason: 'SERIES' })
    expect(
      buildNativeLandingExample({
        ...input,
        observations: [
          ...input.observations,
          observation('RO', 2010, '100', 11, 'FOM104D'),
        ],
      }),
    ).toMatchObject({ status: 'UNAVAILABLE', reason: 'SERIES' })
  })
  it('does not hide a status by selecting an older common year', () => {
    const input = exampleSource()
    expect(
      buildNativeLandingExample({
        ...input,
        observations: input.observations.map((r) =>
          r.territory!.code === 'RO' && r.time_period.year === 2025
            ? { ...r, value_status: 'p' }
            : r,
        ),
      }),
    ).toMatchObject({
      status: 'UNAVAILABLE',
      reason: 'STATUS',
      issues: [{ code: 'RO', reason: 'STATUS' }],
    })
  })
  it('keeps a null common endpoint unavailable and explains when no common year exists', () => {
    const input = exampleSource()
    expect(
      buildNativeLandingExample({
        ...input,
        observations: input.observations.map((r) =>
          r.territory!.code === 'RO' ? { ...r, value: null } : r,
        ),
      }),
    ).toMatchObject({ status: 'UNAVAILABLE', reason: 'PERIOD' })
  })
})
