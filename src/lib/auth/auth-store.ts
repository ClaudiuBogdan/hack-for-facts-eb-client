/**
 * Auth state shared by the page and the lazily loaded Clerk runtime.
 *
 * The page never imports Clerk. It reads this store; `clerk-runtime.tsx`, once
 * loaded, publishes Clerk's state into it. See
 * docs/performance/2026-11-17-landing/clerk-on-demand.md.
 */

// Public, provider-agnostic user shape used across the app
export type AuthUser = {
  readonly id: string
  readonly firstName?: string | null
  readonly lastName?: string | null
  readonly email?: string | null
}

export type AuthContextValue = {
  readonly isEnabled: boolean
  readonly isLoaded: boolean
  readonly isSignedIn: boolean
  readonly user: AuthUser | null
  readonly signOut: () => Promise<void>
}

export type ClerkWidgetKind = 'sign-in' | 'sign-up'

export type ClerkWidget = {
  readonly id: string
  readonly kind: ClerkWidgetKind
  readonly node: HTMLElement
  readonly props: Readonly<Record<string, unknown>>
}

/** The part of a loaded Clerk instance the page calls directly. */
export type ClerkHandle = {
  readonly signOut: (options?: { redirectUrl?: string }) => Promise<unknown>
}

export type AuthSnapshot = {
  /** The latest state. The page shows it only once the gate is open. */
  readonly value: AuthContextValue
  /** The SSR stream has ended and no streamed boundary is pending: the page may show `value`. */
  readonly gateOpen: boolean
  readonly clerkRequested: boolean
  readonly clerkLoaded: boolean
  readonly widgets: readonly ClerkWidget[]
}

const signOutNoop = () => Promise.resolve()

/** Clerk configured, no session in this browser, Clerk not loaded. */
export const ANONYMOUS_AUTH_VALUE: AuthContextValue = Object.freeze({
  isEnabled: true,
  isLoaded: true,
  isSignedIn: false,
  user: null,
  signOut: signOutNoop,
})

/**
 * Clerk configured, state not known yet: what the server renders and the
 * browser hydrates with, and what shows while Clerk loads for a session.
 */
export const LOADING_AUTH_VALUE: AuthContextValue = Object.freeze({
  isEnabled: true,
  isLoaded: false,
  isSignedIn: false,
  user: null,
  signOut: signOutNoop,
})

const INITIAL_SNAPSHOT: AuthSnapshot = Object.freeze({
  value: LOADING_AUTH_VALUE,
  gateOpen: false,
  clerkRequested: false,
  clerkLoaded: false,
  widgets: Object.freeze([]) as readonly ClerkWidget[],
})

export const CLERK_LOAD_TIMEOUT_MS = 10_000

let snapshot: AuthSnapshot = INITIAL_SNAPSHOT
let clerkHandle: ClerkHandle | null = null
let loadedWaiters: Array<() => void> = []
const listeners = new Set<() => void>()

function emit(next: AuthSnapshot) {
  snapshot = next
  for (const listener of listeners) listener()
}

function sameUser(a: AuthUser | null, b: AuthUser | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return a.id === b.id && a.firstName === b.firstName && a.lastName === b.lastName && a.email === b.email
}

function sameProps(a: Readonly<Record<string, unknown>>, b: Readonly<Record<string, unknown>>): boolean {
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every((key) => Object.is(a[key], b[key]))
}

/** Signs out through whichever Clerk instance has loaded; stable, so the value only changes with the state. */
async function signOutThroughClerk(): Promise<void> {
  try {
    await clerkHandle?.signOut()
  } catch (error) {
    signOutErrorReporter(error)
  }
}

let signOutErrorReporter: (error: unknown) => void = () => undefined

export const authStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  getSnapshot(): AuthSnapshot {
    return snapshot
  },

  getServerSnapshot(): AuthSnapshot {
    return INITIAL_SNAPSHOT
  },

  /** No streamed boundary is pending any more: the page may show the state. */
  openGate(): void {
    if (snapshot.gateOpen) return
    emit({ ...snapshot, gateOpen: true })
  },

  /** No session in this browser: the signed-out state, without Clerk. Clerk's own state, once loaded, wins. */
  publishAnonymous(): void {
    if (snapshot.clerkLoaded || snapshot.value === ANONYMOUS_AUTH_VALUE) return
    emit({ ...snapshot, value: ANONYMOUS_AUTH_VALUE })
  },

  /**
   * Load Clerk. For a session (`forSession`), show the loading state until
   * Clerk publishes; for a widget, keep what is shown (the sign-in page of an
   * anonymous visitor stays signed out while its form loads).
   */
  requestClerk({ forSession }: { readonly forSession: boolean }): void {
    const value = forSession && !snapshot.clerkLoaded ? LOADING_AUTH_VALUE : snapshot.value
    if (snapshot.clerkRequested && value === snapshot.value) return
    emit({ ...snapshot, clerkRequested: true, value })
  },

  /**
   * Clerk's state. Before its first load an unloaded state changes nothing;
   * after it, every state is published as Clerk reports it, including the
   * unloaded one Clerk passes through while a session changes (sign-out).
   * Publishing the same state again changes nothing.
   */
  publishClerk(
    state: { readonly isLoaded: boolean; readonly isSignedIn: boolean; readonly user: AuthUser | null },
    handle: ClerkHandle,
  ): void {
    if (!state.isLoaded && !snapshot.clerkLoaded) return
    clerkHandle = handle
    const current = snapshot.value
    const unchanged = snapshot.clerkLoaded
      && current.signOut === signOutThroughClerk
      && current.isLoaded === state.isLoaded
      && current.isSignedIn === (state.isLoaded && state.isSignedIn)
      && sameUser(current.user, state.isLoaded ? state.user : null)
    if (!unchanged) {
      const value: AuthContextValue = {
        isEnabled: true,
        isLoaded: state.isLoaded,
        isSignedIn: state.isLoaded && state.isSignedIn,
        user: state.isLoaded ? state.user : null,
        signOut: signOutThroughClerk,
      }
      emit({ ...snapshot, clerkLoaded: true, value })
    }
    const waiters = loadedWaiters
    loadedWaiters = []
    for (const resolve of waiters) resolve()
  },

  /** Where a failed sign-out is reported (the runtime passes its logger). */
  setSignOutErrorReporter(report: (error: unknown) => void): void {
    signOutErrorReporter = report
  },

  isClerkLoaded(): boolean {
    return snapshot.clerkLoaded
  },

  /** Resolves when Clerk has loaded, or after `timeoutMs` if it never does. */
  whenClerkLoaded(timeoutMs = CLERK_LOAD_TIMEOUT_MS): Promise<void> {
    if (snapshot.clerkLoaded) return Promise.resolve()
    return new Promise((resolve) => {
      const timer = setTimeout(done, timeoutMs)
      function done() {
        clearTimeout(timer)
        loadedWaiters = loadedWaiters.filter((waiter) => waiter !== done)
        resolve()
      }
      loadedWaiters.push(done)
    })
  },

  getClerkHandle(): ClerkHandle | null {
    return clerkHandle
  },

  setWidget(widget: ClerkWidget): void {
    const index = snapshot.widgets.findIndex((entry) => entry.id === widget.id)
    const current = index === -1 ? undefined : snapshot.widgets[index]
    if (current && current.kind === widget.kind && current.node === widget.node && sameProps(current.props, widget.props)) {
      return
    }
    const widgets = index === -1
      ? [...snapshot.widgets, widget]
      : snapshot.widgets.map((entry, position) => (position === index ? widget : entry))
    emit({ ...snapshot, widgets })
  },

  removeWidget(id: string): void {
    if (!snapshot.widgets.some((entry) => entry.id === id)) return
    emit({ ...snapshot, widgets: snapshot.widgets.filter((entry) => entry.id !== id) })
  },
}

/** Test-only: back to the state a fresh page starts in. */
export function resetAuthStoreForTests(): void {
  snapshot = INITIAL_SNAPSHOT
  clerkHandle = null
  signOutErrorReporter = () => undefined
  loadedWaiters = []
  listeners.clear()
}
