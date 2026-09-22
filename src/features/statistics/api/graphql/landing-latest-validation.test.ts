import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { HUB_NATIONAL_SPECS, hubTilesResponse } from '../../test/hub-fixtures'
import { validateLandingLatest } from './landing-latest-validation'
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

describe('validateLandingLatest', () => {
  it('accepts every requested cell at the requested geography', () => {
    expect(() => validateLandingLatest(tiles(), codes, NATIONAL)).not.toThrow()
  })

  it('refuses an answer that leaves a requested dataset out', () => {
    const latest = tiles((wire) => void wire.pop())
    expect(() => validateLandingLatest(latest, codes, NATIONAL)).toThrow('Missing or unexpected')
  })

  it('refuses a cell outside the requested territory', () => {
    const latest = tiles((wire) => {
      const row = cell(wire, 'POP217A')
      row.territory = { code: 'CJ', siruta_code: null, level: 'NUTS3', name_ro: 'Cluj' }
    })
    expect(() => validateLandingLatest(latest, codes, NATIONAL)).toThrow('outside the requested territory')
  })

  it('refuses a malformed decimal', () => {
    const latest = tiles((wire) => {
      cell(wire, 'POP217A').value = '77,45'
    })
    expect(() => validateLandingLatest(latest, codes, NATIONAL)).toThrow('decimal or period')
  })

  it('takes a matrix with no geography axis as national, and only for a national request', () => {
    // IPC102E and FOM106D carry no territory and no geography: that is their shape.
    const nationalOnly = ['IPC102E', 'FOM106D']
    const latest = tiles().filter((outcome) => nationalOnly.includes(outcome.dataset.code))
    expect(() => validateLandingLatest(latest, nationalOnly, NATIONAL)).not.toThrow()
    expect(() => validateLandingLatest(latest, nationalOnly, { code: 'CJ', level: 'NUTS3' })).toThrow(
      'outside the requested territory',
    )
  })

  it('refuses a national-only cell that names a place anyway', () => {
    const latest = tiles((wire) => {
      cell(wire, 'IPC102E').territory = { code: 'RO', siruta_code: null, level: 'NATIONAL', name_ro: 'Romania' }
    })
    expect(() => validateLandingLatest(latest, codes, NATIONAL)).toThrow('outside the requested territory')
  })
})
