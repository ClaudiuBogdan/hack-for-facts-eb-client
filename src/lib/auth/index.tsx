import React, { PropsWithChildren, createContext, useContext, useMemo, type ComponentProps } from 'react'
import {
  ClerkProvider,
  SignIn as ClerkSignIn,
  SignUp as ClerkSignUp,
  SignInButton as ClerkSignInButton,
  SignOutButton as ClerkSignOutButton,
  useAuth as useClerkAuth,
  useUser as useClerkUser,
} from '@clerk/clerk-react'
import type { LoadedClerk } from '@clerk/shared/types'
import { env } from '@/config/env'
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
  const value = useMemo<AuthContextValue>(
    () => ({
      isEnabled: false,
      // SSR: false to match Clerk's initial state, Client without key: true (auth disabled)
      isLoaded: !isSSR,
      isSignedIn: false,
      user: null,
      signOut: () => Promise.resolve(),
    }),
    [isSSR],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function AuthProvider({ publishableKey, children }: PropsWithChildren<{ publishableKey?: string }>) {
  if (typeof window === 'undefined') {
    return <NoopAuthProvider isSSR>{children}</NoopAuthProvider>
  }
  if (publishableKey) {
    return (
      <ClerkProvider publishableKey={publishableKey}>
        <ClerkAuthBridge>{children}</ClerkAuthBridge>
      </ClerkProvider>
    )
  }
  return <NoopAuthProvider>{children}</NoopAuthProvider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}

export function useUser() {
  const ctx = useAuth()
  return ctx.user
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

type AuthSignInButtonProps = PropsWithChildren<Omit<ComponentProps<typeof ClerkSignInButton>, 'children' | LegacyRedirectPropKeys>>

export function AuthSignIn({ path = '/sign-in', ...rest }: AuthSignInProps) {
  const { isEnabled } = useAuth()
  if (!isEnabled) {
    return <div className="text-sm text-muted-foreground">Authentication is disabled.</div>
  }
  const safeProps = omitLegacyRedirectProps(rest as Record<string, unknown>)
  return <ClerkSignIn {...(safeProps as typeof rest)} routing="path" path={path} />
}

export function AuthSignUp({ path = '/sign-up', ...rest }: AuthSignUpProps) {
  const { isEnabled } = useAuth()
  if (!isEnabled) {
    return <div className="text-sm text-muted-foreground">Authentication is disabled.</div>
  }
  const safeProps = omitLegacyRedirectProps(rest as Record<string, unknown>)
  return <ClerkSignUp {...(safeProps as typeof rest)} routing="path" path={path} />
}

export function AuthSignInButton({ children = 'Sign in', ...rest }: AuthSignInButtonProps) {
  const { isEnabled } = useAuth()
  if (!isEnabled) {
    return <span>{children}</span>
  }
  const safeProps = omitLegacyRedirectProps(rest as Record<string, unknown>)
  return <ClerkSignInButton {...(safeProps as typeof rest)}>{children}</ClerkSignInButton>
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
