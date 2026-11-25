/**
 * NavMain: the sidebar's grouped sections (`docs/design/sidebar/design.md`).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@/test/test-utils'

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('lucide-react', () => {
  const icon = () => <span data-testid="icon" />
  return {
    Activity: icon, BarChart2: icon, Map: icon, ListOrdered: icon, Boxes: icon, Landmark: icon, Scale: icon,
    Building2: icon, Briefcase: icon, Vote: icon, HeartHandshake: icon, FileStack: icon, Gavel: icon, House: icon, Users: icon,
  }
})

const mockMatches = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, onClick }: { children: React.ReactNode; to: string; onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void }) => (
    <a
      href={to}
      onClick={(event) => {
        event.preventDefault()
        onClick?.(event)
      }}
    >
      {children}
    </a>
  ),
  useMatches: () => mockMatches(),
}))

const mockSetOpenMobile = vi.fn()
const mockSidebarState = vi.fn()

vi.mock('@/components/ui/sidebar', () => ({
  SidebarGroup: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  SidebarMenuButton: ({ children, isActive }: { children: React.ReactNode; isActive?: boolean }) => (
    <div data-active={isActive ? 'true' : 'false'}>{children}</div>
  ),
  useSidebar: () => mockSidebarState(),
}))

async function renderNavMain() {
  const { NavMain } = await import('./nav-main')
  return render(<NavMain />)
}

const activeHrefs = () =>
  screen
    .getAllByRole('link')
    .filter((link) => link.closest('[data-active]')?.getAttribute('data-active') === 'true')
    .map((link) => link.getAttribute('href'))

describe('NavMain', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMatches.mockReturnValue([{ pathname: '/' }])
    mockSidebarState.mockReturnValue({ state: 'expanded', isMobile: false, setOpenMobile: mockSetOpenMobile })
  })

  it('opens with home, then four groups of sections, in order', async () => {
    await renderNavMain()

    expect(screen.getByRole('link', { name: 'Acasă' })).toHaveAttribute('href', '/')
    const groups: ReadonlyArray<readonly [string, readonly string[]]> = [
      ['Banii publici', ['/national-budget', '/procurement', '/pnrr']],
      ['Instituții și organizații', ['/public-institutions', '/companies', '/public-enterprises', '/ngos']],
      ['Lege, justiție și alegeri', ['/legislation', '/justice', '/parlament', '/alegeri']],
      ['Statistici și instrumente', ['/map', '/charts', '/ins']],
    ]
    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual(groups.map(([title]) => title))
    for (const [title, hrefs] of groups) {
      const section = screen.getByRole('heading', { name: title }).closest('section') as HTMLElement
      expect(within(section).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(hrefs)
    }
    expect(screen.getAllByRole('link')).toHaveLength(15)
  })

  it.each([
    ['/', '/'],
    ['/map', '/map'],
    ['/charts/123', '/charts'],
    ['/public-enterprises', '/public-enterprises'],
    ['/procurement/suppliers/1', '/procurement'],
    ['/alegeri/contest/x', '/alegeri'],
  ])('on %s marks only %s as active', async (path, href) => {
    mockMatches.mockReturnValue([{ pathname: path }])
    await renderNavMain()
    expect(activeHrefs()).toEqual([href])
  })

  it('marks nothing active on a sibling path such as /maps', async () => {
    mockMatches.mockReturnValue([{ pathname: '/maps/editor' }])
    await renderNavMain()
    expect(activeHrefs()).toEqual([])
  })

  it('hides labels when collapsed, but keeps each link named for screen readers', async () => {
    mockSidebarState.mockReturnValue({ state: 'collapsed', isMobile: false, setOpenMobile: mockSetOpenMobile })
    await renderNavMain()

    expect(screen.getByText('Hartă')).toHaveClass('sr-only')
    expect(screen.getByRole('link', { name: 'Hartă' })).toHaveAttribute('href', '/map')
  })

  it('closes the sheet on a phone when a link is clicked, and only there', async () => {
    mockSidebarState.mockReturnValue({ state: 'expanded', isMobile: true, setOpenMobile: mockSetOpenMobile })
    const { unmount } = await renderNavMain()
    fireEvent.click(screen.getByRole('link', { name: 'Hartă' }))
    expect(mockSetOpenMobile).toHaveBeenCalledWith(false)
    unmount()

    mockSetOpenMobile.mockClear()
    mockSidebarState.mockReturnValue({ state: 'expanded', isMobile: false, setOpenMobile: mockSetOpenMobile })
    await renderNavMain()
    fireEvent.click(screen.getByRole('link', { name: 'Hartă' }))
    expect(mockSetOpenMobile).not.toHaveBeenCalled()
  })
})
