import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock logger before importing the module under test
vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

// Mock Clerk components to avoid JSX/React dependency issues
vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  SignIn: () => null,
  SignUp: () => null,
  SignInButton: ({ children }: { children: React.ReactNode }) => children,
  SignOutButton: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ isLoaded: true, isSignedIn: false, signOut: vi.fn() }),
  useUser: () => ({ user: null }),
}))

// We need to control authKey for tests - mock env
const mockAuthKey = { value: 'pk_test_abc' }
vi.mock('@/config/env', () => ({
  env: new Proxy({}, {
    get(_, prop) {
      if (prop === 'VITE_CLERK_PUBLISHABLE_KEY') return mockAuthKey.value
      return undefined
    },
  }),
}))

// Use dynamic import so mocks are applied first
let waitForClerk: typeof import('./index').waitForClerk
let getAuthToken: typeof import('./index').getAuthToken
let markClerkReady: typeof import('./index').markClerkReady

beforeEach(async () => {
  vi.useFakeTimers()
  // Reset module state between tests
  vi.resetModules()
  const mod = await import('./index')
  waitForClerk = mod.waitForClerk
  getAuthToken = mod.getAuthToken
  markClerkReady = mod.markClerkReady
})

afterEach(() => {
  vi.useRealTimers()
  // Clean up Clerk global
  delete (window as any).Clerk
})

describe('waitForClerk', () => {
  it('resolves immediately when clerkReady is true (signed-out user)', async () => {
    markClerkReady()
    // No session on window.Clerk - simulating signed-out user

    const start = Date.now()
    await waitForClerk()
    const elapsed = Date.now() - start

    // Should resolve in < 100ms, not wait 10s
    expect(elapsed).toBeLessThan(100)
  })

  it('resolves immediately when clerkReady is true and session exists (signed-in user)', async () => {
    markClerkReady()
    ;(window as any).Clerk = { session: { getToken: vi.fn().mockResolvedValue('token-123') } }

    const start = Date.now()
    await waitForClerk()
    const elapsed = Date.now() - start

    expect(elapsed).toBeLessThan(100)
  })

  it('resolves immediately when authKey is not configured', async () => {
    // Override authKey to empty
    mockAuthKey.value = ''
    vi.resetModules()
    const mod = await import('./index')

    const start = Date.now()
    await mod.waitForClerk()
    const elapsed = Date.now() - start

    expect(elapsed).toBeLessThan(100)

    // Restore
    mockAuthKey.value = 'pk_test_abc'
  })

  it('resolves when markClerkReady is called during polling', async () => {
    // Neither clerkReady nor session exists initially
    const promise = waitForClerk()

    // Simulate Clerk loading after 200ms
    vi.advanceTimersByTime(200)
    markClerkReady()
    vi.advanceTimersByTime(50) // One more tick for interval to fire

    await promise
    // If we get here without timing out, the test passes
  })

  it('resolves when session appears during polling', async () => {
    const promise = waitForClerk()

    // Simulate session appearing after 150ms
    vi.advanceTimersByTime(150)
    ;(window as any).Clerk = { session: { getToken: vi.fn() } }
    vi.advanceTimersByTime(50) // One more tick for interval to fire

    await promise
  })

  it('resolves after 10s timeout if Clerk never loads', async () => {
    const promise = waitForClerk()

    // Advance past the 10s timeout
    vi.advanceTimersByTime(10001)

    await promise
    // Should resolve without error
  })
})

describe('getAuthToken', () => {
  it('returns token when session exists', async () => {
    markClerkReady()
    ;(window as any).Clerk = {
      session: { getToken: vi.fn().mockResolvedValue('my-token') },
    }

    const token = await getAuthToken()
    expect(token).toBe('my-token')
  })

  it('returns null when signed out (no session)', async () => {
    markClerkReady()
    // No Clerk session

    const start = Date.now()
    const token = await getAuthToken()
    const elapsed = Date.now() - start

    expect(token).toBeNull()
    // Critical: should NOT wait 10s for a signed-out user
    expect(elapsed).toBeLessThan(100)
  })

  it('returns null when Clerk is not configured', async () => {
    mockAuthKey.value = ''
    vi.resetModules()
    const mod = await import('./index')

    const start = Date.now()
    const token = await mod.getAuthToken()
    const elapsed = Date.now() - start

    expect(token).toBeNull()
    expect(elapsed).toBeLessThan(100)

    mockAuthKey.value = 'pk_test_abc'
  })

  it('returns null and does not throw on getToken failure', async () => {
    markClerkReady()
    ;(window as any).Clerk = {
      session: { getToken: vi.fn().mockRejectedValue(new Error('network error')) },
    }

    const token = await getAuthToken()
    expect(token).toBeNull()
  })
})
