import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ANONYMOUS_AUTH_VALUE, LOADING_AUTH_VALUE, authStore, resetAuthStoreForTests } from './auth-store'

const handle = { signOut: vi.fn(() => Promise.resolve()) }
const ana = { id: 'user_1', firstName: 'Ana', lastName: 'Pop', email: 'ana@example.org' }

beforeEach(() => {
  resetAuthStoreForTests()
  handle.signOut.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('authStore', () => {
  it('starts enabled and not loaded, as the server renders', () => {
    expect(authStore.getSnapshot().value).toBe(LOADING_AUTH_VALUE)
    expect(authStore.getServerSnapshot().value).toEqual({ isEnabled: true, isLoaded: false, isSignedIn: false, user: null, signOut: expect.any(Function) })
  })

  it('shows loading again when a session turns up after the signed-out state', () => {
    authStore.publishAnonymous()
    expect(authStore.getSnapshot().value).toBe(ANONYMOUS_AUTH_VALUE)

    authStore.requestClerk({ forSession: true })
    expect(authStore.getSnapshot()).toMatchObject({ clerkRequested: true, value: LOADING_AUTH_VALUE })
  })

  it('keeps the signed-out state when only a widget asks for Clerk', () => {
    authStore.publishAnonymous()
    authStore.requestClerk({ forSession: false })

    expect(authStore.getSnapshot()).toMatchObject({ clerkRequested: true, value: ANONYMOUS_AUTH_VALUE })
  })

  it('ignores Clerk’s unloaded state before its first load', () => {
    authStore.publishAnonymous()
    authStore.publishClerk({ isLoaded: false, isSignedIn: false, user: null }, handle)

    expect(authStore.getSnapshot()).toMatchObject({ clerkLoaded: false, value: ANONYMOUS_AUTH_VALUE })
  })

  it('publishes every state after the first load, including the unloaded one of a sign-out', () => {
    authStore.publishClerk({ isLoaded: true, isSignedIn: true, user: ana }, handle)
    expect(authStore.getSnapshot().value).toMatchObject({ isLoaded: true, isSignedIn: true, user: ana })

    authStore.publishClerk({ isLoaded: false, isSignedIn: true, user: ana }, handle)
    expect(authStore.getSnapshot().value).toMatchObject({ isEnabled: true, isLoaded: false, isSignedIn: false, user: null })

    authStore.publishClerk({ isLoaded: true, isSignedIn: false, user: null }, handle)
    expect(authStore.getSnapshot().value).toMatchObject({ isLoaded: true, isSignedIn: false, user: null })
  })

  it('keeps the value’s identity when Clerk publishes the same state again', () => {
    authStore.publishClerk({ isLoaded: true, isSignedIn: true, user: ana }, handle)
    const first = authStore.getSnapshot().value
    const listener = vi.fn()
    authStore.subscribe(listener)

    authStore.publishClerk({ isLoaded: true, isSignedIn: true, user: { ...ana } }, handle)

    expect(authStore.getSnapshot().value).toBe(first)
    expect(listener).not.toHaveBeenCalled()
  })

  it('lets Clerk’s state win over the cookie once it has loaded', () => {
    authStore.publishClerk({ isLoaded: true, isSignedIn: true, user: ana }, handle)
    authStore.publishAnonymous()

    expect(authStore.getSnapshot().value).toMatchObject({ isSignedIn: true })
  })

  it('signs out through the latest Clerk handle with a stable function', async () => {
    authStore.publishClerk({ isLoaded: true, isSignedIn: true, user: ana }, handle)
    const signOut = authStore.getSnapshot().value.signOut
    const next = { signOut: vi.fn(() => Promise.resolve()) }
    authStore.publishClerk({ isLoaded: true, isSignedIn: true, user: ana }, next)

    expect(authStore.getSnapshot().value.signOut).toBe(signOut)
    await signOut()
    expect(next.signOut).toHaveBeenCalledTimes(1)
    expect(handle.signOut).not.toHaveBeenCalled()
  })

  it('reports a failed sign-out instead of throwing', async () => {
    const report = vi.fn()
    authStore.setSignOutErrorReporter(report)
    authStore.publishClerk({ isLoaded: true, isSignedIn: true, user: ana }, { signOut: () => Promise.reject(new Error('offline')) })

    await expect(authStore.getSnapshot().value.signOut()).resolves.toBeUndefined()
    expect(report).toHaveBeenCalledWith(expect.objectContaining({ message: 'offline' }))
  })

  it('resolves load waiters when Clerk loads, and after the cap when it never does', async () => {
    const loaded = vi.fn()
    void authStore.whenClerkLoaded(10_000).then(loaded)
    authStore.publishClerk({ isLoaded: true, isSignedIn: false, user: null }, handle)
    await Promise.resolve()
    expect(loaded).toHaveBeenCalledTimes(1)

    resetAuthStoreForTests()
    vi.useFakeTimers()
    const timedOut = vi.fn()
    void authStore.whenClerkLoaded(10_000).then(timedOut)
    await vi.advanceTimersByTimeAsync(9_999)
    expect(timedOut).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2)
    expect(timedOut).toHaveBeenCalledTimes(1)
  })

  it('registers, updates and removes widgets without needless emits', () => {
    const node = document.createElement('div')
    const listener = vi.fn()
    authStore.subscribe(listener)

    authStore.setWidget({ id: 'w', kind: 'sign-in', node, props: { path: '/sign-in' } })
    authStore.setWidget({ id: 'w', kind: 'sign-in', node, props: { path: '/sign-in' } })
    expect(listener).toHaveBeenCalledTimes(1)

    authStore.setWidget({ id: 'w', kind: 'sign-in', node, props: { path: '/sign-in/factor-one' } })
    expect(authStore.getSnapshot().widgets).toHaveLength(1)
    expect(authStore.getSnapshot().widgets[0]?.props).toEqual({ path: '/sign-in/factor-one' })

    authStore.removeWidget('w')
    authStore.removeWidget('w')
    expect(authStore.getSnapshot().widgets).toHaveLength(0)
    expect(listener).toHaveBeenCalledTimes(3)
  })
})
