/**
 * Test Helper Functions
 *
 * Common utilities for testing components in the Transparenta.eu project.
 */

import { vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

/**
 * Waits for loading indicators to disappear from the screen.
 * Useful for components that show loading states.
 *
 * @example
 * ```typescript
 * render(<MyComponent />)
 * await waitForLoadingToComplete()
 * expect(screen.getByText('Loaded content')).toBeInTheDocument()
 * ```
 */
export const waitForLoadingToComplete = async () => {
  await waitFor(() => {
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })
}

/**
 * Waits for a specific text to disappear from the screen.
 *
 * @example
 * ```typescript
 * await waitForTextToDisappear('Loading...')
 * ```
 */
export const waitForTextToDisappear = async (text: string | RegExp) => {
  await waitFor(() => {
    expect(screen.queryByText(text)).not.toBeInTheDocument()
  })
}

/**
 * Waits for an element to become visible.
 *
 * @example
 * ```typescript
 * await waitForElementToBeVisible('Success message')
 * ```
 */
export const waitForElementToBeVisible = async (text: string | RegExp) => {
  await waitFor(() => {
    expect(screen.getByText(text)).toBeVisible()
  })
}

/**
 * Creates a mock ResizeObserver for components that use it.
 * Call this in beforeAll or beforeEach.
 *
 * @example
 * ```typescript
 * beforeAll(() => {
 *   mockResizeObserver()
 * })
 * ```
 */
export const mockResizeObserver = () => {
  const ResizeObserverMock = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  return ResizeObserverMock
}

/**
 * A CONSTRUCTIBLE ResizeObserver stub.
 *
 * `mockResizeObserver` above returns an arrow function, which has no
 * [[Construct]] slot — any consumer that does `new ResizeObserver(...)` (cmdk,
 * and most Radix-adjacent primitives) throws on it. This one is a class, so it
 * works with `new`.
 *
 * Call it per-test (`beforeEach`), not once (`beforeAll`): the vitest config
 * sets `unstubGlobals`, which restores the global after every test.
 *
 * Deliberately NOT installed in `src/test/setup.ts`: recharts'
 * `ResponsiveContainer` measures via ResizeObserver and renders NOTHING when
 * one exists but never fires, so a global stub silently breaks every chart
 * test in the repo.
 */
export const stubResizeObserver = () => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  return ResizeObserverStub
}

/**
 * `Element.scrollIntoView`, which jsdom does not implement at all (it has no
 * layout). Needed by cmdk, which keeps the active option in view, and by any
 * surface that scrolls to an anchor — e.g. the stenogram reader moving to a
 * contribution or a search hit.
 *
 * Per-file rather than in `src/test/setup.ts`, for the same reason as
 * `stubResizeObserver`: the shared setup is load-bearing for ~650 test files
 * and each addition to it is a repo-wide behaviour change.
 */
export const stubScrollIntoView = () => {
  const scrollIntoView = vi.fn()
  Element.prototype.scrollIntoView = scrollIntoView
  return scrollIntoView
}

/**
 * Creates a mock for localStorage.
 *
 * @example
 * ```typescript
 * const localStorage = mockLocalStorage()
 * localStorage.setItem('key', 'value')
 * expect(localStorage.getItem('key')).toBe('value')
 * ```
 */
export const mockLocalStorage = () => {
  const store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key])
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  }
}

/**
 * Clears localStorage before and after tests.
 * Use in beforeEach/afterEach for tests that use localStorage.
 *
 * @example
 * ```typescript
 * beforeEach(() => clearLocalStorage())
 * afterEach(() => clearLocalStorage())
 * ```
 */
export const clearLocalStorage = () => {
  window.localStorage.clear()
}

/**
 * Creates a mock fetch response.
 *
 * @example
 * ```typescript
 * global.fetch = vi.fn().mockResolvedValue(
 *   createMockFetchResponse({ data: 'test' })
 * )
 * ```
 */
export const createMockFetchResponse = <T>(
  data: T,
  options: { ok?: boolean; status?: number } = {}
) => ({
  ok: options.ok ?? true,
  status: options.status ?? 200,
  json: vi.fn().mockResolvedValue(data),
  text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  headers: new Headers(),
})

/**
 * Creates a mock for window.matchMedia.
 * The setup.ts file already mocks this, but you can use this
 * to customize the behavior for specific tests.
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   mockMatchMedia(true) // Simulate mobile
 * })
 * ```
 */
export const mockMatchMedia = (matches: boolean = false) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

/**
 * Suppresses console errors for expected error tests.
 * Returns a function to restore the original console.error.
 *
 * @example
 * ```typescript
 * let restoreConsole: () => void
 *
 * beforeEach(() => {
 *   restoreConsole = suppressConsoleErrors()
 * })
 *
 * afterEach(() => {
 *   restoreConsole()
 * })
 * ```
 */
export const suppressConsoleErrors = () => {
  const originalError = console.error
  console.error = vi.fn()
  return () => {
    console.error = originalError
  }
}

/**
 * Waits for a specified number of milliseconds.
 * Use sparingly - prefer waitFor with assertions.
 *
 * @example
 * ```typescript
 * await delay(100) // Wait 100ms
 * ```
 */
export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Creates a deferred promise that can be resolved/rejected manually.
 * Useful for controlling async behavior in tests.
 *
 * @example
 * ```typescript
 * const { promise, resolve } = createDeferredPromise<string>()
 * mockFetch.mockReturnValue(promise)
 *
 * render(<MyComponent />)
 * expect(screen.getByText('Loading')).toBeInTheDocument()
 *
 * resolve('data')
 * await waitFor(() => {
 *   expect(screen.getByText('data')).toBeInTheDocument()
 * })
 * ```
 */
export const createDeferredPromise = <T>() => {
  let resolve: (value: T) => void
  let reject: (reason?: unknown) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  }
}

/**
 * Triggers a window resize event.
 * Useful for testing responsive behavior.
 *
 * @example
 * ```typescript
 * triggerResize(375, 667) // iPhone SE dimensions
 * ```
 */
export const triggerResize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })
  window.dispatchEvent(new Event('resize'))
}
