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

  it('searches public enterprises only, a hit opening its enterprise page', () => {
    render(<EnterpriseSearch />)
    expect(last().docTypes).toEqual(['public_enterprise'])
    const hrefOf = last().hrefOf as (hit: { readonly href: string }) => string | null
    expect(hrefOf({ href: '/public-enterprises/36210321' })).toBe('/public-enterprises/36210321')
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
