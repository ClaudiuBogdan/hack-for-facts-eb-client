import { t } from '@lingui/core/macro'
import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeftRight, Building2, Check, Link2, MapPin, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { getSiteUrl } from '@/config/env'
import { CAMPAIGN_BASE_PATH } from '@/features/campaigns/buget/constants'
import { useEntityTypeLabel } from '@/hooks/filters/useFilterLabels'
import { ensureShortRedirectUrl } from '@/lib/api/shortLinks'
import { useAuth } from '@/lib/auth'
import type { EntityDetailsData } from '@/lib/api/entities'
import type { ChallengeLocale } from '../../types'

type ChallengeEntityAnalysisHeaderProps = {
  readonly entity: Pick<EntityDetailsData, 'name' | 'entity_type' | 'uat'>
  readonly selectedYear: number
  readonly availableYears: readonly number[]
  readonly onYearChange: (year: number) => void
  readonly showInflationBadge?: boolean
  readonly languageQuery?: ChallengeLocale
}

const LOCAL_GOVERNMENT_TYPE_LABELS: Record<string, string> = {
  admin_county_council: 'Județ',
  admin_municipality: 'Municipiu',
  admin_town_hall: 'Oraș',
  admin_commune_hall: 'Comună',
  admin_sector_hall: 'Sector',
}

function normalizeDisplayText(
  value: string,
  locale: ChallengeLocale | undefined,
): string {
  return value
    .trim()
    .toLocaleLowerCase(locale === 'en' ? 'en-US' : 'ro-RO')
    .replace(
      /(^|[\s-])(\p{L})/gu,
      (_match, prefix: string, character: string) =>
        `${prefix}${character.toLocaleUpperCase(locale === 'en' ? 'en-US' : 'ro-RO')}`,
    )
}

export function ChallengeEntityAnalysisHeader({
  entity,
  selectedYear,
  availableYears,
  onYearChange,
  showInflationBadge = false,
  languageQuery,
}: ChallengeEntityAnalysisHeaderProps) {
  const { isSignedIn } = useAuth()
  const queryClient = useQueryClient()
  const [shareCopied, setShareCopied] = useState(false)
  const entityTypeLabel = useEntityTypeLabel()
  const rawEntityCategory = entity.entity_type
    ? entityTypeLabel.map(entity.entity_type)
    : null
  const entityCategory = entity.entity_type
    ? LOCAL_GOVERNMENT_TYPE_LABELS[entity.entity_type] ??
      (rawEntityCategory && !rawEntityCategory.startsWith('id::')
        ? normalizeDisplayText(
            rawEntityCategory.replace(/^primărie\s+/i, ''),
            languageQuery,
          )
        : null)
    : null
  const countyNameRaw = entity.uat?.county_name?.trim() || null
  const countyName = countyNameRaw
    ? normalizeDisplayText(countyNameRaw, languageQuery)
    : null
  const displayNameSource = entity.uat?.name?.trim() || entity.name
  const displayName = normalizeDisplayText(displayNameSource, languageQuery)
  const population =
    typeof entity.uat?.population === 'number'
      ? new Intl.NumberFormat(
          languageQuery === 'en' ? 'en-US' : 'ro-RO',
        ).format(entity.uat.population)
      : null
  const linkSearch = languageQuery === 'en' ? { lang: 'en' as const } : {}

  const handleShare = async () => {
    try {
      const url = window.location.href
      let linkToCopy = url
      if (isSignedIn) {
        try {
          linkToCopy = await ensureShortRedirectUrl(
            url,
            getSiteUrl(),
            queryClient,
          )
        } catch (e) {
          console.error(
            'Failed to generate short link, falling back to full URL',
            e,
          )
        }
      }
      await navigator.clipboard.writeText(linkToCopy)
      toast.success(t`Link copied to clipboard`)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed', err)
      toast.error(t`Failed to copy link`)
    }
  }

  const inflationBadgeLabel =
    languageQuery === 'en'
      ? 'Inflation-adjusted values (2024)'
      : 'Valori ajustate cu inflația (2024)'

  return (
    <section className="rounded-[32px] border border-border/50 bg-linear-to-br from-background via-background to-primary/[0.04] px-5 py-5 shadow-sm sm:px-6 sm:py-7 md:px-8">
      <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-4 min-w-0">
          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-muted-foreground">
              {t`Primăria Mea`}
            </p>
            <h1 className="text-balance text-[1.85rem] font-black leading-[0.94] tracking-tight text-foreground sm:text-[2.55rem] md:text-[2.85rem] lg:text-5xl">
              {displayName}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {showInflationBadge ? (
              <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                {inflationBadgeLabel}
              </Badge>
            ) : null}
            {entityCategory ? (
              <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                {entityCategory}
              </Badge>
            ) : null}
            {countyName ? (
              <Badge variant="outline" className="gap-1.5 px-3 py-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {countyName}
              </Badge>
            ) : null}
            {population ? (
              <Badge variant="outline" className="gap-1.5 px-3 py-1">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {population} {t`locuitori`}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 md:items-end">
          <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {t`Perioada`}
            </p>
            <Select
              value={String(selectedYear)}
              onValueChange={(value) => onYearChange(Number(value))}
            >
              <SelectTrigger
                aria-label={t`Selectează anul`}
                className="mt-1 h-auto w-auto min-w-[8.5rem] gap-2 border-0 bg-transparent p-0 text-left shadow-none focus:ring-2 focus:ring-primary/60"
              >
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {selectedYear}
                </span>
              </SelectTrigger>
              <SelectContent align="end">
                {availableYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              aria-label={t`Copiază link`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              {shareCopied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Link2 className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <Link
              to={`${CAMPAIGN_BASE_PATH}/cauta` as '/'}
              search={linkSearch}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border/60 bg-muted/40 px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
              {t`Schimbă Primăria`}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
