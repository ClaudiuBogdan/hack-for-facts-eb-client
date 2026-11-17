import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { roRO } from '@clerk/localizations'

// The instance cookie for the mocked key 'pk_test_abc' (see session-hint.test.ts).
const SESSION_COOKIE = '__client_uat_xAsktmsC'

const mockLocale = { value: 'ro' as 'ro' | 'en' }
const mockAuthKey = { value: 'pk_test_abc' }
const clerk = {
  state: { isLoaded: true, isSignedIn: false },
  user: null as null | { id: string; firstName: string; lastName: string; primaryEmailAddress: { emailAddress: string } },
  signOut: vi.fn(() => Promise.resolve()),
  providerProps: [] as Array<Record<string, unknown>>,
  /** Commits of ClerkProvider (an effect), unlike `providerProps`, which a render that never commits also fills. */
  mounts: 0,
  /** What clerk-js installs as window.Clerk once its provider mounts. */
  windowClerk: undefined as undefined | { session?: { getToken: () => Promise<string> } },
}

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}))

vi.mock('@/lib/utils', () => ({
  getUserLocale: () => mockLocale.value,
}))

vi.mock('@/config/env', () => ({
  env: new Proxy({}, {
    get(_, prop) {
      return prop === 'VITE_CLERK_PUBLISHABLE_KEY' ? mockAuthKey.value : undefined
    },
  }),
}))

vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => {
    clerk.providerProps.push(props)
    if (clerk.windowClerk) (window as { Clerk?: unknown }).Clerk = clerk.windowClerk
    React.useEffect(() => {
      clerk.mounts += 1
    }, [])
    return children
  },
  SignIn: (props: Record<string, unknown>) => <div data-testid="clerk-sign-in" data-props={JSON.stringify(props)} />,
  SignUp: (props: Record<string, unknown>) => <div data-testid="clerk-sign-up" data-props={JSON.stringify(props)} />,
  useAuth: () => ({ ...clerk.state, signOut: clerk.signOut }),
  useUser: () => ({ user: clerk.user }),
  useClerk: () => ({ signOut: clerk.signOut }),
}))

type AuthModule = typeof import('./index')
let auth: AuthModule

function setCookie(value: string) {
  document.cookie = `${SESSION_COOKIE}=${value}`
}

function clearCookies() {
  for (const name of [SESSION_COOKIE, '__client_uat']) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`
  }
}

function AuthProbe() {
  const { isEnabled, isLoaded, isSignedIn, user } = auth.useAuth()
  return (
    <output data-testid="auth">
      {JSON.stringify({ isEnabled, isLoaded, isSignedIn, user: user?.email ?? null })}
    </output>
  )
}

function lastProviderProps() {
  return clerk.providerProps[clerk.providerProps.length - 1]
}

function readAuth() {
  return JSON.parse(screen.getByTestId('auth').textContent ?? '{}') as Record<string, unknown>
}

function renderApp(children: React.ReactNode = <AuthProbe />) {
  return render(<auth.AuthProvider publishableKey="pk_test_abc">{children}</auth.AuthProvider>)
}

beforeEach(async () => {
  // The key is read when the module loads, so set it before importing.
  mockAuthKey.value = 'pk_test_abc'
  mockLocale.value = 'ro'
  vi.resetModules()
  auth = await import('./index')
  clerk.state = { isLoaded: true, isSignedIn: false }
  clerk.user = null
  clerk.signOut.mockClear()
  clerk.providerProps.length = 0
  clerk.mounts = 0
  clerk.windowClerk = undefined
  clearCookies()
})

afterEach(() => {
  vi.useRealTimers()
  delete (window as { Clerk?: unknown }).Clerk
  clearCookies()
})

describe('AuthProvider', () => {
  it('renders "enabled, not loaded" on the server, so access checks never see auth as disabled', () => {
    const originalWindow = (globalThis as { window?: Window }).window
    try {
      delete (globalThis as { window?: Window }).window
      const html = renderToString(<auth.AuthProvider publishableKey="pk_test_abc"><AuthProbe /></auth.AuthProvider>)
      expect(html).toContain('&quot;isEnabled&quot;:true,&quot;isLoaded&quot;:false')
    } finally {
      ;(globalThis as { window?: Window }).window = originalWindow
    }
  })

  it('shows the signed-out state without loading Clerk when there is no session', async () => {
    renderApp()

    await waitFor(() => expect(readAuth()).toEqual({ isEnabled: true, isLoaded: true, isSignedIn: false, user: null }))
    expect(clerk.providerProps).toHaveLength(0)
  })

  it('ignores another Clerk instance’s session on the shared cookie', async () => {
    document.cookie = '__client_uat=1794919910'
    setCookie('0')
    renderApp()

    await waitFor(() => expect(readAuth()).toMatchObject({ isLoaded: true, isSignedIn: false }))
    expect(clerk.providerProps).toHaveLength(0)
  })

  it('loads Clerk and publishes its state when the cookie holds a session', async () => {
    setCookie('1794919910')
    clerk.state = { isLoaded: true, isSignedIn: true }
    clerk.user = { id: 'user_1', firstName: 'Ana', lastName: 'Pop', primaryEmailAddress: { emailAddress: 'ana@example.org' } }
    renderApp()

    await waitFor(() => expect(readAuth()).toEqual({ isEnabled: true, isLoaded: true, isSignedIn: true, user: 'ana@example.org' }))
    expect(lastProviderProps()).toMatchObject({
      publishableKey: 'pk_test_abc',
      localization: roRO,
      signInUrl: '/sign-in',
      signUpUrl: '/sign-up',
    })
  })

  it('omits Clerk’s localization for English', async () => {
    setCookie('1794919910')
    mockLocale.value = 'en'
    renderApp()

    await waitFor(() => expect(clerk.providerProps.length).toBeGreaterThan(0))
    expect(lastProviderProps()).toMatchObject({ localization: undefined, signInUrl: '/sign-in' })
  })

  it('stays on the server value until the document has finished streaming', async () => {
    const readyState = vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading')
    try {
      renderApp()
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20))
      })
      expect(readAuth()).toEqual({ isEnabled: true, isLoaded: false, isSignedIn: false, user: null })

      readyState.mockReturnValue('interactive')
      await waitFor(() => expect(readAuth()).toMatchObject({ isEnabled: true, isLoaded: true }))
    } finally {
      readyState.mockRestore()
    }
  })

  it('waits until every streamed boundary has been revealed', async () => {
    const pending = document.createComment('$?')
    document.body.appendChild(pending)
    try {
      renderApp()
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 250))
      })
      expect(readAuth()).toEqual({ isEnabled: true, isLoaded: false, isSignedIn: false, user: null })

      pending.data = '$'
      await waitFor(() => expect(readAuth()).toMatchObject({ isEnabled: true, isLoaded: true }))
    } finally {
      pending.remove()
    }
  })

  it('opens after 10 s at most, even while the document never finishes parsing', async () => {
    const { readSessionHint } = await import('./session-hint')
    await readSessionHint('pk_test_abc')
    const readyState = vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading')
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    try {
      renderApp()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(9_000)
      })
      expect(readAuth()).toMatchObject({ isLoaded: false })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_200)
      })
      expect(readAuth()).toMatchObject({ isEnabled: true, isLoaded: true, isSignedIn: false })
    } finally {
      vi.useRealTimers()
      readyState.mockRestore()
    }
  })

  it('loads Clerk for a session before the gate opens, without changing what the page shows', async () => {
    const pending = document.createComment('$?')
    document.body.appendChild(pending)
    setCookie('1794919910')
    clerk.state = { isLoaded: true, isSignedIn: true }
    clerk.windowClerk = { session: { getToken: () => Promise.resolve('early-token') } }
    try {
      renderApp()

      expect(await auth.getAuthToken()).toBe('early-token')
      expect(readAuth()).toEqual({ isEnabled: true, isLoaded: false, isSignedIn: false, user: null })

      pending.data = '$'
      await waitFor(() => expect(readAuth()).toMatchObject({ isLoaded: true, isSignedIn: true }))
    } finally {
      pending.remove()
    }
  })

  it('mounts Clerk even while a page transition is held back by a suspending render', async () => {
    const never = new Promise<never>(() => undefined)
    function SuspendsOnLoadingAgain() {
      const { isLoaded } = auth.useAuth()
      const settled = React.useRef(false)
      if (isLoaded) settled.current = true
      // A render after the signed-out state that suspends, e.g. on a read that needs a token.
      if (settled.current && !isLoaded) throw never
      return <AuthProbe />
    }
    renderApp(
      <React.Suspense fallback={<p>fallback</p>}>
        <SuspendsOnLoadingAgain />
      </React.Suspense>,
    )
    await waitFor(() => expect(readAuth()).toMatchObject({ isLoaded: true, isSignedIn: false }))

    setCookie('1794919910')
    clerk.state = { isLoaded: false, isSignedIn: false }
    act(() => {
      window.dispatchEvent(new Event('focus'))
    })

    await waitFor(() => expect(clerk.mounts).toBe(1))
    expect(screen.queryByText('fallback')).toBeNull()
  })

  it('gives a boundary that hydrates late the server value first, so it matches the server HTML', async () => {
    const tree = (probe: React.ReactNode) => (
      <auth.AuthProvider publishableKey="pk_test_abc">
        <React.Suspense fallback={<p>wait</p>}>{probe}</React.Suspense>
      </auth.AuthProvider>
    )
    const container = document.createElement('div')
    container.innerHTML = renderToString(tree(<AuthProbe />))
    document.body.appendChild(container)
    const serverOutput = container.querySelector('output')
    expect(serverOutput?.textContent).toContain('"isLoaded":false')

    let resolveProbe: () => void = () => undefined
    const LateProbe = React.lazy(() => new Promise<{ default: typeof AuthProbe }>((resolve) => {
      resolveProbe = () => resolve({ default: AuthProbe })
    }))
    const recoverable = vi.fn()
    let root: ReturnType<typeof hydrateRoot> | undefined
    try {
      await act(async () => {
        root = hydrateRoot(container, tree(<LateProbe />), { onRecoverableError: recoverable })
      })
      // The gate opens and the signed-out state goes live while the boundary still waits for its code.
      const { authStore } = await import('./auth-store')
      await waitFor(() => expect(authStore.getSnapshot()).toMatchObject({ gateOpen: true, value: { isLoaded: true } }))

      await act(async () => {
        resolveProbe()
      })

      await waitFor(() => expect(container.querySelector('output')?.textContent).toContain('"isLoaded":true'))
      expect(recoverable).not.toHaveBeenCalled()
      expect(container.querySelector('output')).toBe(serverOutput)
    } finally {
      act(() => root?.unmount())
      container.remove()
    }
  })

  it.each([
    ['with a key', 'pk_test_abc'],
    ['without a key', undefined],
  ])('adds no re-render that would discard a nested boundary still waiting for its code (%s)', async (_label, publishableKey) => {
    // Like ChallengeStepPlayer: the consumer builds the nested boundary in its own render,
    // so any re-render of the consumer reaches the boundary.
    function Consumer({ Body }: { readonly Body: React.ComponentType }) {
      const { isLoaded } = auth.useAuth()
      return (
        <section data-loaded={String(isLoaded)}>
          <React.Suspense fallback={<p>wait</p>}>
            <Body />
          </React.Suspense>
        </section>
      )
    }
    function Article() {
      return <article>server article</article>
    }
    const tree = (Body: React.ComponentType) => (
      <auth.AuthProvider publishableKey={publishableKey}>
        <Consumer Body={Body} />
      </auth.AuthProvider>
    )
    const container = document.createElement('div')
    container.innerHTML = renderToString(tree(Article))
    document.body.appendChild(container)
    const serverArticle = container.querySelector('article')
    // A boundary still streaming elsewhere keeps the gate closed: auth does not change.
    const pending = document.createComment('$?')
    document.body.appendChild(pending)

    let resolveArticle: () => void = () => undefined
    const LateArticle = React.lazy(() => new Promise<{ default: typeof Article }>((resolve) => {
      resolveArticle = () => resolve({ default: Article })
    }))
    const recoverable = vi.fn()
    let root: ReturnType<typeof hydrateRoot> | undefined
    try {
      await act(async () => {
        root = hydrateRoot(container, tree(LateArticle), { onRecoverableError: recoverable })
      })
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 250))
      })
      expect(container.querySelector('article')).toBe(serverArticle)

      await act(async () => {
        resolveArticle()
      })
      expect(container.querySelector('article')).toBe(serverArticle)
      expect(recoverable).not.toHaveBeenCalled()
    } finally {
      act(() => root?.unmount())
      container.remove()
      pending.remove()
    }
  })

  it('never remounts the page when Clerk arrives', async () => {
    const mounts = vi.fn()
    function Page() {
      React.useEffect(() => mounts(), [])
      return <AuthProbe />
    }
    setCookie('1794919910')
    clerk.state = { isLoaded: true, isSignedIn: true }
    renderApp(<Page />)

    await waitFor(() => expect(readAuth()).toMatchObject({ isSignedIn: true }))
    expect(mounts).toHaveBeenCalledTimes(1)
  })

  it('loads Clerk when a sign-in in another tab sets the cookie', async () => {
    renderApp()
    await waitFor(() => expect(readAuth()).toMatchObject({ isLoaded: true }))
    expect(clerk.providerProps).toHaveLength(0)

    setCookie('1794919910')
    clerk.state = { isLoaded: true, isSignedIn: true }
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await waitFor(() => expect(readAuth()).toMatchObject({ isSignedIn: true }))
  })

  it('shows loading, then the session, when focus returns to a window signed in elsewhere', async () => {
    renderApp()
    await waitFor(() => expect(readAuth()).toMatchObject({ isLoaded: true, isSignedIn: false }))

    setCookie('1794919910')
    clerk.state = { isLoaded: false, isSignedIn: false }
    act(() => {
      window.dispatchEvent(new Event('focus'))
    })
    await waitFor(() => expect(readAuth()).toMatchObject({ isLoaded: false }))
    expect(clerk.providerProps.length).toBeGreaterThan(0)
  })
})

describe('hasPendingStreamedBoundary', () => {
  function documentWith(html: string) {
    return new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, 'text/html')
  }

  it('sees a boundary still waiting for its segment, or a segment not yet moved in', () => {
    expect(auth.hasPendingStreamedBoundary(documentWith('<!--$?--><template id="B:0"></template><p>…</p><!--/$-->'))).toBe(true)
    expect(auth.hasPendingStreamedBoundary(documentWith('<div hidden id="S:0"><section>figures</section></div>'))).toBe(true)
  })

  it('is clear once every boundary is complete or client-rendered', () => {
    expect(auth.hasPendingStreamedBoundary(documentWith('<!--$--><section>figures</section><!--/$--><!--$!--><p>x</p><!--/$-->'))).toBe(false)
    expect(auth.hasPendingStreamedBoundary(documentWith('<main><h1>Buget</h1></main>'))).toBe(false)
  })
})

describe('Clerk widgets', () => {
  it('loads Clerk for the sign-in form and renders it in place, without legacy redirect props', async () => {
    renderApp(
      <>
        <AuthProbe />
        <section data-testid="slot-host">
          <auth.AuthSignIn
            appearance={auth.AUTH_CLERK_APPEARANCE}
            {...({ redirectUrl: '/legacy', afterSignInUrl: '/legacy' } as Record<string, string>)}
          />
        </section>
      </>,
    )

    const form = await screen.findByTestId('clerk-sign-in')
    expect(screen.getByTestId('slot-host')).toContainElement(form)
    const props = JSON.parse(form.getAttribute('data-props') ?? '{}') as Record<string, unknown>
    expect(props).toMatchObject({ routing: 'path', path: '/sign-in', signUpUrl: '/sign-up' })
    expect(props).not.toHaveProperty('redirectUrl')
    expect(props).not.toHaveProperty('afterSignInUrl')
  })

  it('renders the sign-up form with its own route props', async () => {
    renderApp(<auth.AuthSignUp />)

    const form = await screen.findByTestId('clerk-sign-up')
    expect(JSON.parse(form.getAttribute('data-props') ?? '{}')).toMatchObject({ routing: 'path', path: '/sign-up', signInUrl: '/sign-in' })
  })

  it('signs out through Clerk after the child’s own click, back to /', async () => {
    setCookie('1794919910')
    clerk.state = { isLoaded: true, isSignedIn: true }
    const childClick = vi.fn()
    renderApp(
      <>
        <AuthProbe />
        <auth.AuthSignOutButton>
          <button type="button" onClick={childClick}>Ieși</button>
        </auth.AuthSignOutButton>
      </>,
    )
    await waitFor(() => expect(readAuth()).toMatchObject({ isSignedIn: true }))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ieși' }))
    })

    expect(childClick).toHaveBeenCalledTimes(1)
    expect(clerk.signOut).toHaveBeenCalledWith({ redirectUrl: '/' })
  })
})

describe('useAuth', () => {
  it('falls back to disabled auth during SSR when no provider is mounted', () => {
    const originalWindow = (globalThis as { window?: Window }).window
    try {
      delete (globalThis as { window?: Window }).window
      expect(renderToString(<AuthProbe />)).toContain('&quot;isLoaded&quot;:false')
    } finally {
      ;(globalThis as { window?: Window }).window = originalWindow
    }
  })
})

describe('Auth button wrappers', () => {
  it('builds a sign-in destination with redirect_url', () => {
    window.history.pushState({}, '', '/provocare/notificari?lang=ro')

    expect(auth.buildAuthNavigationTarget('/sign-in', window.location.href)).toBe(
      '/sign-in?redirect_url=http%3A%2F%2Flocalhost%3A3000%2Fprovocare%2Fnotificari%3Flang%3Dro',
    )
  })

  it('does not include redirect_url when already on an auth route', () => {
    window.history.pushState({}, '', '/sign-in')

    expect(auth.buildAuthNavigationTarget('/sign-up', window.location.href)).toBe('/sign-up')
  })
})

describe('getAuthToken', () => {
  it('returns null at once, without loading Clerk, when there is no session', async () => {
    const { authStore } = await import('./auth-store')

    expect(await auth.getAuthToken()).toBeNull()
    expect(authStore.getSnapshot().clerkRequested).toBe(false)
  })

  it('returns null when Clerk is not configured', async () => {
    mockAuthKey.value = ''
    vi.resetModules()
    const mod = await import('./index')
    setCookie('1794919910')

    expect(await mod.getAuthToken()).toBeNull()
  })

  it('loads Clerk for a session and returns its token once it has loaded', async () => {
    setCookie('1794919910')
    // clerk-js installs window.Clerk only when its provider mounts: a read that did not wait gets nothing.
    clerk.windowClerk = { session: { getToken: vi.fn().mockResolvedValue('my-token') } }
    clerk.state = { isLoaded: true, isSignedIn: true }
    renderApp()

    expect(await auth.getAuthToken()).toBe('my-token')
  })

  it('asks Clerk directly once it has loaded, whatever the cookie says', async () => {
    setCookie('1794919910')
    clerk.state = { isLoaded: true, isSignedIn: true }
    renderApp()
    await waitFor(() => expect(readAuth()).toMatchObject({ isSignedIn: true }))

    clearCookies()
    ;(window as { Clerk?: unknown }).Clerk = { session: { getToken: vi.fn().mockResolvedValue('fresh') } }
    expect(await auth.getAuthToken()).toBe('fresh')
  })

  it('gives up after 10 s when Clerk never loads', async () => {
    setCookie('1794919910')
    // A session, but no provider mounted to load Clerk. Warm the cookie
    // suffix first so the read reaches its wait within microtasks.
    const { readSessionHint } = await import('./session-hint')
    const { authStore } = await import('./auth-store')
    await readSessionHint('pk_test_abc')
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    const token = auth.getAuthToken()
    while (!authStore.getSnapshot().clerkRequested) await Promise.resolve()
    await vi.advanceTimersByTimeAsync(10_001)

    expect(await token).toBeNull()
  })

  it('returns null and does not throw when getToken fails', async () => {
    setCookie('1794919910')
    clerk.windowClerk = { session: { getToken: vi.fn().mockRejectedValue(new Error('network error')) } }
    renderApp()

    expect(await auth.getAuthToken()).toBeNull()
  })
})

describe('waitForClerk', () => {
  it('resolves at once when Clerk is not configured', async () => {
    mockAuthKey.value = ''
    vi.resetModules()
    const mod = await import('./index')

    await expect(mod.waitForClerk()).resolves.toBeUndefined()
  })

  it('requests Clerk and resolves when it has loaded', async () => {
    renderApp()
    await waitFor(() => expect(readAuth()).toMatchObject({ isLoaded: true }))

    await auth.waitForClerk()
    expect(clerk.providerProps.length).toBeGreaterThan(0)
  })
})
