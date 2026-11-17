import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clerkCookieSuffix,
  isSessionValue,
  readCookie,
  readSessionHint,
  sessionHintFromCookies,
} from './session-hint'

describe('readCookie', () => {
  it('finds a cookie among others, ignoring spaces', () => {
    expect(readCookie('a=1; __client_uat_x=17; b=2', '__client_uat_x')).toBe('17')
  })

  it('keeps "=" inside the value and needs an exact name', () => {
    expect(readCookie('__session=a=b=c', '__session')).toBe('a=b=c')
    expect(readCookie('__client_uat_x=5', '__client_uat')).toBeUndefined()
  })

  it('returns undefined when the cookie is absent or the string is empty', () => {
    expect(readCookie('', '__client_uat')).toBeUndefined()
    expect(readCookie('novalue', 'novalue')).toBeUndefined()
  })
})

describe('isSessionValue', () => {
  it.each([
    [undefined, false],
    ['', false],
    ['0', false],
    ['-1', false],
    ['abc', false],
    ['1794919910', true],
  ])('%s → %s', (value, expected) => {
    expect(isSessionValue(value)).toBe(expected)
  })
})

describe('clerkCookieSuffix', () => {
  it('is the first 8 characters of base64url(SHA-1(key))', async () => {
    expect(await clerkCookieSuffix('pk_test_abc')).toBe('xAsktmsC')
  })

  it('maps "+" and "/" to the URL-safe alphabet', async () => {
    // base64 of this key's digest starts "0HHYL+H+"
    expect(await clerkCookieSuffix('pk_test_vector7')).toBe('0HHYL-H-')
  })

  it('returns null without crypto.subtle', async () => {
    vi.stubGlobal('crypto', {})
    try {
      expect(await clerkCookieSuffix('pk_test_abc')).toBeNull()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('sessionHintFromCookies', () => {
  it('reads only the instance copy when the suffix is known', () => {
    // A session on another Clerk instance of the same domain sets the shared cookie.
    expect(sessionHintFromCookies('__client_uat=1794919910; __client_uat_xAsktmsC=0', 'xAsktmsC')).toBe('signed-out')
    expect(sessionHintFromCookies('__client_uat=1794919910', 'xAsktmsC')).toBe('signed-out')
    expect(sessionHintFromCookies('__client_uat=0; __client_uat_xAsktmsC=1794919910', 'xAsktmsC')).toBe('signed-in')
  })

  it('without a suffix, counts any instance’s session, so it can only err towards loading Clerk', () => {
    expect(sessionHintFromCookies('__client_uat=0; __client_uat_xAsktmsC=1794919910', null)).toBe('signed-in')
    expect(sessionHintFromCookies('__client_uat=1794919910', null)).toBe('signed-in')
    expect(sessionHintFromCookies('__client_uat=0', null)).toBe('signed-out')
    expect(sessionHintFromCookies('', null)).toBe('signed-out')
  })
})

describe('readSessionHint', () => {
  afterEach(() => {
    document.cookie = '__client_uat_xAsktmsC=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  })

  it('reads the live document cookie each time', async () => {
    expect(await readSessionHint('pk_test_abc')).toBe('signed-out')
    document.cookie = '__client_uat_xAsktmsC=1794919910'
    expect(await readSessionHint('pk_test_abc')).toBe('signed-in')
  })
})
