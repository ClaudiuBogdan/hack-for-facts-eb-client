import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthSignInButton, useAuth } from '@/lib/auth'
import { useCampaignProgress } from '../../hooks/use-campaign-progress'
import { useCampaignAuthGate } from '../../hooks/use-campaign-auth-gate'
import { CAMPAIGN_BASE_PATH } from '../../constants'

export function CampaignOnboarding() {
  const navigate = useNavigate()
  const { isLoaded, isSignedIn } = useAuth()
  const { completeOnboarding } = useCampaignProgress()
  const { consumeAuthIntent } = useCampaignAuthGate()

  const [locality, setLocality] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isLoaded) {
    return <p className="text-sm text-zinc-500">Se verifică autentificarea...</p>
  }

  if (!isSignedIn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Autentificare necesară</CardTitle>
          <CardDescription>
            Pentru participare activă în campanie, autentificarea este obligatorie.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthSignInButton>
            <Button>Conectează-te</Button>
          </AuthSignInButton>
        </CardContent>
      </Card>
    )
  }

  const handleSubmit = async () => {
    if (!locality.trim()) return

    setIsSubmitting(true)

    try {
      completeOnboarding({ locality: locality.trim() })

      const intent = consumeAuthIntent()
      const fallbackRoute = `${CAMPAIGN_BASE_PATH}/hub`
      const nextRoute = intent?.redirectTo ?? fallbackRoute
      void navigate({ to: nextRoute as '/' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarding campanie</CardTitle>
        <CardDescription>
          Completează localitatea pentru personalizarea calendarului și provocărilor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          value={locality}
          onChange={(event) => setLocality(event.target.value)}
          placeholder="Ex: București, Cluj-Napoca, Iași"
        />

        <Button disabled={isSubmitting || !locality.trim()} onClick={handleSubmit}>
          {isSubmitting ? 'Se salvează...' : 'Finalizează onboarding'}
        </Button>
      </CardContent>
    </Card>
  )
}
