import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { getEntityLabels } from '@/lib/api/labels'
import { AuthSignInButton } from '@/lib/auth'
import { CAMPAIGN_BASE_PATH } from '../../constants'
import type { CampaignLocale } from '../../types'

type CampaignPrincipalAuthGateProps = {
  readonly locale: CampaignLocale
  readonly languageQuery?: CampaignLocale
  readonly selectedEntityCui: string
  readonly onChangeEntity: () => void
}

type EntityIdentityByCui = {
  readonly entityName: string | null
  readonly countyName: string | null
}

async function getEntityIdentityByCui(entityCui: string): Promise<EntityIdentityByCui> {
  const labels = await getEntityLabels([entityCui])
  const matchedEntity = labels.find((label) => label.id === entityCui)
  return {
    entityName: matchedEntity?.label ?? null,
    countyName: matchedEntity?.countyName?.trim() || null,
  }
}

export function CampaignPrincipalAuthGate({
  locale,
  languageQuery,
  selectedEntityCui,
  onChangeEntity,
}: CampaignPrincipalAuthGateProps) {
  const [isTermsAccepted, setIsTermsAccepted] = useState(false)
  const [hasSubmitAttempt, setHasSubmitAttempt] = useState(false)
  const [isCtaAttentionActive, setIsCtaAttentionActive] = useState(false)
  const signInButtonRef = useRef<HTMLButtonElement | null>(null)
  const attentionResetTimeoutRef = useRef<number | null>(null)
  const { data: selectedEntityIdentity } = useQuery({
    queryKey: ['campaign-principal-entity-name', selectedEntityCui],
    queryFn: () => getEntityIdentityByCui(selectedEntityCui),
    enabled: selectedEntityCui.length > 0,
    staleTime: 1000 * 60 * 10,
  })

  const safeEntityName = selectedEntityIdentity?.entityName?.trim() || selectedEntityCui
  const safeCountyName = selectedEntityIdentity?.countyName?.trim() || null
  const cityHallLabel = locale === 'en' ? `City Hall ${safeEntityName}` : `Primăria ${safeEntityName}`
  const countyLabel = safeCountyName
    ? locale === 'en'
      ? `County ${safeCountyName}`
      : `Județul ${safeCountyName}`
    : null
  const title =
    locale === 'en'
      ? 'Ready for the Local Budget 2026 Challenge?'
      : 'Pregătit pentru Bugetul Local 2026 Challenge?'
  const description =
    locale === 'en'
      ? 'Before we begin, sign in to your account so your progress stays saved and you can continue every step of the challenge.'
      : 'Înainte să începem, intră în contul tău ca să îți salvăm progresul și să poți continua fiecare pas al provocării.'
  const signInLabel = locale === 'en' ? 'Register' : 'Înregistrează-te'
  const changeEntityLabel = locale === 'en' ? 'Choose another city hall' : 'Alege altă primărie'
  const selectedEntityLabel = locale === 'en' ? 'Selected city hall' : 'Primărie selectată'
  const termsLabelPrefix = locale === 'en' ? 'I accept the campaign ' : 'Accept termenii campaniei '
  const termsLabelLink = locale === 'en' ? 'terms and conditions' : 'termeni și condiții'
  const termsRequiredHint = locale === 'en'
    ? 'You must accept the terms to continue.'
    : 'Trebuie să accepți termenii pentru a continua.'
  const hasTermsValidationError = hasSubmitAttempt && !isTermsAccepted
  const blockedCtaAriaLabel = locale === 'en'
    ? 'Accept terms to continue'
    : 'Acceptă termenii pentru a continua'

  const signInRedirectUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (languageQuery === 'en') {
      params.set('lang', 'en')
    }
    params.set('entityCui', selectedEntityCui)

    const serializedSearch = params.toString()
    return serializedSearch
      ? `${CAMPAIGN_BASE_PATH}/principal?${serializedSearch}`
      : `${CAMPAIGN_BASE_PATH}/principal`
  }, [languageQuery, selectedEntityCui])

  const showBlockedSubmitFeedback = () => {
    setHasSubmitAttempt(true)
    setIsCtaAttentionActive(true)

    signInButtonRef.current?.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-8px)' },
        { transform: 'translateX(8px)' },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(6px)' },
        { transform: 'translateX(0)' },
      ],
      {
        duration: 360,
        iterations: 1,
        easing: 'ease-in-out',
      },
    )

    if (attentionResetTimeoutRef.current !== null) {
      window.clearTimeout(attentionResetTimeoutRef.current)
    }

    attentionResetTimeoutRef.current = window.setTimeout(() => {
      setIsCtaAttentionActive(false)
      attentionResetTimeoutRef.current = null
    }, 650)
  }

  useEffect(() => {
    return () => {
      if (attentionResetTimeoutRef.current !== null) {
        window.clearTimeout(attentionResetTimeoutRef.current)
      }
    }
  }, [])

  return (
    <section className="mx-auto w-full max-w-4xl rounded-[40px] border border-border/50 bg-gradient-to-br from-background via-background to-primary/[0.03] p-6 shadow-xl shadow-primary/5 sm:p-10 md:p-12 lg:max-w-3xl">
      <div className="space-y-5 text-center">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-950 text-white shadow-sm">
          <ShieldCheck className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="text-balance text-4xl font-black leading-tight tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl md:text-6xl">
          {title}
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-lg">
          {description}
        </p>
      </div>

      <div className="mt-8 rounded-3xl border border-zinc-200/70 bg-white/70 px-5 py-4 text-center dark:border-zinc-800/70 dark:bg-zinc-900/40">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
          {selectedEntityLabel}
        </p>
        <p className="mt-2 text-xl font-black text-zinc-900 dark:text-zinc-100 sm:text-2xl">
          {cityHallLabel}
        </p>
        {countyLabel ? (
          <p className="mt-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300 sm:text-base">
            {countyLabel}
          </p>
        ) : null}
      </div>

      <div className={`mt-6 rounded-3xl border bg-white/70 px-5 py-4 dark:bg-zinc-900/40 ${hasTermsValidationError ? 'border-red-300 dark:border-red-700' : 'border-zinc-200/80 dark:border-zinc-800/80'}`}>
        <label className="group flex cursor-pointer items-start gap-3 text-left">
          <Checkbox
            checked={isTermsAccepted}
            onCheckedChange={(checkedState) => {
              const nextCheckedState = Boolean(checkedState)
              setIsTermsAccepted(nextCheckedState)
              if (nextCheckedState) {
                setHasSubmitAttempt(false)
                setIsCtaAttentionActive(false)
              }
            }}
            className="mt-0.5 h-5 w-5 rounded-md border-zinc-400 dark:border-zinc-600"
            aria-invalid={hasTermsValidationError}
          />
          <span className="text-sm font-semibold leading-relaxed text-zinc-700 dark:text-zinc-200">
            {termsLabelPrefix}
            <Link
              to="/terms"
              className="font-black text-blue-700 underline underline-offset-2 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
            >
              {termsLabelLink}
            </Link>
            .
            {hasTermsValidationError ? (
              <span className="mt-1 block text-xs font-bold text-red-700 dark:text-red-300">
                {termsRequiredHint}
              </span>
            ) : null}
          </span>
        </label>
      </div>

      <div className="mt-10 flex justify-center">
        <div className="relative w-full max-w-md sm:min-w-[340px]">
          <AuthSignInButton mode="redirect" forceRedirectUrl={signInRedirectUrl}>
            <Button
              ref={signInButtonRef}
              size="lg"
              disabled={!isTermsAccepted}
              className={`h-16 w-full rounded-2xl bg-gradient-to-r from-blue-700 via-blue-800 to-blue-950 px-8 text-lg font-black text-white shadow-[0_18px_34px_-14px_rgba(30,58,138,0.9)] hover:brightness-110 sm:text-xl ${isCtaAttentionActive ? 'ring-2 ring-red-400 ring-offset-2 ring-offset-background from-red-600 via-blue-800 to-blue-950' : ''}`}
            >
              {signInLabel}
            </Button>
          </AuthSignInButton>

          {!isTermsAccepted ? (
            <button
              type="button"
              aria-label={blockedCtaAriaLabel}
              className="absolute inset-0 z-10 cursor-not-allowed rounded-2xl bg-transparent"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                showBlockedSubmitFeedback()
              }}
            />
          ) : null}
        </div>
      </div>

      <div className="mt-6 text-center">
        <Button
          type="button"
          variant="ghost"
          className="rounded-xl text-sm font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          onClick={onChangeEntity}
        >
          {changeEntityLabel}
        </Button>
      </div>
    </section>
  )
}
