import { render, screen, within } from '@testing-library/react'
import { Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { LegislationShell } from './legislation-shell'

/**
 * The slim head on the real router: the way home is not marked current on a page under `/legislation` (the
 * router's default match is a prefix), and only the open page is current in the pinned row.
 */
describe('LegislationShell on the router', () => {
  it('marks only the guide as current on /legislation/guide', async () => {
    const root = createRootRoute({ component: Outlet })
    const landing = createRoute({ getParentRoute: () => root, path: 'legislation', component: Outlet })
    const landingIndex = createRoute({ getParentRoute: () => landing, path: '/', component: () => <p>pornire</p> })
    const guide = createRoute({
      getParentRoute: () => landing,
      path: 'guide',
      component: () => (
        <LegislationShell activeTab="ghid">
          <p>ghid</p>
        </LegislationShell>
      ),
    })
    const router = createRouter({
      routeTree: root.addChildren([landing.addChildren([landingIndex, guide])]),
      history: createMemoryHistory({ initialEntries: ['/legislation/guide'] }),
    })
    render(<RouterProvider router={router} />)

    const home = await screen.findByRole('link', { name: 'Legislație' })
    expect(home).toHaveAttribute('href', '/legislation')
    expect(home).not.toHaveAttribute('aria-current')
    const nav = screen.getByRole('navigation', { name: 'Paginile legislației' })
    const current = within(nav)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
    expect(current.map((link) => link.textContent)).toEqual(['Ghid'])
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(current.length + 1) // + the trail's „Ghid"
  })
})
