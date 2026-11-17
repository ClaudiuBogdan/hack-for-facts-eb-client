/* eslint-disable react-refresh/only-export-components */
/**
 * The only module that loads Clerk. `AuthProvider` mounts it lazily, as a
 * sibling of the page, once a session or a Clerk widget needs it. It publishes
 * Clerk's state into the auth store and renders the registered widgets through
 * portals. See docs/performance/2026-11-17-landing/clerk-on-demand.md.
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from '@clerk/clerk-react'
import { roRO } from '@clerk/localizations'
import type { SupportedLocale } from '@/lib/i18n'
import { createLogger } from '@/lib/logger'
import { getUserLocale } from '@/lib/utils'
import { authStore, type AuthUser, type ClerkWidget } from './auth-store'
import { AUTH_SIGN_IN_PATH, AUTH_SIGN_UP_PATH } from './constants'

const logger = createLogger('auth')

export function resolveClerkLocalization(locale: SupportedLocale) {
  return locale === 'ro' ? roRO : undefined
}

authStore.setSignOutErrorReporter((error) => {
  logger.error('Failed to sign out', { error: error instanceof Error ? error.message : String(error) })
})

function ClerkStateBridge() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const clerk = useClerk()

  const mappedUser = useMemo<AuthUser | null>(() => (user
    ? {
      id: user.id,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      email: user.primaryEmailAddress?.emailAddress ?? null,
    }
    : null), [user])

  useEffect(() => {
    authStore.publishClerk({ isLoaded, isSignedIn: Boolean(isSignedIn), user: mappedUser }, clerk)
  }, [isLoaded, isSignedIn, mappedUser, clerk])

  return null
}

function ClerkWidgetPortal({ widget }: { readonly widget: ClerkWidget }) {
  const element = widget.kind === 'sign-in' ? <SignIn {...widget.props} /> : <SignUp {...widget.props} />
  return createPortal(element, widget.node)
}

export default function ClerkRuntime({ publishableKey }: { readonly publishableKey: string }) {
  const widgets = useSyncExternalStore(
    authStore.subscribe,
    () => authStore.getSnapshot().widgets,
    () => authStore.getServerSnapshot().widgets,
  )

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      localization={resolveClerkLocalization(getUserLocale())}
      signInUrl={AUTH_SIGN_IN_PATH}
      signUpUrl={AUTH_SIGN_UP_PATH}
    >
      <ClerkStateBridge />
      {widgets.map((widget) => <ClerkWidgetPortal key={widget.id} widget={widget} />)}
    </ClerkProvider>
  )
}
