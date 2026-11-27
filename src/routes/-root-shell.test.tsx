import { QueryClient } from '@tanstack/react-query'
import { createMemoryHistory, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// The root's `beforeLoad` reads the visitor's preferences; one read failing stands for any root failure. Outside a
// Start request the request-cookie read would fail first, so it reads none.
vi.mock('@/lib/user-preferences', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/user-preferences')>()),
  readRequestCookie: async () => null,
  readUserCurrencyPreference: () => Promise.reject(new Error('the preference read failed')),
}))

// The shared mock (src/test/setup.ts) plus the runtime-config script the root's `head` writes into the page.
vi.mock('@/config/env', () => ({
  env: { VITE_APP_ENVIRONMENT: 'test', VITE_API_URL: 'http://localhost:3000', NODE_ENV: 'test' },
  getSiteUrl: () => 'http://localhost:3000',
  getRuntimeConfigBootstrapScript: () => '',
  isNgoRegistryEnabled: () => false,
}))

const { Route: rootRoute } = await import('./__root')

/** The server render of `path` on the real root route, with one page under it, and the root's own error. */
async function serverRender(path: string) {
  const page = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => <main>page</main> })
  const router = createRouter({
    routeTree: rootRoute.addChildren([page]),
    history: createMemoryHistory({ initialEntries: [path] }),
    context: { queryClient: new QueryClient() },
    isServer: true,
  })
  await router.load()
  return { html: renderToString(<RouterProvider router={router} />), error: router.state.matches[0]?.error }
}

describe('the root route when it fails itself (ERR-002)', () => {
  // Before, the error page replaced the document: the answer was its markup alone, with no head and no stylesheet.
  it('renders the error page inside the document, with the root head and the theme falling back to light', async () => {
    const { html, error } = await serverRender('/')

    expect(error).toEqual(new Error('the preference read failed'))
    expect(html).toMatch(/^<html lang="[a-z]{2}" class="light"><head>/u)
    // The root's own head. Its stylesheet's address is the build's (`index.css?url` is empty here): see ERR-002's doc.
    expect(html).toMatch(/<head>.*<title>Transparenta\.eu<\/title>.*<meta name="description" content="Explore Romania[^"]*"\/>.*<\/head>/su)
    expect(html).toMatch(/<body>.*role="alert".*Pagina s-a rupt.*<\/body><\/html>$/su)
    expect(html).not.toContain('<main>page</main>')
  })
})
