import { useCallback, useEffect, useMemo, useRef } from 'react'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { CampaignHubPage } from '@/features/campaigns/local-budget-2026/components/hub/CampaignHubPage'
import { CampaignPrincipalAuthGate } from '@/features/campaigns/local-budget-2026/components/hub/campaign-principal-auth-gate'
import { resolveCampaignPrincipalLocale } from '@/features/campaigns/local-budget-2026/schemas/campaign-principal-search-schema'
import { CAMPAIGN_BASE_PATH } from '@/features/campaigns/local-budget-2026/constants'
import { useCampaignProgress } from '@/features/campaigns/local-budget-2026/hooks/use-campaign-progress'
import { Analytics } from '@/lib/analytics'
import { useAuth } from '@/lib/auth'
import type { CampaignLocale } from '@/features/campaigns/local-budget-2026/types'

export const Route = createLazyFileRoute('/bugete-locale-2026/principal')({
  component: CampaignHubRoutePage,
})

function getPrincipalSearch(languageQuery: CampaignLocale | undefined, entityCui?: string) {
  return {
    ...(languageQuery === 'en' ? { lang: 'en' as const } : {}),
    ...(entityCui ? { entityCui } : {}),
  }
}

function CampaignHubRoutePage() {
  const search = Route.useSearch()
  const locale = resolveCampaignPrincipalLocale(search)
  const navigate = useNavigate({ from: '/bugete-locale-2026/principal' })
  const { isLoaded, isSignedIn } = useAuth()
  const {
    isInitialResolutionReady,
    localSelectedEntityCui,
    remoteSelectedEntityCui,
    setSelectedEntity,
  } = useCampaignProgress()

  const normalizedUrlEntityCui = search.entityCui?.trim() || undefined
  const normalizedLocalEntityCui = localSelectedEntityCui?.trim() || undefined
  const normalizedRemoteEntityCui = remoteSelectedEntityCui?.trim() || undefined

  const resolvedEntity = useMemo(() => {
    if (normalizedUrlEntityCui) {
      return {
        entityCui: normalizedUrlEntityCui,
        source: 'url' as const,
      }
    }

    if (normalizedLocalEntityCui) {
      return {
        entityCui: normalizedLocalEntityCui,
        source: 'local' as const,
      }
    }

    if (normalizedRemoteEntityCui) {
      return {
        entityCui: normalizedRemoteEntityCui,
        source: 'server' as const,
      }
    }

    return {
      entityCui: undefined,
      source: 'none' as const,
    }
  }, [normalizedLocalEntityCui, normalizedRemoteEntityCui, normalizedUrlEntityCui])

  const lastRecoveryEventRef = useRef<string | null>(null)
  const hasTrackedRecoveryFailureRef = useRef(false)

  const navigateToSearchPage = useCallback(() => {
    void navigate({
      to: `${CAMPAIGN_BASE_PATH}/cauta` as '/',
      search: search.lang === 'en' ? { lang: 'en' as const } : {},
      replace: true,
      resetScroll: false,
    })
  }, [navigate, search.lang])

  useEffect(() => {
    if (!isLoaded || !isInitialResolutionReady) return

    if (!resolvedEntity.entityCui) {
      if (!hasTrackedRecoveryFailureRef.current) {
        Analytics.capture(Analytics.EVENTS.CampaignPrincipalEntityRecoveryFailedRedirectLanding)
        hasTrackedRecoveryFailureRef.current = true
      }

      void navigate({
        to: CAMPAIGN_BASE_PATH as '/',
        search: search.lang === 'en' ? { lang: 'en' as const } : {},
        replace: true,
        resetScroll: false,
      })
      return
    }

    if (resolvedEntity.source !== 'url') {
      const recoveryKey = `${resolvedEntity.source}:${resolvedEntity.entityCui}`
      if (lastRecoveryEventRef.current !== recoveryKey) {
        Analytics.capture(Analytics.EVENTS.CampaignPrincipalEntityRecovered, {
          source: resolvedEntity.source,
          entityCui: resolvedEntity.entityCui,
        })
        lastRecoveryEventRef.current = recoveryKey
      }
    }

    if (normalizedUrlEntityCui !== resolvedEntity.entityCui) {
      void navigate({
        to: `${CAMPAIGN_BASE_PATH}/principal` as '/',
        search: getPrincipalSearch(search.lang, resolvedEntity.entityCui),
        replace: true,
        resetScroll: false,
      })
      return
    }

    if (normalizedLocalEntityCui !== resolvedEntity.entityCui) {
      setSelectedEntity({ entityCui: resolvedEntity.entityCui })
    }
  }, [
    isInitialResolutionReady,
    isLoaded,
    navigate,
    normalizedLocalEntityCui,
    normalizedUrlEntityCui,
    resolvedEntity.entityCui,
    resolvedEntity.source,
    search.lang,
    setSelectedEntity,
  ])

  const shouldShowLoadingState =
    !isLoaded ||
    !isInitialResolutionReady ||
    !resolvedEntity.entityCui ||
    normalizedUrlEntityCui !== resolvedEntity.entityCui

  if (shouldShowLoadingState) {
    return (
      <section className="mx-auto w-full max-w-4xl rounded-[40px] border border-border/50 bg-gradient-to-br from-background via-background to-primary/[0.03] p-8 text-center shadow-xl shadow-primary/5 sm:p-12 lg:max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          {locale === 'en' ? 'Checking session' : 'Verificăm sesiunea'}
        </p>
      </section>
    )
  }

  if (!isSignedIn && resolvedEntity.entityCui) {
    return (
      <CampaignPrincipalAuthGate
        locale={locale}
        languageQuery={search.lang}
        selectedEntityCui={resolvedEntity.entityCui}
        onChangeEntity={navigateToSearchPage}
      />
    )
  }

  return (
    <CampaignHubPage
      locale={locale}
      selectedEntityCui={resolvedEntity.entityCui}
      onChangeEntity={() => {
        Analytics.capture(Analytics.EVENTS.CampaignEntitySelectionChanged)
        navigateToSearchPage()
      }}
    />
  )
}
