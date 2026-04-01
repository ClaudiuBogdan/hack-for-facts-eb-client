import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ClipboardCheck, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useId, useState } from 'react'
import { AuthSignInButton } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { CAMPAIGN_TERMS_PATH } from '@/features/campaigns/buget/constants'
import type { ChallengeLocale } from '../../types'

type ChallengeHubAccessCardProps = {
  readonly locale: ChallengeLocale
  readonly variant: 'loading' | 'auth' | 'register'
  readonly entityName?: string
  readonly isSubmitting?: boolean
  readonly onRegister?: () => Promise<void>
}

function getAccessCardCopy(locale: ChallengeLocale, entityName?: string) {
  const name = entityName ?? (locale === 'ro' ? 'această primărie' : 'this city hall')

  const copy = {
    ro: {
      authTitle: 'Conectează-te ca să participi la provocări',
      authDescription:
        'Poți explora în continuare calendarul și resursele, dar pentru a începe provocările și a salva progresul ai nevoie de autentificare.',
      registerTitle: 'Activează participarea în campanie',
      registerDescription:
        'Ai cont și ai ales deja primăria. Mai lipsește confirmarea participării ca să poți începe provocările și să-ți păstrezi progresul.',
      termsPrefix: `Mă înscriu în campanie pentru ${name} și confirm că am citit `,
      termsLinkLabel: 'termenii campaniei',
      termsSuffix: '.',
    },
    en: {
      authTitle: 'Sign in to join the challenges',
      authDescription:
        'You can still explore the calendar and resources, but you need to sign in before starting challenges and saving progress.',
      registerTitle: 'Activate campaign participation',
      registerDescription:
        'You already have an account and picked your city hall. Confirm participation so you can start challenges and keep your progress.',
      termsPrefix: `I am joining the campaign for ${name} and confirm that I have read the `,
      termsLinkLabel: 'campaign terms',
      termsSuffix: '.',
    },
  }

  return copy[locale]
}

export function ChallengeHubAccessCard({
  locale,
  variant,
  entityName,
  isSubmitting = false,
  onRegister,
}: ChallengeHubAccessCardProps) {
  const checkboxId = useId()
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false)
  const copy = getAccessCardCopy(locale, entityName)

  if (variant === 'loading') {
    return (
      <Card className="relative overflow-hidden rounded-[40px] border-none shadow-lg shadow-primary/5 bg-gradient-to-br from-background via-background to-primary/[0.03]">
        <CardContent className="p-6 md:p-10 space-y-10">
          <div className="space-y-4 animate-pulse">
            <div className="h-5 w-28 rounded-full bg-muted/60" />
            <div className="h-12 w-3/4 rounded-2xl bg-muted/50" />
            <div className="h-5 w-full rounded-full bg-muted/40" />
            <div className="h-5 w-2/3 rounded-full bg-muted/40" />
          </div>
          <div className="h-14 w-48 rounded-[22px] bg-muted/50 animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  if (variant === 'auth') {
    return (
      <Card className="relative overflow-hidden rounded-[40px] border-none shadow-lg shadow-primary/5 bg-gradient-to-br from-background via-background to-primary/[0.03]">
        <div className="absolute top-0 right-0 p-10 opacity-[0.04] pointer-events-none">
          <LockKeyhole className="h-64 w-64 rotate-12" aria-hidden="true" />
        </div>

        <CardContent className="p-6 md:p-10 space-y-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-primary">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {t`Access`}
            </div>
            <div className="space-y-3">
              <h3 className="text-3xl md:text-4xl font-black tracking-tighter leading-[1.1] text-foreground text-balance">
                {copy.authTitle}
              </h3>
              <p className="text-lg text-muted-foreground font-medium leading-relaxed max-w-none opacity-80">
                {copy.authDescription}
              </p>
            </div>
          </div>

          <div className="flex w-full justify-start lg:justify-end">
            <div className="w-full sm:w-auto lg:min-w-[320px]">
              <AuthSignInButton>
                <Button
                  size="lg"
                  className="w-full rounded-[22px] px-8 lg:px-10 h-16 text-lg font-black shadow-lg shadow-primary/15 transition-all hover:scale-[1.03] active:scale-95 bg-primary text-primary-foreground border-none"
                >
                  {t`Sign in`}
                </Button>
              </AuthSignInButton>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="relative overflow-hidden rounded-[40px] border-none shadow-lg shadow-primary/5 bg-gradient-to-br from-background via-background to-primary/[0.03]">
      <div className="absolute -top-4 -right-4 opacity-[0.04] pointer-events-none">
        <ClipboardCheck className="h-36 w-36 rotate-12" aria-hidden="true" />
      </div>

      <CardContent className="p-6 md:p-10 space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-primary">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {t`Participation`}
          </div>
          <div className="space-y-3">
            <h3 className="text-3xl md:text-4xl font-black tracking-tighter leading-[1.1] text-foreground text-balance">
              {copy.registerTitle}
            </h3>
            <p className="text-lg text-muted-foreground font-medium leading-relaxed max-w-none opacity-80">
              {copy.registerDescription}
            </p>
          </div>
        </div>

        <div className="w-full space-y-5 lg:ml-auto lg:max-w-xl">
          <div className="flex items-start gap-3">
            <Checkbox
              id={checkboxId}
              checked={hasAcceptedTerms}
              onCheckedChange={(checked) => setHasAcceptedTerms(checked === true)}
              className="mt-1"
            />
            <label
              htmlFor={checkboxId}
              className="text-sm leading-6 text-foreground/90 cursor-pointer"
            >
              {copy.termsPrefix}
              <Link
                to={CAMPAIGN_TERMS_PATH}
                className="font-semibold underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                {copy.termsLinkLabel}
              </Link>
              {copy.termsSuffix}
            </label>
          </div>

          <Button
            size="lg"
            disabled={!hasAcceptedTerms || isSubmitting}
            onClick={() => {
              if (!hasAcceptedTerms || !onRegister) return
              void onRegister()
            }}
            className="w-full rounded-[22px] h-14 text-base font-black shadow-lg shadow-primary/15 transition-all hover:scale-[1.01] active:scale-95"
          >
            {isSubmitting ? t`Joining…` : t`Join the campaign`}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
