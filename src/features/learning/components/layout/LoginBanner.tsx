import { t } from '@lingui/core/macro'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth, AuthSignInButton } from '@/lib/auth'

export function LoginBanner() {
  const { isSignedIn, isLoaded } = useAuth()

  if (!isLoaded || isSignedIn) {
    return null
  }

  return (
    <div className="mx-auto max-w-3xl px-6 lg:px-10 pt-6 lg:pt-8">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-1 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 sm:p-5 relative z-10">
          <div className="flex-1 text-center sm:text-left space-y-1">
            <h3 className="font-bold text-sm text-foreground">
              {t`Save your progress`}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              {t`Sign in to track your learning journey.`}
            </p>
          </div>
          <AuthSignInButton>
            <Button size="sm" className="shrink-0 rounded-xl font-bold shadow-md hover:bg-primary hover:shadow-lg border-none">
              <LogIn className="mr-2 h-3.5 w-3.5" />
              {t`Sign In`}
            </Button>
          </AuthSignInButton>
        </div>
      </div>
    </div>
  )
}
