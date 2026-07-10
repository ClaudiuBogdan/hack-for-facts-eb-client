/* eslint-disable react-refresh/only-export-components */
import React, { PropsWithChildren, createContext, useContext, useMemo, type ComponentProps } from 'react'
import {
  ClerkProvider,
  SignIn as ClerkSignIn,
  SignUp as ClerkSignUp,
  SignOutButton as ClerkSignOutButton,
  useAuth as useClerkAuth,
  useUser as useClerkUser,
} from '@clerk/clerk-react'
import { roRO } from '@clerk/localizations'
import type { LoadedClerk } from '@clerk/shared/types'
import { env } from '@/config/env'
import type { SupportedLocale } from '@/lib/i18n'
import { getUserLocale } from '@/lib/utils'
import { createLogger } from '@/lib/logger'

const logger = createLogger('auth')

declare global {
  interface Window {
    Clerk?: LoadedClerk
  }
}

// Public, provider-agnostic user shape used across the app
export type AuthUser = {
  readonly id: string
  readonly firstName?: string | null
  readonly lastName?: string | null
  readonly email?: string | null
}

type AuthContextValue = {
  readonly isEnabled: boolean
  readonly isLoaded: boolean
  readonly isSignedIn: boolean
  readonly user: AuthUser | null
  readonly signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AUTH_SIGN_IN_PATH = '/sign-in'
export const AUTH_SIGN_UP_PATH = '/sign-up'
export const AUTH_ACCOUNT_URL = 'https://accounts.transparenta.eu/user'
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

export function resolveClerkLocalization(locale: SupportedLocale) {
  return locale === 'ro' ? roRO : undefined
}

function createNoopAuthContextValue(isSSR = false): AuthContextValue {
  return {
    isEnabled: false,
    // SSR: false to match Clerk's initial state, Client without key: true (auth disabled)
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

function ClerkAuthBridge({ children }: PropsWithChildren) {
  const { isLoaded, isSignedIn, signOut } = useClerkAuth()
  const { user } = useClerkUser()

  React.useEffect(() => {
    if (isLoaded) {
      markClerkReady()
    }
  }, [isLoaded])

  const value = useMemo<AuthContextValue>(() => {
    const mappedUser: AuthUser | null = user
      ? {
        id: user.id,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        email: user.primaryEmailAddress?.emailAddress ?? null,
      }
      : null
    return {
      isEnabled: true,
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      user: mappedUser,
      signOut: async () => {
        try {
          await signOut()
        } catch (error) {
          logger.error('Failed to sign out', { error: error instanceof Error ? error.message : String(error) })
        }
      },
    }
  }, [isLoaded, isSignedIn, user, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Auth placeholder for when Clerk is not configured.
 * - On SSR: isLoaded=false to match client's initial Clerk state and prevent hydration mismatch
 * - On client without auth key: isLoaded=true because auth is disabled (nothing to load)
 */
function NoopAuthProvider({ children, isSSR = false }: PropsWithChildren<{ isSSR?: boolean }>) {
  const value = useMemo<AuthContextValue>(() => createNoopAuthContextValue(isSSR), [isSSR])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function AuthProvider({ publishableKey, children }: PropsWithChildren<{ publishableKey?: string }>) {
  if (typeof window === 'undefined') {
    return <NoopAuthProvider isSSR>{children}</NoopAuthProvider>
  }
  if (publishableKey) {
    const locale = getUserLocale()
    return (
      <ClerkProvider
        publishableKey={publishableKey}
        localization={resolveClerkLocalization(locale)}
        signInUrl={AUTH_SIGN_IN_PATH}
        signUpUrl={AUTH_SIGN_UP_PATH}
      >
        <ClerkAuthBridge>{children}</ClerkAuthBridge>
      </ClerkProvider>
    )
  }
  return <NoopAuthProvider>{children}</NoopAuthProvider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
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
  const ctx = useContext(AuthContext)
  return ctx?.user ?? null
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

export function AuthSignIn({ path = AUTH_SIGN_IN_PATH, ...rest }: AuthSignInProps) {
  const { isEnabled } = useAuth()
  if (!isEnabled) {
    return <div className="text-sm text-muted-foreground">Authentication is disabled.</div>
  }
  const safeProps = omitLegacyRedirectProps(rest as Record<string, unknown>)
  return (
    <ClerkSignIn
      {...(safeProps as typeof rest)}
      routing="path"
      path={path}
      signUpUrl={AUTH_SIGN_UP_PATH}
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
    <ClerkSignUp
      {...(safeProps as typeof rest)}
      routing="path"
      path={path}
      signInUrl={AUTH_SIGN_IN_PATH}
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

export function AuthSignOutButton({ children = 'Sign out' }: PropsWithChildren) {
  const { isEnabled } = useAuth()
  if (!isEnabled) {
    return <span>{children}</span>
  }
  return <ClerkSignOutButton>{children}</ClerkSignOutButton>
}

export const authKey = env.VITE_CLERK_PUBLISHABLE_KEY

let clerkReadyPromise: Promise<void> | null = null
let clerkReady = false

export function markClerkReady() {
  clerkReady = true
}

export function waitForClerk(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }
  if (!authKey || clerkReady) {
    return Promise.resolve()
  }
  if (clerkReadyPromise === null) {
    clerkReadyPromise = new Promise((resolve) => {
      if (!authKey || clerkReady || window.Clerk?.session) {
        clerkReadyPromise = null
        resolve()
        return
      }
      const checkInterval = setInterval(() => {
        if (!authKey || clerkReady || window.Clerk?.session) {
          clearInterval(checkInterval)
          clerkReadyPromise = null
          resolve()
        }
      }, 50)
      setTimeout(() => {
        clearInterval(checkInterval)
        clerkReadyPromise = null
        resolve()
      }, 10000)
    })
  }
  return clerkReadyPromise
}

// Safe function for non-React modules to fetch a fresh auth token
export async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    await waitForClerk()
    const token = await window.Clerk?.session?.getToken()
    return token ?? null
  } catch (error) {
    logger.error('Failed to get auth token', { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}
