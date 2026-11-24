import { afterEach, describe, expect, it } from 'vitest'
import { readCookieValue } from '@/lib/user-preferences'
import { addDismissedNotice, PAGE_NOTICE_COOKIE, parseDismissedNotices, rememberDismissedNotice } from './page-notice-cookie'

describe('page notice cookie', () => {
  afterEach(() => {
    document.cookie = `${PAGE_NOTICE_COOKIE}=; Path=/; Max-Age=0`
  })

  it('reads a comma-separated list and drops malformed ids', () => {
    expect(parseDismissedNotices('public-enterprises,ngos')).toEqual(['public-enterprises', 'ngos'])
    expect(parseDismissedNotices('ok,Bad Id,,-x,x-')).toEqual(['ok'])
    expect(parseDismissedNotices(null)).toEqual([])
  })

  it('adds an id once, latest last, and keeps the list bounded', () => {
    expect(addDismissedNotice(['a', 'b'], 'a')).toEqual(['b', 'a'])
    expect(addDismissedNotice(['a'], 'not valid')).toEqual(['a'])
    const many = Array.from({ length: 30 }, (_, index) => `n${index}`)
    const next = addDismissedNotice(many, 'new')
    expect(next).toHaveLength(30)
    expect(next[0]).toBe('n1')
    expect(next[next.length - 1]).toBe('new')
  })

  it('writes a session cookie (no expiry) that accumulates dismissals', () => {
    rememberDismissedNotice('public-enterprises')
    rememberDismissedNotice('ngos')
    expect(parseDismissedNotices(readCookieValue(PAGE_NOTICE_COOKIE))).toEqual(['public-enterprises', 'ngos'])
  })
})
