import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkResponseKeys, compareKeys, isOlderThanNewest, newestKey, noteKey, resetNewestKeyForTests, sameKey, StaleDisclosureError, subscribeNewestKey } from './disclosure-key'

const P1 = '2026-11-18T03:10:00.123456Z'
const P2 = '2026-11-19T03:10:00.123456Z'

beforeEach(() => resetNewestKeyForTests())

describe('keys compare as instants, to the microsecond', () => {
  it('orders publications, and takes two spellings of one instant as one', () => {
    expect(compareKeys(P1, P2)).toBe(-1)
    expect(compareKeys(P2, P1)).toBe(1)
    expect(compareKeys('2026-11-18T03:10:00.123456Z', '2026-11-18T03:10:00.123457Z')).toBe(-1)
    expect(sameKey('2026-11-18 03:10:00.123456+00:00', P1)).toBe(true)
    expect(sameKey('2026-11-18T03:10:00.123Z', P1)).toBe(false)
    expect(compareKeys('off', P1)).toBeNull()
  })
})

describe('the newest key only moves forward', () => {
  it('keeps the newest publication seen, and tells listeners only when it moves', () => {
    const heard = vi.fn()
    const stop = subscribeNewestKey(heard)
    noteKey(P2)
    noteKey(P1)
    noteKey('off')
    noteKey('unavailable')
    noteKey(P2)
    expect(newestKey()).toBe(P2)
    expect(heard.mock.calls).toEqual([[P2, null]])
    expect(isOlderThanNewest(P1)).toBe(true)
    expect(isOlderThanNewest(P2)).toBe(false)
    expect(isOlderThanNewest('off')).toBe(false)
    stop()
  })

})

describe('checkResponseKeys', () => {
  it('refuses a response carrying an older publication than one seen, at any depth', () => {
    noteKey(P2)
    expect(() => checkResponseKeys({ a: { blocks: [{ meta: { disclosureKey: P1 } }] } })).toThrow(StaleDisclosureError)
    expect(() => checkResponseKeys({ a: [{ meta: { disclosureKey: P2 } }], b: { meta: { disclosureKey: 'off' } } })).not.toThrow()
    expect(() => checkResponseKeys({ ping: 'pong' })).not.toThrow()
  })

  it('refuses any block keyed unavailable: it can carry names read while access was briefly restored (root, fail closed)', () => {
    expect(() => checkResponseKeys({ r: [{ meta: { disclosureKey: 'unavailable' } }] })).toThrow(StaleDisclosureError)
    expect(() => checkResponseKeys({ r: [{ meta: { disclosureKey: 'off' } }] })).not.toThrow()
  })

  it('a newer publication moves the newest key, then an older one in the same response is refused', () => {
    noteKey(P1)
    expect(() => checkResponseKeys({ x: { meta: { disclosureKey: P2 } }, y: { meta: { disclosureKey: P1 } } })).toThrow(StaleDisclosureError)
    expect(newestKey()).toBe(P2)
  })
})
