import { describe, expect, it } from 'vitest'
import { pageNoticeScope } from './page-notice-scope'

describe('pageNoticeScope', () => {
  it('scopes a notice to the section, so subpages share it', () => {
    expect(pageNoticeScope('/procurement')).toBe('procurement')
    expect(pageNoticeScope('/procurement/suppliers/123')).toBe('procurement')
    expect(pageNoticeScope('/national-budget/analytics/')).toBe('national-budget')
    expect(pageNoticeScope('/entities/4270740')).toBe('entities')
  })

  it('skips the landing page and pages with no data', () => {
    for (const path of ['/', '', '/privacy', '/cookies', '/sign-in', '/settings/notifications', '/admin/x', '/development/shell/page-notice']) {
      expect(pageNoticeScope(path), path).toBeNull()
    }
  })

  it('skips the map page, whose map fills the window (owner, 25 November 2026), but not the map editor', () => {
    expect(pageNoticeScope('/map')).toBeNull()
    expect(pageNoticeScope('/ro/map')).toBeNull()
    expect(pageNoticeScope('/maps/editor')).toBe('maps')
  })

  it('reads past a language prefix and makes a valid id', () => {
    expect(pageNoticeScope('/ro/learning/x')).toBe('learning')
    expect(pageNoticeScope('/en/unsubscribe/tok')).toBeNull()
    expect(pageNoticeScope('/Intreprinderi_Publice')).toBe('intreprinderi-publice')
  })
})
