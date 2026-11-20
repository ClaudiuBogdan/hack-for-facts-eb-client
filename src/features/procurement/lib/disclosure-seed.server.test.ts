import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { noteKey, resetNewestKeyForTests } from '@/lib/disclosure-key'
import { DA_DISCLOSURE_CHANGE_BOUND_SECONDS } from './disclosure-cache'
import { forgetVerifiedPublicationForTests, isPastBound, isSeedCurrent, setDisclosureUnreadable } from './disclosure-seed'

/** Supplier-privacy publications (`privacyAsOf`): a key is only noted with its instant. */
const OLD = '2026-11-19T02:00:00Z'
const NEW = '2026-11-20T02:00:00Z'

// The suite's setup needs jsdom: the server is the absence of `window`.
describe('a server render’s seed', () => {
  beforeEach(() => {
    vi.stubGlobal('window', undefined)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    forgetVerifiedPublicationForTests()
    resetNewestKeyForTests()
  })

  it('seeds the render however long the server process has run: the open tab’s clock is never read on the server', () => {
    vi.useFakeTimers()
    forgetVerifiedPublicationForTests()
    vi.advanceTimersByTime((DA_DISCLOSURE_CHANGE_BOUND_SECONDS + 60) * 1000)
    expect(isPastBound()).toBe(true)
    expect(isSeedCurrent({ disclosure: 'on:t1:d6:p1', disclosureReadAt: Date.now() })).toBe(true)
  })

  it('takes no tab state into account on the server', () => {
    setDisclosureUnreadable(true)
    expect(isSeedCurrent({ disclosure: `on:t1:d6:${OLD}`, disclosureReadAt: Date.now() })).toBe(true)
  })

  it('still refuses a seed read under an older publication than the process has seen since', () => {
    noteKey(NEW)
    expect(isSeedCurrent({ disclosure: `on:t1:d6:${OLD}`, disclosureReadAt: Date.now() })).toBe(false)
    expect(isSeedCurrent({ disclosure: `on:t1:d6:${NEW}`, disclosureReadAt: Date.now() })).toBe(true)
  })
})

describe('an open tab’s seed', () => {
  afterEach(() => {
    vi.useRealTimers()
    forgetVerifiedPublicationForTests()
  })

  it('is still dropped past the bound without a reading', () => {
    vi.useFakeTimers()
    forgetVerifiedPublicationForTests()
    vi.advanceTimersByTime((DA_DISCLOSURE_CHANGE_BOUND_SECONDS + 60) * 1000)
    expect(isSeedCurrent({ disclosure: 'on:t1:d6:p1', disclosureReadAt: Date.now() })).toBe(false)
  })
})
