import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWarmRouteCode, useWarmRouteCodeOnIntent } from './use-warm-route-code'

type FakeRoute = {
  id: string
  lazyFn?: ReturnType<typeof vi.fn>
  options: { component?: { preload?: ReturnType<typeof vi.fn> } }
}

vi.mock('@/lib/chunk-recovery', () => ({
  quietChunkLoad: async (load: () => Promise<unknown>) => {
    try {
      await load()
      return true
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

let rootRoute: FakeRoute
let detailRoute: FakeRoute
let splitRoute: FakeRoute
const router = {
  routesById: {} as Record<string, FakeRoute>,
  latestLocation: { pathname: '/' },
  state: { matches: [] as { routeId: string }[] },
  history: { flush: vi.fn() },
  subscribe: vi.fn(() => () => undefined),
  getMatchedRoutes: vi.fn((path: string) => {
    if (path.startsWith('/ins/seturi/')) return { foundRoute: detailRoute, matchedRoutes: [rootRoute, detailRoute] }
    if (path.startsWith('/justitie')) return { foundRoute: splitRoute, matchedRoutes: [rootRoute, splitRoute] }
    return { foundRoute: undefined, matchedRoutes: [rootRoute] }
  }),
}
vi.mock('@tanstack/react-router', () => ({ useRouter: () => router }))

beforeEach(() => {
  // Fresh routes per test: the hook remembers which routes it has warmed.
  rootRoute = { id: '__root__', options: {} }
  detailRoute = { id: '/ins/seturi/$cod', lazyFn: vi.fn(() => Promise.resolve({})), options: {} }
  splitRoute = { id: '/justitie/', options: { component: { preload: vi.fn(() => Promise.resolve()) } } }
  router.routesById = { '/ins/seturi/$cod': detailRoute }
  router.getMatchedRoutes.mockClear()
})

function IntentProbe() {
  useWarmRouteCodeOnIntent()
  return (
    <>
      <a href="/ins/seturi/POP107D">
        <svg data-testid="icon" />
        <span>serie</span>
      </a>
      <a href="/justitie/">justiție</a>
      <a href="/ins/seturi/SOM103B" target="_blank" rel="noreferrer">
        filă nouă
      </a>
      <a href="/ins/seturi/IPC102E" download>
        descarcă
      </a>
      <a href="https://example.org/ins/seturi/X">extern</a>
      <a href="/nicaieri">necunoscut</a>
      <a href="http://[">stricat</a>
      <svg>
        <a href="/ins/seturi/TEMPO1">
          <text>regiune</text>
        </a>
      </svg>
    </>
  )
}

function IdleProbe() {
  useWarmRouteCode('/ins/seturi/$cod')
  return null
}

function link(name: string): HTMLElement {
  const found = [...document.querySelectorAll('a')].find((a) => a.textContent?.trim() === name)
  if (!found) throw new Error(name)
  return found as HTMLElement
}

function touch(name: string) {
  act(() => {
    link(name).dispatchEvent(new Event('touchstart', { bubbles: true }))
  })
}

describe('useWarmRouteCodeOnIntent', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    Reflect.deleteProperty(navigator, 'connection')
  })

  it('imports the lazy code of the route a focused in-app link opens, and nothing else', () => {
    render(<IntentProbe />)
    act(() => link('serie').focus())
    expect(router.getMatchedRoutes).toHaveBeenCalledWith('/ins/seturi/POP107D')
    expect(detailRoute.lazyFn).toHaveBeenCalledTimes(1)
  })

  it('preloads the component the bundler split out, for a route with no lazy file', () => {
    render(<IntentProbe />)
    touch('justiție')
    expect(splitRoute.options.component?.preload).toHaveBeenCalledTimes(1)
  })

  it('asks for a route once, however often the reader shows intent', () => {
    render(<IntentProbe />)
    touch('serie')
    touch('serie')
    touch('regiune')
    expect(detailRoute.lazyFn).toHaveBeenCalledTimes(1)
  })

  it('waits for a pointer to rest on the link, and forgets one that only passed over it', () => {
    render(<IntentProbe />)
    act(() => {
      link('serie').dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }))
      link('serie').dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }))
      vi.advanceTimersByTime(200)
    })
    expect(detailRoute.lazyFn).not.toHaveBeenCalled()
  })

  it('keeps counting while the pointer moves between the link’s own icon and label', () => {
    render(<IntentProbe />)
    const icon = document.querySelector('[data-testid="icon"]')!
    const label = link('serie').querySelector('span')!
    act(() => {
      icon.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }))
      vi.advanceTimersByTime(30)
      icon.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: label }))
      label.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: icon }))
      vi.advanceTimersByTime(20)
    })
    expect(detailRoute.lazyFn).toHaveBeenCalledTimes(1)
  })

  it('reads an SVG link by its attribute, as a map region carries it', () => {
    render(<IntentProbe />)
    touch('regiune')
    expect(router.getMatchedRoutes).toHaveBeenCalledWith('/ins/seturi/TEMPO1')
  })

  it('leaves alone links that open elsewhere, download, leave the app, are malformed or match no page', () => {
    render(<IntentProbe />)
    for (const name of ['filă nouă', 'descarcă', 'extern', 'necunoscut', 'stricat']) touch(name)
    expect(detailRoute.lazyFn).not.toHaveBeenCalled()
  })

  it('does nothing for a reader who asked to save data', () => {
    Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true })
    render(<IntentProbe />)
    act(() => link('serie').focus())
    expect(detailRoute.lazyFn).not.toHaveBeenCalled()
  })
})

describe('useWarmRouteCode', () => {
  afterEach(() => {
    // Unmount while the stubs still stand: the effect's cleanup cancels through them.
    cleanup()
    vi.unstubAllGlobals()
  })

  it('imports the route’s lazy code once the browser is idle, and not before', () => {
    let idle: (() => void) | undefined
    vi.stubGlobal('requestIdleCallback', (callback: () => void) => {
      idle = callback
      return 1
    })
    vi.stubGlobal('cancelIdleCallback', () => undefined)
    render(<IdleProbe />)
    expect(detailRoute.lazyFn).not.toHaveBeenCalled()
    act(() => idle?.())
    expect(detailRoute.lazyFn).toHaveBeenCalledTimes(1)
  })

  it('gives up the wait when the page goes first', () => {
    const cancel = vi.fn()
    vi.stubGlobal('requestIdleCallback', () => 7)
    vi.stubGlobal('cancelIdleCallback', cancel)
    const { unmount } = render(<IdleProbe />)
    unmount()
    expect(cancel).toHaveBeenCalledWith(7)
  })
})
