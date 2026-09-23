import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { HUB_NATIONAL_SPECS, hubTilesResponse } from '../../test/hub-fixtures'
import { validateNationalLatest } from './national-latest-validation'
import { insLatestValueNodeRawSchema } from './statistics-raw-schemas'

const NATIONAL = { code: 'RO', level: 'NATIONAL' } as const
const codes = HUB_NATIONAL_SPECS.map((spec) => spec.code)

/** The hub's national tiles, parsed as the fetcher parses them, with one change applied to the wire first. */
function tiles(change: (latest: ReturnType<typeof hubTilesResponse>['latest']) => void = () => {}) {
  const response = hubTilesResponse()
  change(response.latest)
  return z.array(insLatestValueNodeRawSchema).parse(response.latest)
}

const cell = (latest: ReturnType<typeof hubTilesResponse>['latest'], code: string) => {
  const entry = latest.find((candidate) => candidate.dataset.code === code)
  if (!entry?.observation) throw new Error(code)
  return entry.observation as Record<string, unknown>
}

describe('validateNationalLatest', () => {
  it('accepts every requested cell at the requested geography', () => {
    expect(() => validateNationalLatest(tiles(), codes, NATIONAL)).not.toThrow()
  })

  it('names a requested dataset the answer leaves out, and keeps the rest', () => {
    const latest = tiles((wire) => void wire.pop())
    const result = validateNationalLatest(latest, codes, NATIONAL)
    expect(result.missing).toEqual([codes[codes.length - 1]])
    expect(result.outcomes).toHaveLength(codes.length - 1)
  })

  it('refuses a duplicate and an unrequested dataset', () => {
    const duplicated = tiles((wire) => void wire.push(wire[0]!))
    expect(() => validateNationalLatest(duplicated, codes, NATIONAL)).toThrow('Duplicate or unexpected')
    expect(() => validateNationalLatest(tiles(), codes.slice(1), NATIONAL)).toThrow('Duplicate or unexpected')
  })

  it('refuses a cell outside the requested territory', () => {
    const latest = tiles((wire) => {
      const row = cell(wire, 'POP217A')
      row.territory = { code: 'CJ', siruta_code: null, level: 'NUTS3', name_ro: 'Cluj' }
    })
    expect(() => validateNationalLatest(latest, codes, NATIONAL)).toThrow('outside the requested territory')
  })

  it('refuses a malformed decimal', () => {
    const latest = tiles((wire) => {
      cell(wire, 'POP217A').value = '77,45'
    })
    expect(() => validateNationalLatest(latest, codes, NATIONAL)).toThrow('decimal or period')
  })

  it('takes a matrix with no geography axis as national, and only for a national request', () => {
    // IPC102E and FOM106D carry no territory and no geography: that is their shape.
    const nationalOnly = ['IPC102E', 'FOM106D']
    const latest = tiles().filter((outcome) => nationalOnly.includes(outcome.dataset.code))
    expect(() => validateNationalLatest(latest, nationalOnly, NATIONAL)).not.toThrow()
    expect(() => validateNationalLatest(latest, nationalOnly, { code: 'CJ', level: 'NUTS3' })).toThrow(
      'outside the requested territory',
    )
  })

  it('refuses a national-only cell that names a place anyway', () => {
    const latest = tiles((wire) => {
      cell(wire, 'IPC102E').territory = { code: 'RO', siruta_code: null, level: 'NATIONAL', name_ro: 'Romania' }
    })
    expect(() => validateNationalLatest(latest, codes, NATIONAL)).toThrow('outside the requested territory')
  })
})
