import { render } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EnterpriseSearch } from './hub-search'

const state = vi.hoisted(() => ({ hash: '', mobile: false, props: [] as Record<string, unknown>[] }))

vi.mock('@tanstack/react-router', () => ({ useLocation: () => ({ hash: state.hash }) }))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => state.mobile }))
vi.mock('@/features/landing/components/search/landing-search', () => ({
  LandingSearch: (props: Record<string, unknown>) => {
    state.props.push(props)
    return null
  },
}))

const last = () => state.props[state.props.length - 1] ?? {}

describe('EnterpriseSearch', () => {
  beforeEach(() => {
    state.hash = ''
    state.mobile = false
    state.props = []
  })

  it('searches public enterprises only, those indexed as institutions included, a hit opening its enterprise page', () => {
    render(<EnterpriseSearch />)
    // An enterprise that is also a public institution is indexed as `organization`;
    // the enterprise role keeps the institutions to enterprises (PC-AUDIT-02).
    expect(last().docTypes).toEqual(['public_enterprise', 'organization'])
    expect(last().roles).toEqual(['public_enterprise'])
    const hrefOf = last().hrefOf as (hit: { readonly href: string; readonly roles?: readonly string[] }) => string | null
    expect(hrefOf({ href: '/public-enterprises/36210321' })).toBe('/public-enterprises/36210321')
    expect(hrefOf({ href: '/entities/10020943', roles: ['company', 'organization', 'public_enterprise'] }))
      .toBe('/public-enterprises/10020943')
    expect(hrefOf({ href: '/entities/16054368', roles: ['organization', 'public_enterprise'] })).toBe('/public-enterprises/16054368')
    // Hidroelectrica and Romsilva were found before and still open the same pages.
    expect(hrefOf({ href: '/public-enterprises/13267213', roles: ['company', 'pnrr_entity', 'public_enterprise'] }))
      .toBe('/public-enterprises/13267213')
    expect(hrefOf({ href: '/public-enterprises/1590120', roles: ['company', 'pnrr_entity', 'public_enterprise'] }))
      .toBe('/public-enterprises/1590120')
    expect(hrefOf({ href: '/entities/4305857', roles: ['organization'] })).toBeNull()
  })

  it('takes the focus on a desktop’s first view', () => {
    render(<EnterpriseSearch />)
    expect(last().autoFocus).toBe(true)
  })

  it('leaves the focus where the address sends the reader (a band), and on a phone', () => {
    state.hash = 'stare'
    render(<EnterpriseSearch />)
    expect(last().autoFocus).toBe(false)
    state.hash = ''
    state.mobile = true
    render(<EnterpriseSearch />)
    expect(last().autoFocus).toBe(false)
    expect(last().scrollToTopOnFocus).toBe(true)
  })
})
