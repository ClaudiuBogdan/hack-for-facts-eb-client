import { AUTH_ACCOUNT_URL, useAuth, AuthSignInButton, AuthSignOutButton } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { getUserLocale } from '@/lib/utils'

export function ProfilePage() {
  const { user, isSignedIn, isLoaded } = useAuth()
  const locale = getUserLocale()
  const copy = locale === 'ro'
    ? {
      loading: 'Se incarca autentificarea...',
      loadingHint: 'Daca dureaza prea mult, reincarca pagina.',
      title: 'Cont',
      description: 'Gestioneaza profilul si setarile contului.',
      userFallback: 'Utilizator',
      accountHint: 'Deschide portalul de cont pentru profil, securitate si conturile conectate.',
      openAccount: 'Deschide contul',
      signOut: 'Deconectare',
      signIn: 'Conectare',
    }
    : {
      loading: 'Loading authentication...',
      loadingHint: 'If this takes too long, please refresh the page.',
      title: 'Account',
      description: 'Manage your profile and account settings.',
      userFallback: 'User',
      accountHint: 'Open the account portal for profile, security, and connected accounts.',
      openAccount: 'Open account',
      signOut: 'Sign out',
      signIn: 'Sign in',
    }

  if (!isLoaded) {
    return <div className="container mx-auto p-4 max-w-xl flex flex-col items-center justify-center">
      <LoadingSpinner />
      <p className="text-muted-foreground">{copy.loading}</p>
      <p className="text-muted-foreground">{copy.loadingHint}</p>
    </div>
  }

  return (
    <div className="container mx-auto p-4 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {isSignedIn && user && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarFallback>{(user.firstName?.[0] ?? 'U').toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">
                    {user.firstName ?? copy.userFallback} {user.lastName ?? ''}
                  </div>
                  <div className="text-sm text-muted-foreground">{user.email ?? '—'}</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{copy.accountHint}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild>
                  <a href={AUTH_ACCOUNT_URL} rel="noreferrer">
                    {copy.openAccount}
                  </a>
                </Button>
                <AuthSignOutButton>
                  <Button variant="outline">{copy.signOut}</Button>
                </AuthSignOutButton>
              </div>
            </div>
          )}
          {!isSignedIn && (
            <div className="space-y-3">
              <AuthSignInButton>
                <Button>{copy.signIn}</Button>
              </AuthSignInButton>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
