import { act, render, screen } from '@testing-library/react'
import {
  Outlet,
  RouterProvider,
  createLazyRoute,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { quietRoutePreloads, reloadIfCodeFailed } from '@/lib/route-code-warmup'
import { useWarmRouteCodeOnIntent } from './use-warm-route-code'

// What `quietChunkLoad` reports; its own handling of Vite's event is tested
// with it. Here: what the app does with the answer, on a real router. A
// failing import below raises `chunkError`, as Vite's event would: the
// router's own preload swallows the rejection itself.
const chunks = vi.hoisted(() => ({ chunkError: false }))
vi.mock('@/lib/chunk-recovery', () => ({
  quietChunkLoad: async (load: () => Promise<unknown>) => {
    chunks.chunkError = false
    try {
      await load()
      return !chunks.chunkError
    } catch {
      return false
    }
  },
  reloadForFreshCode: () => {
    if (navigator.onLine === false) return false
    window.location.reload()
    return true
  },
}))

const reload = vi.fn()
const realLocation = window.location

function Shell() {
  useWarmRouteCodeOnIntent()
  return (
    <>
      <a href="/ins/seturi/POP107D">spre serie</a>
      <Outlet />
    </>
  )
}

// A path the app's own route types know, so the router's typed API accepts it.
const seriesPage = () =>
  Promise.resolve(createLazyRoute('/ins/seturi/$cod')({ component: () => <p>pagina seriei</p> }))
const chunkFailure = () => {
  chunks.chunkError = true
  return Promise.reject(new Error('Failed to fetch dynamically imported module'))
}

/**
 * A router whose series route imports its page through `imports`, one call
 * per import, and runs `loader` if given.
 */
function renderRouter(
  imports: Array<() => Promise<unknown>>,
  options: { readonly loader?: () => unknown; readonly at?: string } = {},
) {
  const lazyFn = vi.fn(() => (imports.shift() ?? seriesPage)())
  const root = createRootRoute({ component: Shell })
  const home = createRoute({ getParentRoute: () => root, path: '/', component: () => <p>acasă</p> })
  const series = createRoute({
    getParentRoute: () => root,
    path: 'ins/seturi/$cod',
    ...(options.loader ? { loader: options.loader } : {}),
  }).lazy(lazyFn as unknown as () => ReturnType<typeof seriesPage>)
  const router = createRouter({
    routeTree: root.addChildren([home, series]),
    history: createMemoryHistory({ initialEntries: [options.at ?? '/'] }),
  })
  render(<RouterProvider router={router} />)
  return { router, lazyFn }
}

function touchLink() {
  act(() => {
    screen.getByText('spre serie').dispatchEvent(new Event('touchstart', { bubbles: true }))
  })
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 5; i += 1) await Promise.resolve()
  })
}

describe('a warm-up that failed, on a real router', () => {
  beforeEach(() => {
    reload.mockReset()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: 'http://localhost:3000/', origin: 'http://localhost:3000', reload },
    })
  })
  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation })
    Reflect.deleteProperty(navigator, 'onLine')
  })

  it('turns any later navigation to that page into a page load — one no link started, too', async () => {
    const { router } = renderRouter([chunkFailure])
    await screen.findByText('acasă')
    touchLink()
    await flush()
    expect(reload).not.toHaveBeenCalled()

    // The address must already name the page being reloaded into: the
    // browser's history writes it late, and only the flush makes it so (the
    // memory history here has it at once, so the flush is what this proves).
    const flushHistory = vi.spyOn(router.history, 'flush')
    const atReload = { flushed: false, pathname: '' }
    reload.mockImplementation(() => {
      atReload.flushed = flushHistory.mock.calls.length > 0
      atReload.pathname = router.history.location.pathname
    })
    await act(() => router.navigate({ to: '/ins/seturi/$cod', params: { cod: 'POP107D' } }))
    expect(reload).toHaveBeenCalledTimes(1)
    expect(atReload).toEqual({ flushed: true, pathname: '/ins/seturi/POP107D' })
  })

  it('leaves a page whose code arrived to the router', async () => {
    const { router, lazyFn } = renderRouter([seriesPage])
    await screen.findByText('acasă')
    touchLink()
    await flush()
    await act(() => router.navigate({ to: '/ins/seturi/$cod', params: { cod: 'POP107D' } }))
    expect(await screen.findByText('pagina seriei')).toBeInTheDocument()
    expect(reload).not.toHaveBeenCalled()
    expect(lazyFn).toHaveBeenCalledTimes(2)
  })

  it('reloads the page the reader reached while its fetch was still under way, once it fails', async () => {
    let fail: (error: Error) => void = () => undefined
    const inFlight = () =>
      new Promise((_, reject) => {
        fail = reject
      })
    const { router } = renderRouter([inFlight, seriesPage])
    await screen.findByText('acasă')
    touchLink()
    await act(() => router.navigate({ to: '/ins/seturi/$cod', params: { cod: 'POP107D' } }))
    expect(await screen.findByText('pagina seriei')).toBeInTheDocument()
    expect(reload).not.toHaveBeenCalled()

    fail(new Error('Unable to preload CSS for /assets/companies._cui.css'))
    await flush()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not trade the app for the browser’s offline page', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    const { router } = renderRouter([chunkFailure])
    await screen.findByText('acasă')
    touchLink()
    await flush()
    await act(() => router.navigate({ to: '/ins/seturi/$cod', params: { cod: 'POP107D' } }))
    expect(reload).not.toHaveBeenCalled()
  })
})

describe('the router’s own preloads', () => {
  const series = { to: '/ins/seturi/$cod', params: { cod: 'POP107D' } } as const

  beforeEach(() => {
    reload.mockReset()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: 'http://localhost:3000/', origin: 'http://localhost:3000', reload },
    })
    // The saved preference the page was opened in: the test build's Lingui is English.
    document.cookie = 'user-locale=en; path=/'
  })
  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation })
    document.cookie = 'user-locale=; path=/; max-age=0'
  })

  it('records a page whose code failed on hover, so reaching it becomes a page load — never the page on screen', async () => {
    const { router } = renderRouter([chunkFailure])
    quietRoutePreloads(router)
    await screen.findByText('acasă')
    await act(() => router.preloadRoute(series))
    expect(reload).not.toHaveBeenCalled()

    reloadIfCodeFailed(router, '/')
    expect(reload).not.toHaveBeenCalled()
    reloadIfCodeFailed(router, '/ins/seturi/POP107D')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('records nothing when the code arrived', async () => {
    const { router, lazyFn } = renderRouter([seriesPage])
    quietRoutePreloads(router)
    await screen.findByText('acasă')
    await act(() => router.preloadRoute(series))
    expect(lazyFn).toHaveBeenCalled()
    reloadIfCodeFailed(router, '/ins/seturi/POP107D')
    expect(reload).not.toHaveBeenCalled()
  })

  it('does not preload a link to the other language, whose root would switch the page’s', async () => {
    const { router, lazyFn } = renderRouter([seriesPage])
    quietRoutePreloads(router)
    await screen.findByText('acasă')
    // The test build's Lingui is English.
    await act(() =>
      router.preloadRoute({ ...series, search: { lang: 'ro' } } as unknown as Parameters<typeof router.preloadRoute>[0]),
    )
    expect(lazyFn).not.toHaveBeenCalled()
  })

  it('does not preload a link without a language when the saved preference would switch the page’s', async () => {
    // Opened in English by the address, but the cookie says Romanian: the
    // root would activate Romanian for a link that does not name a language.
    document.cookie = 'user-locale=ro; path=/'
    const { router, lazyFn } = renderRouter([seriesPage])
    quietRoutePreloads(router)
    await screen.findByText('acasă')
    await act(() => router.preloadRoute(series))
    expect(lazyFn).not.toHaveBeenCalled()
  })

  it('puts a failure inside the router’s own preload — a loader’s import — down to the page', async () => {
    const loader = vi.fn(() => chunkFailure())
    const { router } = renderRouter([seriesPage], { loader })
    quietRoutePreloads(router)
    await screen.findByText('acasă')
    await act(() => router.preloadRoute(series))
    expect(loader).toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
    reloadIfCodeFailed(router, '/ins/seturi/POP107D')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('never fetches, nor holds against, a route already on screen', async () => {
    const { router, lazyFn } = renderRouter([seriesPage], { at: '/ins/seturi/POP107D' })
    quietRoutePreloads(router)
    expect(await screen.findByText('pagina seriei')).toBeInTheDocument()
    const mounting = lazyFn.mock.calls.length
    touchLink()
    await flush()
    expect(lazyFn).toHaveBeenCalledTimes(mounting)
  })
})
