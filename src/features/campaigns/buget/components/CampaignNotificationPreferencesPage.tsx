import { useCallback, useMemo, useState } from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { ArrowLeft, Bell, BellOff, Building2 } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth, AuthSignInButton } from '@/lib/auth'
import { useCampaignNotifications } from '@/features/notifications/hooks/useCampaignNotifications'
import { useToggleNotification } from '@/features/notifications/hooks/useToggleNotification'
import { createNotification, updateNotification } from '@/features/notifications/api/notifications'
import { useEntityLabel } from '@/hooks/filters/useFilterLabels'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

import {
  CAMPAIGN_ENTITY_SELECTOR_PATH,
  buildCampaignBudgetPath,
} from '../constants'
import type { Notification } from '@/features/notifications/types'

type CampaignNotificationsReturnTarget = {
  readonly to: string
  readonly search?: Record<string, string>
}

type CampaignNotificationsSearch = {
  readonly from?: string
  readonly lang?: 'ro' | 'en'
}

type CampaignLocaleSearch = {
  readonly lang: 'en'
}

export function parseCampaignNotificationsReturnTarget(
  from?: string
): CampaignNotificationsReturnTarget {
  const parsed = parseAppRelativeTarget(from)

  if (!parsed) {
    return { to: CAMPAIGN_ENTITY_SELECTOR_PATH }
  }

  const search: Record<string, string> = {}

  for (const [key, value] of parsed.searchParams.entries()) {
    search[key] = value
  }

  return Object.keys(search).length > 0
    ? { to: parsed.pathname, search }
    : { to: parsed.pathname }
}

function parseAppRelativeTarget(input?: string): {
  readonly pathname: string
  readonly searchParams: URLSearchParams
} | null {
  const trimmedInput = input?.trim() ?? ''
  if (!trimmedInput || !trimmedInput.startsWith('/') || trimmedInput.startsWith('//')) {
    return null
  }

  const hashlessInput = trimmedInput.split('#', 1)[0] ?? trimmedInput
  const searchIndex = hashlessInput.indexOf('?')
  const pathname =
    searchIndex >= 0
      ? hashlessInput.slice(0, searchIndex)
      : hashlessInput
  const search =
    searchIndex >= 0
      ? hashlessInput.slice(searchIndex + 1)
      : ''

  if (!pathname.startsWith('/')) {
    return null
  }

  return {
    pathname,
    searchParams: new URLSearchParams(search),
  }
}

function getCampaignLocaleSearch(lang?: CampaignNotificationsSearch['lang']): CampaignLocaleSearch | undefined {
  return lang === 'en' ? { lang: 'en' } : undefined
}

function mergeTargetSearch(
  search: Record<string, string> | undefined,
  localeSearch: CampaignLocaleSearch | undefined,
): Record<string, string> | undefined {
  if (!localeSearch) {
    return search
  }

  return search
    ? { ...localeSearch, ...search }
    : localeSearch
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { readonly message?: unknown }).message
    if (typeof message === 'string' && message.trim().length > 0) {
      return message
    }
  }

  return t`An unexpected error occurred`
}

export function CampaignNotificationPreferencesPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const { from, lang } = useSearch({ strict: false }) as CampaignNotificationsSearch
  const localeSearch = getCampaignLocaleSearch(lang)

  if (!isLoaded) {
    return <LoadingState from={from} localeSearch={localeSearch} />
  }

  if (!isSignedIn) {
    return <SignInRequired />
  }

  return <NotificationPreferencesContent from={from} localeSearch={localeSearch} />
}

function NotificationPreferencesContent({
  from,
  localeSearch,
}: {
  readonly from?: string
  readonly localeSearch?: CampaignLocaleSearch
}) {
  const {
    data: notifications,
    isLoading,
    isError,
    error,
    refetch,
    activeCount,
    totalCount,
    globalPreference,
  } = useCampaignNotifications()
  const toggleMutation = useToggleNotification({ silent: true })
  const queryClient = useQueryClient()
  const [isBatchUpdating, setIsBatchUpdating] = useState(false)
  const entityNotifications = notifications ?? []
  const isGlobalEnabled = globalPreference?.isActive ?? activeCount > 0

  const ensureGlobalPreference = useCallback(
    async (isActive: boolean) => {
      if (globalPreference !== null) {
        if (globalPreference.isActive === isActive) {
          return globalPreference
        }

        return updateNotification(globalPreference.id, { isActive })
      }

      const created = await createNotification({
        entityCui: null,
        notificationType: 'campaign_public_debate_global',
      })

      if (!isActive) {
        return updateNotification(created.id, { isActive: false })
      }

      return created
    },
    [globalPreference]
  )

  const entityCuis = useMemo(() => {
    const unique = new Set<string>()
    for (const n of entityNotifications) {
      const cui = typeof n.entityCui === 'string' ? n.entityCui.trim() : ''
      if (cui) unique.add(cui)
    }
    return Array.from(unique)
  }, [entityNotifications])

  const entityLabel = useEntityLabel(entityCuis)

  const entityTotalCount = totalCount

  const handleBatchToggle = useCallback(
    async (activate: boolean) => {
      const targets = entityNotifications.filter((n) =>
        activate ? !n.isActive : n.isActive
      )

      setIsBatchUpdating(true)
      try {
        await ensureGlobalPreference(activate)

        if (targets.length === 0) {
          await queryClient.invalidateQueries({ queryKey: ['notifications'] })
          return
        }

        const results = await Promise.allSettled(
          targets.map((n) => updateNotification(n.id, { isActive: activate }))
        )

        const succeeded = results.filter((r) => r.status === 'fulfilled').length
        const failed = results.filter((r) => r.status === 'rejected').length

        await queryClient.invalidateQueries({ queryKey: ['notifications'] })

        if (failed > 0) {
          toast.error(
            t`${String(failed)} of ${String(failed + succeeded)} updates failed`
          )
        }
      } catch (error) {
        console.error('Failed to update campaign notifications:', error)
        toast.error(t`Failed to update notification`)
      } finally {
        setIsBatchUpdating(false)
      }
    },
    [ensureGlobalPreference, entityNotifications, queryClient]
  )

  const handleGlobalToggle = useCallback(async () => {
    if (toggleMutation.isPending || isBatchUpdating) return
    await handleBatchToggle(!isGlobalEnabled)
  }, [handleBatchToggle, isBatchUpdating, isGlobalEnabled, toggleMutation.isPending])

  const handleToggle = useCallback(
    async (notification: Notification) => {
      if (toggleMutation.isPending || !notification.entityCui) return
      try {
        if (!notification.isActive) {
          await ensureGlobalPreference(true)
        }

        await toggleMutation.mutateAsync({
          entityCui: notification.entityCui,
          notificationType: 'campaign_public_debate_entity_updates',
          isActive: !notification.isActive,
          notificationId: notification.id,
        })
      } catch {
        // useToggleNotification already surfaces its own toast
      }
    },
    [ensureGlobalPreference, toggleMutation]
  )

  const getEntityName = useCallback(
    (cui: string) => {
      const label = entityLabel.map(cui)
      if (typeof label === 'string' && !label.startsWith('id::')) {
        return label
      }
      return cui
    },
    [entityLabel]
  )

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4 space-y-8">
        <PageHeader from={from} localeSearch={localeSearch} />

        {/* Master control skeleton */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-5 py-4 bg-muted/30">
            <div className="flex items-center gap-3 min-w-0">
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-52" />
              </div>
            </div>
            <Skeleton className="h-5 w-9 rounded-full shrink-0" />
          </div>
        </Card>

        {/* Entity list skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <Card className="divide-y divide-border/50">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-9 rounded-full shrink-0" />
              </div>
            ))}
          </Card>
        </div>
      </div>
    )
  }

  if (isError && notifications === undefined) {
    return (
      <ErrorState
        from={from}
        localeSearch={localeSearch}
        message={getErrorMessage(error)}
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-8">
      <PageHeader from={from} localeSearch={localeSearch} />

      {/* Master control card */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 bg-muted/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${isGlobalEnabled ? 'bg-muted/60' : 'bg-red-500/10'}`}>
              {isGlobalEnabled ? (
                <Bell className="h-4.5 w-4.5 text-muted-foreground" aria-hidden="true" />
              ) : (
                <BellOff className="h-4.5 w-4.5 text-red-500" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm">
                <Trans>Campaign notifications</Trans>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                <Trans>Email updates for all entities in this campaign</Trans>
              </p>
            </div>
          </div>
          <Switch
            checked={isGlobalEnabled}
            onCheckedChange={() => {
              void handleGlobalToggle()
            }}
            disabled={toggleMutation.isPending || isBatchUpdating}
            className="cursor-pointer shrink-0"
            aria-label={t`Toggle campaign notifications`}
          />
        </div>

        {!isGlobalEnabled && entityTotalCount > 0 ? (
          <div className="px-5 py-3 text-xs text-muted-foreground border-t border-border/50">
            <Trans>
              Notifications are paused. Your {String(entityTotalCount)} entity subscriptions are preserved.
            </Trans>
          </div>
        ) : null}
      </Card>

      {entityTotalCount === 0 ? (
        <EmptyState localeSearch={localeSearch} />
      ) : (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold">
            <Trans>Entity subscriptions</Trans>
          </h2>

          {/* Entity list */}
          <Card className="divide-y divide-border/50">
            {entityNotifications.map((notification) => {
              const cui = notification.entityCui ?? ''
              const name = getEntityName(cui)
              const isPending = toggleMutation.isPending || isBatchUpdating

              return (
                <div
                  key={notification.id}
                  className="flex items-center gap-3 px-4 py-3 first:pt-3 last:pb-3"
                >
                  <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${notification.isActive ? 'bg-muted/60' : 'bg-red-500/10'}`}>
                    <Building2 className={`h-4 w-4 ${notification.isActive ? 'text-muted-foreground' : 'text-red-500'}`} aria-hidden="true" />
                  </div>
                  <Link
                    to={buildCampaignBudgetPath(cui)}
                    search={localeSearch}
                    className="flex-1 min-w-0 group"
                  >
                    <p className="text-sm font-medium truncate group-hover:underline">
                      {name}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      CUI {cui}
                    </p>
                  </Link>
                  <Switch
                    checked={notification.isActive}
                    onCheckedChange={() => {
                      void handleToggle(notification)
                    }}
                    disabled={isPending}
                    className="cursor-pointer shrink-0"
                    aria-label={t`Toggle notifications for ${name}`}
                  />
                </div>
              )
            })}
          </Card>
        </div>
      )}
    </div>
  )
}

function PageHeader({
  from,
  localeSearch,
}: {
  readonly from?: string
  readonly localeSearch?: CampaignLocaleSearch
}) {
  const backTarget = parseCampaignNotificationsReturnTarget(from)
  const backSearch = mergeTargetSearch(backTarget.search, localeSearch)

  return (
    <div className="space-y-4">
      <Link
        to={backTarget.to as '/'}
        search={backSearch}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        <Trans>Back to campaign</Trans>
      </Link>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">
          <Trans>Campaign Notifications</Trans>
        </h1>
        <p className="text-sm text-muted-foreground">
          <Trans>
            Manage email notifications for entities you follow in the campaign.
          </Trans>
        </p>
      </div>
    </div>
  )
}

function EmptyState({ localeSearch }: { readonly localeSearch?: CampaignLocaleSearch }) {
  return (
    <Card className="border-dashed border-2">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <BellOff className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          <Trans>No entity subscriptions</Trans>
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          <Trans>
            Accept the terms and conditions for an entity in the campaign to
            automatically receive update notifications.
          </Trans>
        </p>
        <Button asChild>
          <Link to={CAMPAIGN_ENTITY_SELECTOR_PATH} search={localeSearch}>
            <Trans>Browse entities</Trans>
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function ErrorState({
  from,
  localeSearch,
  message,
  onRetry,
}: {
  readonly from?: string
  readonly localeSearch?: CampaignLocaleSearch
  readonly message: string
  readonly onRetry: () => void
}) {
  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-8">
      <PageHeader from={from} localeSearch={localeSearch} />
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans>Unable to load notifications</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>Please try again to load your campaign notification preferences.</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{message}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={onRetry}>
              <Trans>Try Again</Trans>
            </Button>
            <Button variant="outline" asChild>
              <Link to={CAMPAIGN_ENTITY_SELECTOR_PATH} search={localeSearch}>
                <Trans>Browse entities</Trans>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingState({
  from,
  localeSearch,
}: {
  readonly from?: string
  readonly localeSearch?: CampaignLocaleSearch
}) {
  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 flex flex-col items-center justify-center min-h-[400px]">
      <PageHeader from={from} localeSearch={localeSearch} />
      <div className="flex-1 flex items-center justify-center py-16">
        <LoadingSpinner />
      </div>
    </div>
  )
}

function SignInRequired() {
  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans>Sign in required</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>You need to be signed in to manage campaign notifications</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <Trans>
              Sign in to manage email notifications for entities you follow in the campaign.
            </Trans>
          </p>
          <AuthSignInButton>
            <Button>
              <Trans>Sign In</Trans>
            </Button>
          </AuthSignInButton>
        </CardContent>
      </Card>
    </div>
  )
}
