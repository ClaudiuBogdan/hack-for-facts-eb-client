import { describe, expect, it } from 'vitest'
import { sanitizeRedirect } from './safe-redirect'

describe('sanitizeRedirect', () => {
  it('keeps same-origin paths, query and hash', () => {
    expect(sanitizeRedirect('/charts')).toBe('/charts')
    expect(sanitizeRedirect('/achizitii?an=2025#top')).toBe('/achizitii?an=2025#top')
    expect(sanitizeRedirect('/')).toBe('/')
  })

  it('refuses anything that could leave the origin', () => {
    expect(sanitizeRedirect('//evil.example/path')).toBeUndefined()
    expect(sanitizeRedirect('/\\evil.example/path')).toBeUndefined()
    expect(sanitizeRedirect('https://evil.example')).toBeUndefined()
    expect(sanitizeRedirect('javascript:alert(1)')).toBeUndefined()
    expect(sanitizeRedirect('charts')).toBeUndefined()
    expect(sanitizeRedirect(42)).toBeUndefined()
    expect(sanitizeRedirect(undefined)).toBeUndefined()
  })

  it('returns a path the router can parse', () => {
    expect(sanitizeRedirect('/\\[')).toBeUndefined()
    expect(sanitizeRedirect('/a b')).toBe('/a%20b')
  })
})
