/* eslint-disable react-refresh/only-export-components */
/**
 * Auth for the app, provider-agnostic. Clerk is loaded only when this browser
 * holds a session or a page shows a Clerk widget; anonymous visitors never load
 * or contact it. See docs/performance/2026-11-17-landing/clerk-on-demand.md.
 */
import React, {
  PropsWithChildren,
  Suspense,
  createContext,
  lazy,
  startTransition,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
  type ComponentProps,
} from 'react'
import type { SignIn as ClerkSignIn, SignUp as ClerkSignUp } from '@clerk/clerk-react'
import type { LoadedClerk } from '@clerk/shared/types'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { env } from '@/config/env'
import { createLogger } from '@/lib/logger'
import {
  LOADING_AUTH_VALUE,
  authStore,
  type AuthContextValue,
  type AuthSnapshot,
  type AuthUser,
  type ClerkWidgetKind,
} from './auth-store'
import { AUTH_SIGN_IN_PATH, AUTH_SIGN_UP_PATH } from './constants'
import { readSessionHint } from './session-hint'

export type { AuthUser } from './auth-store'
export { AUTH_ACCOUNT_URL, AUTH_SIGN_IN_PATH, AUTH_SIGN_UP_PATH } from './constants'

const logger = createLogger('auth')

declare global {
  interface Window {
    Clerk?: LoadedClerk
  }
}

/**
 * The live value, and the value the server rendered. A component that is
 * hydrating reads the server's, so its first render matches the server HTML
 * even when the live value has moved on (a boundary that hydrates late).
 */
type AuthContextState = {
  readonly value: AuthContextValue
  readonly serverValue: AuthContextValue
}

const AuthContext = createContext<AuthContextState | null>(null)

const subscribeNever = () => () => undefined
const NO_CONTEXT: AuthContextState = { value: LOADING_AUTH_VALUE, serverValue: LOADING_AUTH_VALUE }

/**
 * The live value, except while the calling component hydrates, when it is the
 * server's. React re-renders a hydrated component on this read only when the
 * two differ: never while the gate is closed (they are the same object), so
 * auth adds no synchronous re-render that could discard a nested boundary
 * still waiting for its code or data. A boundary hydrating after the gate has
 * opened gets the server value first (no mismatch), then the live one.
 */
function useAuthContextValue(): AuthContextValue | null {
  const ctx = useContext(AuthContext)
  const state = ctx ?? NO_CONTEXT
  const value = useSyncExternalStore(subscribeNever, () => state.value, () => state.serverValue)
  return ctx ? value : null
}

const ClerkRuntime = lazy(() => import('./clerk-runtime'))

export const AUTH_CLERK_APPEARANCE = {
  layout: {
    socialButtonsVariant: 'blockButton',
  },
  elements: {
    socialButtonsRoot: 'w-full',
    socialButtons: 'grid w-full grid-cols-1 !grid-cols-1 gap-3',
    socialButtonsBlockButton: 'flex w-full !w-full justify-start rounded-lg border border-border bg-background px-4 py-3 shadow-none hover:bg-accent hover:text-accent-foreground',
    socialButtonsBlockButtonText: 'flex-1 text-left text-sm font-medium',
    socialButtonsProviderIcon: 'mr-3 shrink-0',
  },
} satisfies NonNullable<ComponentProps<typeof ClerkSignIn>['appearance']>

function createNoopAuthContextValue(isSSR = false): AuthContextValue {
  return {
    isEnabled: false,
    // SSR: false, as the browser hydrates with it; client without key: true (auth disabled)
    isLoaded: !isSSR,
    isSignedIn: false,
    user: null,
    signOut: () => Promise.resolve(),
  }
}

function isAuthRoutePath(pathname: string): boolean {
  return pathname === AUTH_SIGN_IN_PATH || pathname === AUTH_SIGN_UP_PATH
}

function getCurrentAbsoluteUrl(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  return window.location.href
}

function normalizeAuthRedirectUrl(target: string | undefined): string | undefined {
  if (!target || typeof window === 'undefined') {
    return undefined
  }

  try {
    const url = new URL(target, window.location.origin)

    if (url.origin !== window.location.origin || isAuthRoutePath(url.pathname)) {
      return undefined
    }

    return url.toString()
  } catch {
    return undefined
  }
}

export function buildAuthNavigationTarget(destinationPath: string, redirectUrl?: string): string {
  const normalizedRedirectUrl = normalizeAuthRedirectUrl(redirectUrl)

  if (typeof window === 'undefined') {
    return destinationPath
  }

  const destination = new URL(destinationPath, window.location.origin)

  if (normalizedRedirectUrl) {
    destination.searchParams.set('redirect_url', normalizedRedirectUrl)
  }

  return `${destination.pathname}${destination.search}${destination.hash}`
}

function prepareAuthButtonChild(
  children: React.ReactNode,
  redirectUrl: string | undefined,
  destination: string,
): React.ReactNode {
  if (!React.isValidElement<{ onClick?: (event: React.MouseEvent) => void }>(children)) {
    return children
  }

  const originalOnClick = children.props.onClick

  return React.cloneElement<{ onClick?: (event: React.MouseEvent) => void }>(children, {
    onClick: (event: React.MouseEvent) => {
      originalOnClick?.(event)
      if (!event.defaultPrevented && typeof window !== 'undefined') {
        window.location.assign(buildAuthNavigationTarget(destination, redirectUrl))
      }
    },
  })
}

/**
 * A streamed boundary React has not revealed yet: its content still waits in a
 * hidden `S:` segment, or its marker still reads pending (`<!--$?-->`). React
 * 19.2 reveals completed boundaries in batches on a timer, so some are still
 * pending after the document has finished parsing.
 */
export function hasPendingStreamedBoundary(root: Document = document): boolean {
  if (root.querySelector('div[hidden][id^="S:"]')) return true
  const walker = root.createTreeWalker(root.body ?? root, NodeFilter.SHOW_COMMENT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if ((node as Comment).data === '$?') return true
  }
  return false
}

const STREAM_SETTLE_POLL_MS = 100
export const STREAM_SETTLE_CAP_MS = 10_000

/**
 * Resolves once the document has finished parsing (the SSR stream has ended)
 * and every streamed boundary has been revealed, or after 10 s at most from
 * the call, whichever comes first; or never, once `isActive` turns false. A
 * state change reaching a boundary that is still pending makes React render it
 * on the client and drop its server HTML.
 */
async function whenStreamSettled(isActive: () => boolean): Promise<void> {
  const deadline = Date.now() + STREAM_SETTLE_CAP_MS
  while (Date.now() < deadline && (document.readyState === 'loading' || hasPendingStreamedBoundary())) {
    await new Promise((resolve) => setTimeout(resolve, STREAM_SETTLE_POLL_MS))
    if (!isActive()) return
  }
}

/** Reads the session cookie: a session loads Clerk, none shows the signed-out state. */
async function applySessionHint(publishableKey: string): Promise<void> {
  const hint = await readSessionHint(publishableKey)
  if (hint === 'signed-in') {
    authStore.requestClerk({ forSession: true })
  } else {
    authStore.publishAnonymous()
  }
}

function startClerkOnDemand(publishableKey: string): () => void {
  let active = true
  const isActive = () => active

  const checkSession = () => {
    void applySessionHint(publishableKey).catch((error: unknown) => {
      logger.error('Failed to read the session hint', { error: error instanceof Error ? error.message : String(error) })
      authStore.requestClerk({ forSession: true })
    })
  }

  // Runs after the shell's hydration commit. Clerk starts loading at once for
  // a session (token reads wait for it); what the page shows changes only
  // once no server boundary is pending.
  checkSession()
  void whenStreamSettled(isActive).then(() => {
    if (active) authStore.openGate()
  })

  // A sign-in in another tab or window: check again when this one comes back.
  const onReturn = () => {
    if (active && document.visibilityState === 'visible') checkSession()
  }
  document.addEventListener('visibilitychange', onReturn)
  window.addEventListener('focus', onReturn)

  return () => {
    active = false
    document.removeEventListener('visibilitychange', onReturn)
    window.removeEventListener('focus', onReturn)
  }
}

/**
 * The store's state, hydrated with the server's and then updated in a
 * transition. A transition waits for a server boundary whose hydration is
 * still suspended (its streamed data not in the cache yet) instead of
 * discarding its HTML, which a synchronous update such as
 * `useSyncExternalStore`'s would do.
 */
function useAuthSnapshot(): AuthSnapshot {
  const [snapshot, setSnapshot] = useState(authStore.getServerSnapshot)

  useEffect(() => {
    const sync = () => startTransition(() => setSnapshot(authStore.getSnapshot()))
    sync()
    return authStore.subscribe(sync)
  }, [])

  return snapshot
}

/**
 * Mounts Clerk as soon as it is requested, from its own synchronous
 * subscription: never part of a page transition, which a suspending render
 * could hold back while a token read waits for Clerk. It renders beside the
 * page and changes no value the page reads, so mounting it is safe at any time.
 */
function ClerkRuntimeSlot({ publishableKey }: { readonly publishableKey: string }) {
  const requested = useSyncExternalStore(
    authStore.subscribe,
    () => authStore.getSnapshot().clerkRequested,
    () => false,
  )
  if (!requested) return null
  return (
    <Suspense fallback={null}>
      <ClerkRuntime publishableKey={publishableKey} />
    </Suspense>
  )
}

const ON_DEMAND_SERVER_STATE: AuthContextState = { value: LOADING_AUTH_VALUE, serverValue: LOADING_AUTH_VALUE }

function ClerkOnDemandProvider({ publishableKey, children }: PropsWithChildren<{ publishableKey: string }>) {
  const snapshot = useAuthSnapshot()

  useEffect(() => startClerkOnDemand(publishableKey), [publishableKey])

  const shown = snapshot.gateOpen ? snapshot.value : LOADING_AUTH_VALUE
  const state = useMemo<AuthContextState>(
    () => (shown === LOADING_AUTH_VALUE ? ON_DEMAND_SERVER_STATE : { value: shown, serverValue: LOADING_AUTH_VALUE }),
    [shown],
  )

  // Clerk mounts beside the page, never around it, so its arrival remounts nothing.
  return (
    <AuthContext.Provider value={state}>
      <ClerkRuntimeSlot publishableKey={publishableKey} />
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Auth when Clerk is not configured: disabled, and loaded (there is nothing to
 * load), on the server and in the browser alike. One shared object for both
 * snapshots, so hydration adds no re-render.
 */
const DISABLED_AUTH_VALUE: AuthContextValue = Object.freeze({ ...createNoopAuthContextValue(false) })
const DISABLED_AUTH_STATE: AuthContextState = { value: DISABLED_AUTH_VALUE, serverValue: DISABLED_AUTH_VALUE }

function NoopAuthProvider({ children }: PropsWithChildren) {
  return <AuthContext.Provider value={DISABLED_AUTH_STATE}>{children}</AuthContext.Provider>
}

export function AuthProvider({ publishableKey, children }: PropsWithChildren<{ publishableKey?: string }>) {
  if (publishableKey) {
    return <ClerkOnDemandProvider publishableKey={publishableKey}>{children}</ClerkOnDemandProvider>
  }
  return <NoopAuthProvider>{children}</NoopAuthProvider>
}

export function useAuth() {
  const ctx = useAuthContextValue()
  if (!ctx) {
    if (typeof window === 'undefined') {
      return createNoopAuthContextValue(true)
    }

    throw new Error('useAuth must be used within <AuthProvider>')
  }
  return ctx
}

export function useUser() {
  const ctx = useAuth()
  return ctx.user
}

/**
 * The signed-in user, or `null` when auth is not configured or no
 * `<AuthProvider>` is mounted.
 *
 * Unlike {@link useUser}, this never throws. Use it where the user is optional
 * context for the UI (e.g. deciding whether to offer contact fields) rather
 * than a precondition for rendering at all — a component that merely adapts to
 * sign-in state should not force every test and every embed to mount a
 * provider.
 */
export function useOptionalUser(): AuthUser | null {
  return useAuthContextValue()?.user ?? null
}

// UI wrappers to avoid leaking Clerk primitives
type LegacyRedirectPropKeys = 'redirectUrl' | 'afterSignInUrl' | 'afterSignUpUrl'
type LegacyRedirectPropKeysWithSnakeCase =
  | LegacyRedirectPropKeys
  | 'after_sign_in_url'
  | 'after_sign_up_url'

function omitLegacyRedirectProps<T extends Record<string, unknown>>(
  props: T,
): Omit<T, LegacyRedirectPropKeysWithSnakeCase> {
  const {
    redirectUrl: _redirectUrl,
    afterSignInUrl: _afterSignInUrl,
    afterSignUpUrl: _afterSignUpUrl,
    after_sign_in_url: _after_sign_in_url,
    after_sign_up_url: _after_sign_up_url,
    ...rest
  } = props as T & Record<LegacyRedirectPropKeysWithSnakeCase, unknown>
  return rest
}

type AuthSignInProps = Omit<ComponentProps<typeof ClerkSignIn>, LegacyRedirectPropKeys | 'path' | 'routing'> & {
  path?: string
}

type AuthSignUpProps = Omit<ComponentProps<typeof ClerkSignUp>, LegacyRedirectPropKeys | 'path' | 'routing'> & {
  path?: string
}

type AuthSignInButtonProps = PropsWithChildren<{
  fallbackRedirectUrl?: string
}>

type AuthSignUpButtonProps = PropsWithChildren<{
  fallbackRedirectUrl?: string
}>

/**
 * A slot Clerk renders one of its widgets into, through a portal from the
 * Clerk runtime. Mounting it loads Clerk.
 */
function ClerkWidgetSlot({ kind, props }: { readonly kind: ClerkWidgetKind; readonly props: Readonly<Record<string, unknown>> }) {
  const id = useId()
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  const { clerkLoaded } = useAuthSnapshot()

  useEffect(() => {
    authStore.requestClerk({ forSession: false })
  }, [])

  useEffect(() => {
    if (node) authStore.setWidget({ id, kind, node, props })
  })

  useEffect(() => () => authStore.removeWidget(id), [id])

  return (
    <>
      {clerkLoaded ? null : (
        <div className="flex w-full justify-center py-10">
          <LoadingSpinner />
        </div>
      )}
      <div ref={setNode} />
    </>
  )
}

export function AuthSignIn({ path = AUTH_SIGN_IN_PATH, ...rest }: AuthSignInProps) {
  const { isEnabled } = useAuth()
  if (!isEnabled) {
    return <div className="text-sm text-muted-foreground">Authentication is disabled.</div>
  }
  const safeProps = omitLegacyRedirectProps(rest as Record<string, unknown>)
  return (
    <ClerkWidgetSlot
      kind="sign-in"
      props={{ ...safeProps, routing: 'path', path, signUpUrl: AUTH_SIGN_UP_PATH }}
    />
  )
}

export function AuthSignUp({ path = AUTH_SIGN_UP_PATH, ...rest }: AuthSignUpProps) {
  const { isEnabled } = useAuth()
  if (!isEnabled) {
    return <div className="text-sm text-muted-foreground">Authentication is disabled.</div>
  }
  const safeProps = omitLegacyRedirectProps(rest as Record<string, unknown>)
  return (
    <ClerkWidgetSlot
      kind="sign-up"
      props={{ ...safeProps, routing: 'path', path, signInUrl: AUTH_SIGN_IN_PATH }}
    />
  )
}

export function AuthSignInButton({ children = 'Sign in', ...rest }: AuthSignInButtonProps) {
  const { isEnabled } = useAuth()
  if (!isEnabled) {
    return <span>{children}</span>
  }
  const preparedChildren = prepareAuthButtonChild(
    children,
    rest.fallbackRedirectUrl ?? getCurrentAbsoluteUrl(),
    AUTH_SIGN_IN_PATH,
  )
  return <>{preparedChildren}</>
}

export function AuthSignUpButton({ children = 'Sign up', ...rest }: AuthSignUpButtonProps) {
  const { isEnabled } = useAuth()
  if (!isEnabled) {
    return <span>{children}</span>
  }
  const preparedChildren = prepareAuthButtonChild(
    children,
    rest.fallbackRedirectUrl ?? getCurrentAbsoluteUrl(),
    AUTH_SIGN_UP_PATH,
  )
  return <>{preparedChildren}</>
}

/** Signs out as Clerk's `SignOutButton` does: the child's own click first, then `signOut` back to `/`. */
export function AuthSignOutButton({ children = 'Sign out' }: PropsWithChildren) {
  const { isEnabled } = useAuth()
  if (!isEnabled) {
    return <span>{children}</span>
  }
  const child = React.isValidElement<{ onClick?: (event: React.MouseEvent) => unknown }>(children)
    ? children
    : <button type="button">{children}</button>
  const originalOnClick = child.props.onClick

  return React.cloneElement(child, {
    onClick: async (event: React.MouseEvent) => {
      await originalOnClick?.(event)
      await authStore.getClerkHandle()?.signOut({ redirectUrl: '/' })
    },
  })
}

export const authKey = env.VITE_CLERK_PUBLISHABLE_KEY

/**
 * Loads Clerk if it has not been requested yet and resolves once it has
 * loaded, or after 10 s if it never does (blocked script, no network).
 */
export function waitForClerk(): Promise<void> {
  if (typeof window === 'undefined' || !authKey || authStore.isClerkLoaded()) {
    return Promise.resolve()
  }
  authStore.requestClerk({ forSession: true })
  return authStore.whenClerkLoaded()
}

// Safe function for non-React modules to fetch a fresh auth token
export async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined' || !authKey) return null
  try {
    if (!authStore.isClerkLoaded()) {
      // No session in this browser: there is no token to wait for.
      if ((await readSessionHint(authKey)) === 'signed-out') return null
      await waitForClerk()
    }
    const token = await window.Clerk?.session?.getToken()
    return token ?? null
  } catch (error) {
    logger.error('Failed to get auth token', { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}
