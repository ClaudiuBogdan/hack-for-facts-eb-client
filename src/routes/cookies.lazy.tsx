import { createLazyFileRoute, Link, useNavigate, useSearch, useRouter } from '@tanstack/react-router'
import { z } from 'zod'
import { useEffect, useState, useCallback } from 'react'
import { getConsent, setConsent, type ConsentPreferences, onConsentChange, acceptAll, declineAll } from '@/lib/consent'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { useAuth } from '@/lib/auth'
import { getSiteUrl } from '@/config/env'
import { Shield, BarChart3, Bug, Check, X, Settings } from 'lucide-react'

export const Route = createLazyFileRoute('/cookies')({
  component: CookieSettingsPage,
})

type RouterInstance = ReturnType<typeof useRouter>
type ParseLocationInput = Parameters<RouterInstance['parseLocation']>[0]

const SearchSchema = z.object({
  redirect: z.string().optional(),
})

const isSafeRedirect = (value?: string): value is string =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')

const buildRedirectLocation = (router: RouterInstance, redirect: string) => {
  const origin = globalThis.location?.origin ?? getSiteUrl()
  const url = new URL(redirect, origin)
  const locationState = router.state.location?.state ?? { __TSR_index: 0 }
  const location: ParseLocationInput = {
    href: `${url.pathname}${url.search}${url.hash}`,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    state: locationState,
  }

  return router.parseLocation(location)
}

function CookieSettingsPage() {
  const [savedPrefs, setSavedPrefs] = useState<ConsentPreferences>(getConsent())
  const [prefs, setPrefs] = useState<ConsentPreferences>(getConsent())
  const { isEnabled: isAuthEnabled, isSignedIn } = useAuth()
  const navigate = useNavigate({ from: '/cookies' })
  const router = useRouter()
  const rawSearch = useSearch({ from: '/cookies' })
  const { redirect } = SearchSchema.parse(rawSearch)

  const hasChanges =
    prefs.analytics !== savedPrefs.analytics || prefs.sentry !== savedPrefs.sentry

  useEffect(() => {
    const nextPrefs = getConsent()
    setSavedPrefs(nextPrefs)
    setPrefs(nextPrefs)
    const off = onConsentChange((next) => {
      setSavedPrefs(next)
      setPrefs(next)
    })
    return () => off()
  }, [])

  const updateDraft = useCallback((patch: Partial<ConsentPreferences>) => {
    setPrefs((current) => ({
      ...current,
      ...patch,
    }))
  }, [])

  const persistConsent = useCallback((next: ConsentPreferences) => {
    setConsent(next)
    const updated = getConsent()
    setSavedPrefs(updated)
    setPrefs(updated)
  }, [])

  const handleAnalyticsToggle = useCallback((checked: boolean) => {
    updateDraft({ analytics: checked })
  }, [updateDraft])

  const handleSentryToggle = useCallback((checked: boolean) => {
    updateDraft({ sentry: checked })
  }, [updateDraft])

  const navigateBack = useCallback(() => {
    if (!isSafeRedirect(redirect)) {
      navigate({ to: '/' })
      return
    }

    try {
      const parsed = buildRedirectLocation(router, redirect)
      navigate({ href: parsed.href })
    } catch {
      navigate({ to: '/' })
    }
  }, [navigate, redirect, router])

  const handleAllowEssentialOnly = useCallback(() => {
    declineAll()
    const next = getConsent()
    setSavedPrefs(next)
    setPrefs(next)
    navigateBack()
  }, [navigateBack])

  const handleAllowAll = useCallback(() => {
    acceptAll()
    const next = getConsent()
    setSavedPrefs(next)
    setPrefs(next)
    navigateBack()
  }, [navigateBack])

  const handleAcceptSelected = useCallback(() => {
    persistConsent(prefs)
    navigateBack()
  }, [navigateBack, persistConsent, prefs])

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            <Trans>Cookie Settings</Trans>
          </h1>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          <Trans>
            Choose between essential-only or all cookies, then fine-tune individual options below.
            Your selections are saved when you press &quot;Confirm choices&quot;.
          </Trans>
        </p>
      </div>

      <div className="space-y-4">
        <CookieCard
          icon={<Shield className="h-4 w-4" />}
          title={t`Essential cookies`}
          description={t`Required for core functionality like security, authentication, and preferences. Always on.`}
          badge={
            <Badge variant="success" className="gap-1">
              <Check className="h-3 w-3" />
              <Trans>Active</Trans>
            </Badge>
          }
          footer={
            isAuthEnabled ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isSignedIn ? (
                  <Trans>
                    You are signed in. Authentication cookies (Clerk) are essential and required to keep you signed in. Deleting them will sign you out.
                  </Trans>
                ) : (
                  <Trans>
                    If you sign in, authentication cookies (Clerk) are essential to manage your session. Deleting them will sign you out.
                  </Trans>
                )}
              </p>
            ) : undefined
          }
        >
          <div className="flex items-center gap-2.5">
            <Switch checked disabled aria-readonly />
            <span className="text-sm text-muted-foreground"><Trans>Always enabled</Trans></span>
          </div>
        </CookieCard>

        <CookieCard
          icon={<BarChart3 className="h-4 w-4" />}
          title={t`Analytics (PostHog)`}
          description={t`Help us understand usage to improve the product. No analytics data is sent unless you opt in.`}
          badge={
            prefs.analytics ? (
              <Badge variant="success" className="gap-1">
                <Check className="h-3 w-3" />
                <Trans>Enabled</Trans>
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <X className="h-3 w-3" />
                <Trans>Disabled</Trans>
              </Badge>
            )
          }
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-medium"><Trans>Usage analytics</Trans></div>
              <div className="text-xs text-muted-foreground mt-0.5"><Trans>Anonymous usage patterns, page views, interactions, and feature usage events.</Trans></div>
            </div>
            <Switch
              checked={prefs.analytics}
              onCheckedChange={handleAnalyticsToggle}
              aria-label={t`Toggle analytics cookies`}
              className="shrink-0"
            />
          </div>
        </CookieCard>

        <CookieCard
          icon={<Bug className="h-4 w-4" />}
          title={t`Error reporting (Sentry)`}
          description={t`Help us fix problems by sending error reports. When disabled, only minimal anonymous telemetry is sent to keep the service reliable.`}
          badge={
            prefs.sentry ? (
              <Badge variant="success" className="gap-1">
                <Check className="h-3 w-3" />
                <Trans>Enabled</Trans>
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <X className="h-3 w-3" />
                <Trans>Disabled</Trans>
              </Badge>
            )
          }
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-medium"><Trans>Enhanced error reporting</Trans></div>
              <div className="text-xs text-muted-foreground mt-0.5"><Trans>Includes additional error context and, if you use feedback tools, may include your message text or screenshots.</Trans></div>
            </div>
            <Switch
              checked={prefs.sentry}
              onCheckedChange={handleSentryToggle}
              aria-label={t`Toggle enhanced error reporting`}
              className="shrink-0"
            />
          </div>
        </CookieCard>
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleAllowEssentialOnly}
            className="h-12 w-full text-sm font-semibold sm:flex-1"
            aria-label={t`Allow essential cookies only`}
          >
            <Trans>Essential only</Trans>
          </Button>
          <Button
            variant={hasChanges ? 'default' : 'secondary'}
            onClick={handleAcceptSelected}
            className="h-12 w-full text-sm font-semibold sm:flex-1"
            aria-label={t`Save cookie preferences`}
          >
            <Trans>Confirm choices</Trans>
          </Button>
          <Button
            onClick={handleAllowAll}
            className="h-12 w-full text-sm font-semibold sm:flex-1"
            aria-label={t`Allow all cookies`}
          >
            <Trans>Allow all</Trans>
          </Button>
        </div>

        <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            <Trans>
              Read our <Link to="/cookie-policy" className="underline underline-offset-2 hover:text-foreground transition-colors">Cookie Policy</Link> and <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">Privacy Policy</Link>.
            </Trans>
          </span>
          <span className="shrink-0">
            <Trans>Last updated:</Trans>{' '}
            {new Date(savedPrefs.updatedAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>
    </div>
  )
}

type CookieCardProps = {
  readonly icon: React.ReactNode
  readonly title: string
  readonly description: string
  readonly badge: React.ReactNode
  readonly footer?: React.ReactNode
  readonly children: React.ReactNode
}

function CookieCard({ icon, title, description, badge, footer, children }: CookieCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-tight">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="shrink-0">{badge}</div>
      </div>
      <div className="ml-0 sm:ml-12 border-t pt-3">
        {children}
      </div>
      {footer && (
        <div className="ml-0 sm:ml-12 mt-3">
          {footer}
        </div>
      )}
    </div>
  )
}
