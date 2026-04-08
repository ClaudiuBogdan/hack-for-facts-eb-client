import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  AUTH_CLERK_APPEARANCE,
  AUTH_SIGN_IN_PATH,
  AUTH_SIGN_UP_PATH,
  AuthSignIn,
  AuthSignUp,
  useAuth,
} from '@/lib/auth'

export function SignInPage() {
  const { isLoaded } = useAuth()

  if (!isLoaded) {
    return <AuthLoadingState />
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-lg">
        <AuthSignIn
          path={AUTH_SIGN_IN_PATH}
          signUpUrl={AUTH_SIGN_UP_PATH}
          appearance={AUTH_CLERK_APPEARANCE}
        />
      </div>
    </div>
  )
}

export function SignUpPage() {
  const { isLoaded } = useAuth()

  if (!isLoaded) {
    return <AuthLoadingState />
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-lg">
        <AuthSignUp
          path={AUTH_SIGN_UP_PATH}
          signInUrl={AUTH_SIGN_IN_PATH}
          appearance={AUTH_CLERK_APPEARANCE}
        />
      </div>
    </div>
  )
}

function AuthLoadingState() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-10">
      <LoadingSpinner />
    </div>
  )
}
