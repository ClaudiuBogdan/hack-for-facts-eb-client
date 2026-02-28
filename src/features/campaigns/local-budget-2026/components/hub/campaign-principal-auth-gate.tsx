import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

async function getEntityNameByCui(entityCui: string): Promise<string | null> {
  const labels = await getEntityLabels([entityCui])
  const matchedEntity = labels.find((label) => label.id === entityCui)
  return matchedEntity?.label ?? null
}

export function CampaignPrincipalAuthGate({
  locale,
  languageQuery,
  selectedEntityCui,
  onChangeEntity,
}: CampaignPrincipalAuthGateProps) {
  const { data: selectedEntityName } = useQuery({
    queryKey: ['campaign-principal-entity-name', selectedEntityCui],
    queryFn: () => getEntityNameByCui(selectedEntityCui),
    enabled: selectedEntityCui.length > 0,
    staleTime: 1000 * 60 * 10,
  })

  const safeEntityName = selectedEntityName?.trim() || selectedEntityCui
  const cityHallLabel = locale === 'en' ? `City Hall ${safeEntityName}` : `Primăria ${safeEntityName}`
  const title =
    locale === 'en'
      ? `Ready to start for ${cityHallLabel}?`
      : `Ești pregătit să începi pentru ${cityHallLabel}?`
  const description =
    locale === 'en'
      ? 'Before we begin, sign in to your account so your progress stays saved and you can continue every step of the challenge.'
      : 'Înainte să începem, intră în contul tău ca să îți salvăm progresul și să poți continua fiecare pas al provocării.'
  const signInLabel = locale === 'en' ? 'Sign in and continue' : 'Intră în cont și continuă'
  const changeEntityLabel = locale === 'en' ? 'Choose another city hall' : 'Alege altă primărie'
  const selectedEntityLabel = locale === 'en' ? 'Selected city hall' : 'Primărie selectată'

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
      </div>

      <div className="mt-10 flex justify-center">
        <AuthSignInButton mode="redirect" forceRedirectUrl={signInRedirectUrl}>
          <Button
            size="lg"
            className="h-16 w-full max-w-md rounded-2xl bg-gradient-to-r from-blue-700 via-blue-800 to-blue-950 px-8 text-lg font-black text-white shadow-[0_18px_34px_-14px_rgba(30,58,138,0.9)] hover:brightness-110 sm:w-auto sm:min-w-[340px] sm:text-xl"
          >
            {signInLabel}
          </Button>
        </AuthSignInButton>
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
