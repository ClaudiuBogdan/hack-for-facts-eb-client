import { describe, expect, it } from 'vitest'
import type { InsDimension, InsDimensionValue } from '@/schemas/ins'
import {
  childAxisAfterPick,
  childSourceAxis,
  parentSourceAxis,
  pickSourceMember,
  rootMemberCode,
} from './source-hierarchy'

// SOM101F's layout: Sexe, Judete, Localitati (nested), Perioade, UM.
const dimensions: InsDimension[] = [
  { index: 0, type: 'CLASSIFICATION', classification_type: { code: 'D0' }, is_hierarchical: false },
  { index: 1, type: 'TERRITORIAL', classification_type: { code: 'D1' }, is_hierarchical: false },
  { index: 2, type: 'TERRITORIAL', classification_type: { code: 'D2' }, is_hierarchical: true },
  { index: 3, type: 'TEMPORAL', classification_type: null },
  { index: 4, type: 'UNIT_OF_MEASURE', classification_type: null },
]
const [sexe, judete, localitati] = dimensions

/** Pins are a set; `editSourcePin` appends, so the URL order is incidental. */
const sorted = (pins: unknown) => [...(pins as string[])].sort()

const member = (
  typeCode: string,
  code: string,
  parent: number | null = null,
): InsDimensionValue => ({
  nom_item_id: Number(code),
  dimension_type: 'CLASSIFICATION',
  parent_nom_item_id: parent,
  classification_value: { type_code: typeCode, code },
})

describe('INS axis nesting', () => {
  it('finds the axis a nested one hangs off, and the one nested inside', () => {
    expect(parentSourceAxis(dimensions, localitati)).toBe(judete)
    expect(parentSourceAxis(dimensions, judete)).toBeNull()
    expect(childSourceAxis(dimensions, judete)).toBe(localitati)
    expect(childSourceAxis(dimensions, sexe)).toBeNull()
    expect(childSourceAxis(dimensions, localitati)).toBeNull()
  })

  it('takes the root as the member with no parent', () => {
    expect(rootMemberCode([member('D2', '112'), member('D2', '114', 3064)])).toBe('112')
    expect(rootMemberCode([member('D2', '114', 3064)])).toBeNull()
  })

  it('pins a locality together with its county', () => {
    expect(
      sorted(pickSourceMember({
        pins: ['D0:105', 'D1:112', 'D2:112'],
        dimensions,
        dimension: localitati,
        value: member('D2', '114', 3064),
      })),
    ).toEqual(['D0:105', 'D1:3064', 'D2:114'])
  })

  it('leaves the county alone when the locality picked is the root', () => {
    expect(
      sorted(pickSourceMember({
        pins: ['D0:105', 'D1:3064', 'D2:114'],
        dimensions,
        dimension: localitati,
        value: member('D2', '112'),
      })),
    ).toEqual(['D0:105', 'D1:3064', 'D2:112'])
  })

  it('resets the locality to its root when the county changes under it', () => {
    const pins = new Map([['D1', '3064'], ['D2', '114']])
    const after = childAxisAfterPick({ dimensions, dimension: judete, pins, memberCode: '3065' })
    expect(after).toEqual({ action: 'reset', child: localitati })
    expect(
      sorted(pickSourceMember({
        pins: ['D0:105', 'D1:3064', 'D2:114'],
        dimensions,
        dimension: judete,
        value: member('D1', '3065'),
        childReset: { child: localitati, rootCode: '112' },
      })),
    ).toEqual(['D0:105', 'D1:3065', 'D2:112'])
  })

  it('unpins the locality when its root could not be read, rather than keep an impossible cell', () => {
    expect(
      sorted(pickSourceMember({
        pins: ['D1:3064', 'D2:114'],
        dimensions,
        dimension: judete,
        value: member('D1', '3065'),
        childReset: { child: localitati, rootCode: null },
      })),
    ).toEqual(['D1:3065'])
  })

  it('keeps the locality when the county is re-picked, or nothing is nested under it', () => {
    const pins = new Map([['D1', '3064'], ['D2', '114']])
    expect(childAxisAfterPick({ dimensions, dimension: judete, pins, memberCode: '3064' })).toEqual({ action: 'keep' })
    expect(childAxisAfterPick({ dimensions, dimension: sexe, pins, memberCode: '106' })).toEqual({ action: 'keep' })
    expect(
      childAxisAfterPick({ dimensions, dimension: judete, pins: new Map([['D1', '3064']]), memberCode: '3065' }),
    ).toEqual({ action: 'keep' })
  })
})
