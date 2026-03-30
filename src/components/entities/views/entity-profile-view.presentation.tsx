import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import ExternalLink from 'lucide-react/dist/esm/icons/external-link'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import Info from 'lucide-react/dist/esm/icons/info'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { EntityProfileData } from './entity-profile-view.types'

type ProfileLocale = 'ro' | 'en'

const DISCLAIMER_COPY = {
  ro: {
    primary:
      'Aceste date au fost extrase automat de pe site-ul public al instituției și pot conține erori.',
    secondary:
      'Informațiile de profil sunt colectate prin scanarea automată a site-urilor oficiale. Procesul de extracție folosește euristici care pot interpreta greșit structura paginii sau pot extrage informații expirate. Dacă observați date incorecte, vă rugăm să le raportați pentru a îmbunătăți acuratețea.',
    showLess: 'Arată mai puțin',
    readMore: 'Citește mai mult',
  },
  en: {
    primary:
      'This data was extracted automatically from the institution\'s public website and may contain errors.',
    secondary:
      'Profile information is collected by automatically scanning official websites. The extraction process uses heuristics that may misinterpret page structure or extract outdated information. If you notice incorrect data, please report it so we can improve accuracy.',
    showLess: 'Show less',
    readMore: 'Read more',
  },
} as const

type EntityProfilePresentationProps = {
  readonly profile: EntityProfileData | null
  readonly isLoading: boolean
  readonly error: Error | null
  readonly locale: ProfileLocale
}

function getCountyDisplayValue(profile: EntityProfileData): string | null {
  const countyName = profile.county_name?.trim()
  if (!countyName) {
    return null
  }

  const countyCode = profile.county_code?.trim()
  return countyCode ? `${countyName} (${countyCode})` : countyName
}

function hasVisibleContactFields(profile: EntityProfileData): boolean {
  return Boolean(
    profile.website_url ||
      profile.official_email ||
      profile.phone_primary ||
      profile.address_raw ||
      getCountyDisplayValue(profile),
  )
}

export function EntityProfilePresentation({
  profile,
  isLoading,
  error,
  locale,
}: EntityProfilePresentationProps) {
  if (isLoading) {
    return <EntityProfileSkeleton />
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-destructive/30 bg-destructive/5 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-destructive">
              <Trans>Could not load profile data</Trans>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {error.message}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="rounded-[28px] border border-border/50 bg-muted/30 p-6">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              <Trans>No profile data available</Trans>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              <Trans>
                Profile information for this entity has not been collected yet.
              </Trans>
            </p>
          </div>
        </div>
      </div>
    )
  }

  const hasContact = hasVisibleContactFields(profile)

  return (
    <div className="space-y-6">
      {hasContact && <ContactCard profile={profile} />}
      <DataQualityCard profile={profile} locale={locale} />
    </div>
  )
}

function ContactField({
  label,
  value,
  href,
}: {
  readonly label: string
  readonly value: string | null | undefined
  readonly href?: string
}) {
  if (!value) return null

  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-baseline gap-1.5 text-[15px] font-medium text-foreground underline decoration-primary/30 underline-offset-[3px] transition-colors hover:text-primary hover:decoration-primary"
        >
          <span className="break-all">{value}</span>
          <ExternalLink className="relative top-px h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" aria-hidden="true" />
        </a>
      ) : (
        <p className="text-[15px] font-medium text-foreground">{value}</p>
      )}
    </div>
  )
}

function ContactCard({
  profile,
}: {
  readonly profile: EntityProfileData
}) {
  const countyDisplayValue = getCountyDisplayValue(profile)

  return (
    <div className="rounded-[28px] border border-border/50 bg-card p-6 shadow-sm md:p-8">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        <Trans>Contact information</Trans>
      </p>

      <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2">
        <ContactField
          label={t`Website`}
          value={profile.website_url}
          href={profile.website_url ?? undefined}
        />
        <ContactField
          label={t`Email`}
          value={profile.official_email}
          href={
            profile.official_email
              ? `mailto:${profile.official_email}`
              : undefined
          }
        />
        <ContactField
          label={t`Phone`}
          value={profile.phone_primary}
          href={
            profile.phone_primary
              ? `tel:${profile.phone_primary}`
              : undefined
          }
        />
        <ContactField
          label={t`Address`}
          value={profile.address_raw}
        />
        {countyDisplayValue && (
          <ContactField
            label={t`County`}
            value={countyDisplayValue}
          />
        )}
      </div>
    </div>
  )
}

function DataQualityCard({
  profile,
  locale,
}: {
  readonly profile: EntityProfileData
  readonly locale: ProfileLocale
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const copy = DISCLAIMER_COPY[locale]
  const confidence = profile.extraction_confidence
  const scrapedAt = new Date(profile.scraped_at)

  const confidenceColor =
    confidence === null
      ? 'bg-muted'
      : confidence >= 0.8
        ? 'bg-emerald-500'
        : confidence >= 0.5
          ? 'bg-amber-500'
          : 'bg-rose-500'

  const confidenceLabel =
    confidence === null
      ? t`Unknown`
      : confidence >= 0.8
        ? t`High`
        : confidence >= 0.5
          ? t`Medium`
          : t`Low`

  const formattedDate = scrapedAt.toLocaleDateString(
    locale === 'ro' ? 'ro-RO' : 'en-GB',
    { year: 'numeric', month: 'long', day: 'numeric' },
  )

  return (
    <Card className="rounded-[28px] border-border/50 shadow-sm">
      <CardContent className="px-4 py-4 sm:px-6 sm:py-5 md:px-7">
        <div className="flex items-start gap-3 sm:gap-4">
          <Info
            className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />

          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-[13px] leading-6 text-foreground sm:text-sm sm:leading-7 md:text-[1.05rem]">
              {copy.primary}
            </p>

            {isExpanded ? (
              <div className="space-y-3">
                <p className="text-sm leading-6 text-muted-foreground">
                  {copy.secondary}
                </p>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                  {confidence !== null && (
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" role="meter" aria-valuenow={Math.round(confidence * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={t`Extraction confidence`}>
                        <div
                          className={cn('h-full rounded-full', confidenceColor)}
                          style={{ width: `${confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        <Trans>Confidence</Trans>{' '}
                        <span className="font-semibold text-foreground">
                          {Math.round(confidence * 100)}%
                        </span>
                      </span>
                      <Badge
                        variant={
                          confidence >= 0.8
                            ? 'success'
                            : confidence >= 0.5
                              ? 'warning'
                              : 'destructive'
                        }
                        className="text-[10px]"
                      >
                        {confidenceLabel}
                      </Badge>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">
                    <Trans>Last updated</Trans>: {formattedDate}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex items-center pt-1">
              <Button
                type="button"
                variant="link"
                className="h-auto justify-start px-0 text-sm font-semibold"
                onClick={() => setIsExpanded((v) => !v)}
              >
                {isExpanded ? copy.showLess : copy.readMore}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EntityProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-border/50 bg-card p-6 shadow-sm md:p-8">
        <Skeleton className="h-3 w-36" />
        <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3.5 w-14" />
              <Skeleton className="h-5 w-48" />
            </div>
          ))}
        </div>
      </div>

      <Card className="rounded-[28px] border-border/50 shadow-sm">
        <CardContent className="px-4 py-4 sm:px-6 sm:py-5 md:px-7">
          <div className="flex items-start gap-3">
            <Skeleton className="mt-1 h-4 w-4 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
