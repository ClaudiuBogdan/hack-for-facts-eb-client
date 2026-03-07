import { t } from '@lingui/core/macro'
import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeftRight, Building2, Check, Link2, MapPin, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
import { useIsMobile } from '@/hooks/use-mobile'
import { ensureShortRedirectUrl } from '@/lib/api/shortLinks'
import { useAuth } from '@/lib/auth'
import type { EntityDetailsData } from '@/lib/api/entities'
import { useScrollDirection } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import type { ChallengeLocale } from '../../types'

type ChallengeEntityAnalysisHeaderProps = {
  readonly entity: Pick<EntityDetailsData, 'name' | 'entity_type' | 'uat'>
  readonly selectedYear: number
  readonly availableYears: readonly number[]
  readonly onYearChange: (year: number) => void
  readonly showInflationBadge?: boolean
  readonly languageQuery?: ChallengeLocale
}

const LOCAL_GOVERNMENT_TYPE_LABELS = {
  ro: {
    admin_county_council: 'Județ',
    admin_municipality: 'Municipiu',
    admin_town_hall: 'Oraș',
    admin_commune_hall: 'Comună',
    admin_sector_hall: 'Sector',
  },
  en: {
    admin_county_council: 'County',
    admin_municipality: 'Municipality',
    admin_town_hall: 'Town',
    admin_commune_hall: 'Commune',
    admin_sector_hall: 'Sector',
  },
} as const
const COMPACT_HEADER_SHOW_THRESHOLD = 320
const COMPACT_HEADER_RESET_THRESHOLD = 160
const COMPACT_HEADER_TRANSITION_MS = 260

const HEADER_COPY = {
  ro: {
    inhabitants: 'locuitori',
    myCityHall: 'Primăria Mea',
    period: 'Perioada',
    selectYear: 'Selectează anul',
    copyLink: 'Copiază link',
    changeCityHall: 'Schimbă Primăria',
  },
  en: {
    inhabitants: 'inhabitants',
    myCityHall: 'My City Hall',
    period: 'Period',
    selectYear: 'Select year',
    copyLink: 'Copy link',
    changeCityHall: 'Change City Hall',
  },
} as const

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
  const locale = languageQuery === 'en' ? 'en' : 'ro'
  const copy = HEADER_COPY[locale]
  const { isSignedIn } = useAuth()
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const [shareCopied, setShareCopied] = useState(false)
  const entityTypeLabel = useEntityTypeLabel()
  const rawEntityCategory = entity.entity_type
    ? entityTypeLabel.map(entity.entity_type)
    : null
  const localGovernmentTypeLabel = entity.entity_type
    ? LOCAL_GOVERNMENT_TYPE_LABELS[locale][
        entity.entity_type as keyof (typeof LOCAL_GOVERNMENT_TYPE_LABELS)['ro']
      ]
    : null
  const entityCategory = entity.entity_type
    ? localGovernmentTypeLabel ??
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
  const displayName = normalizeDisplayText(entity.name, languageQuery)
  const population =
    typeof entity.uat?.population === 'number'
      ? new Intl.NumberFormat(
          languageQuery === 'en' ? 'en-US' : 'ro-RO',
        ).format(entity.uat.population)
      : null
  const linkSearch = languageQuery === 'en' ? { lang: 'en' as const } : {}
  const { direction, isPastThreshold, y } = useScrollDirection({
    threshold: COMPACT_HEADER_SHOW_THRESHOLD,
  })
  const heroHeaderRef = useRef<HTMLElement | null>(null)
  const compactHeaderExitTimeoutRef = useRef<number | null>(null)
  const compactHeaderEnterFrameRef = useRef<number | null>(null)
  const [isCompactHeaderMounted, setIsCompactHeaderMounted] = useState(false)
  const [isCompactHeaderVisible, setIsCompactHeaderVisible] = useState(false)
  const [compactHeaderFrame, setCompactHeaderFrame] = useState<{
    readonly left: number
    readonly width: number
  } | null>(null)
  const shouldShowCompactHeader =
    y >= COMPACT_HEADER_RESET_THRESHOLD &&
    isPastThreshold &&
    direction === 'down'

  useEffect(() => {
    const syncCompactHeaderFrame = () => {
      const heroHeaderElement = heroHeaderRef.current
      if (!heroHeaderElement) {
        return
      }

      const nextFrame = heroHeaderElement.getBoundingClientRect()
      if (nextFrame.width <= 0) {
        return
      }

      setCompactHeaderFrame((currentFrame) => {
        if (
          currentFrame &&
          currentFrame.left === nextFrame.left &&
          currentFrame.width === nextFrame.width
        ) {
          return currentFrame
        }

        return {
          left: nextFrame.left,
          width: nextFrame.width,
        }
      })
    }

    syncCompactHeaderFrame()
    window.addEventListener('resize', syncCompactHeaderFrame)

    return () => {
      window.removeEventListener('resize', syncCompactHeaderFrame)
    }
  }, [])

  useEffect(() => {
    const syncCompactHeaderFrame = () => {
      const heroHeaderElement = heroHeaderRef.current
      if (!heroHeaderElement) {
        return
      }

      const nextFrame = heroHeaderElement.getBoundingClientRect()
      if (nextFrame.width <= 0) {
        return
      }

      setCompactHeaderFrame({
        left: nextFrame.left,
        width: nextFrame.width,
      })
    }

    if (shouldShowCompactHeader) {
      if (compactHeaderExitTimeoutRef.current !== null) {
        window.clearTimeout(compactHeaderExitTimeoutRef.current)
        compactHeaderExitTimeoutRef.current = null
      }

      syncCompactHeaderFrame()

      if (!isCompactHeaderMounted) {
        setIsCompactHeaderMounted(true)
        return
      }

      compactHeaderEnterFrameRef.current = window.requestAnimationFrame(() => {
        setIsCompactHeaderVisible(true)
      })

      return
    }

    if (!isCompactHeaderMounted) {
      setIsCompactHeaderVisible(false)
      return
    }

    setIsCompactHeaderVisible(false)
    compactHeaderExitTimeoutRef.current = window.setTimeout(() => {
      setIsCompactHeaderMounted(false)
      compactHeaderExitTimeoutRef.current = null
    }, COMPACT_HEADER_TRANSITION_MS)

    return () => {
      if (compactHeaderEnterFrameRef.current !== null) {
        window.cancelAnimationFrame(compactHeaderEnterFrameRef.current)
        compactHeaderEnterFrameRef.current = null
      }

      if (compactHeaderExitTimeoutRef.current !== null) {
        window.clearTimeout(compactHeaderExitTimeoutRef.current)
        compactHeaderExitTimeoutRef.current = null
      }
    }
  }, [isCompactHeaderMounted, shouldShowCompactHeader])

  useEffect(() => {
    return () => {
      if (compactHeaderEnterFrameRef.current !== null) {
        window.cancelAnimationFrame(compactHeaderEnterFrameRef.current)
      }

      if (compactHeaderExitTimeoutRef.current !== null) {
        window.clearTimeout(compactHeaderExitTimeoutRef.current)
      }
    }
  }, [])

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
    <>
      {isCompactHeaderMounted ? (
        <div
          data-testid="challenge-entity-compact-header"
          className={cn(
            'pointer-events-none fixed top-0 z-40 overflow-hidden rounded-b-[28px] shadow-[0_16px_34px_-22px_rgba(15,23,42,0.32)] backdrop-blur-xl will-change-[translate,opacity]',
            'transition-[opacity,translate] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:translate-y-0 motion-reduce:transition-opacity',
            isCompactHeaderVisible
              ? 'translate-y-0 opacity-100'
              : '-translate-y-5 opacity-0',
          )}
          style={
            compactHeaderFrame
              ? {
                  left: compactHeaderFrame.left,
                  width: compactHeaderFrame.width,
                }
              : undefined
          }
        >
          <div className="w-full">
            <section className="rounded-b-[28px] border-x border-b border-border/50 bg-linear-to-br from-background/92 via-background/88 to-primary/[0.08] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.32)] supports-[backdrop-filter]:bg-background/78 sm:px-5">
              <div className="flex flex-col gap-1">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="min-w-0 text-balance text-[1.65rem] font-black leading-[0.94] tracking-tight text-foreground sm:text-[2.8rem]">
                      {displayName}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-[13px] font-black uppercase tracking-[0.16em] text-muted-foreground tabular-nums sm:text-sm">
                    {selectedYear}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {countyName ? (
                    <Badge
                      variant="outline"
                      className="gap-1.5 bg-background/80 px-3 py-1 text-[11px] sm:text-xs"
                    >
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {countyName}
                    </Badge>
                  ) : null}
                  {population ? (
                    <Badge
                      variant="outline"
                      className="gap-1.5 bg-background/80 px-3 py-1 text-[11px] sm:text-xs"
                    >
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      {population} {copy.inhabitants}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      <section
        ref={heroHeaderRef}
        className="rounded-[32px] border border-border/50 bg-linear-to-br from-background via-background to-primary/[0.04] px-5 py-5 shadow-sm sm:px-6 sm:py-7 md:px-8"
      >
        <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-4">
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-muted-foreground">
                {copy.myCityHall}
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
                  {population} {copy.inhabitants}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {copy.period}
              </p>
              <Select
                value={String(selectedYear)}
                onValueChange={(value) => onYearChange(Number(value))}
              >
                <SelectTrigger
                  aria-label={copy.selectYear}
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

            {!isMobile ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label={copy.copyLink}
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
                  {copy.changeCityHall}
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  )
}
