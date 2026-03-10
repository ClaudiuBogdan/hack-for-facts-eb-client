import type { MouseEvent } from 'react'
import { Calendar, ChevronDown, MapPin, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ResponsivePopover } from '@/components/ui/ResponsivePopover'
import type { EntityDetailsData } from '@/lib/api/entities'
import {
  ChallengeEntityViewMenu,
  type ChallengeEntityViewOption,
  VIEW_ICONS,
} from './challenge-entity-view-menu'
import { ChallengeEntityYearMenu } from './challenge-entity-year-menu'
import type { ChallengeEntityAnalysisView } from '@/features/challenges/schemas/challenge-entity-analysis-route-search-schema'
import { cn } from '@/lib/utils'
import type { ChallengeLocale } from '../../types'

type ChallengeEntityAnalysisHeaderProps = {
  readonly entity: Pick<EntityDetailsData, 'name' | 'uat'>
  readonly selectedYear: number
  readonly availableYears: readonly number[]
  readonly onYearChange: (year: number) => void
  readonly activeView: ChallengeEntityAnalysisView
  readonly availableViews: readonly ChallengeEntityViewOption[]
  readonly onViewChange: (view: ChallengeEntityAnalysisView) => void
  readonly showInflationBadge?: boolean
  readonly languageQuery?: ChallengeLocale
}

const COMPACT_HEADER_SHOW_THRESHOLD = 320

const HEADER_COPY = {
  ro: {
    inhabitants: 'locuitori',
    yearMenuTitle: 'Selectează Anul',
    selectYear: 'Selectează anul',
    viewMenuTitle: 'Alege Vizualizarea',
    openViewMenu: 'Alege vizualizarea entității',
  },
  en: {
    inhabitants: 'inhabitants',
    yearMenuTitle: 'Select Year',
    selectYear: 'Select year',
    viewMenuTitle: 'Choose View',
    openViewMenu: 'Choose entity view',
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
  activeView,
  availableViews,
  onViewChange,
  showInflationBadge = false,
  languageQuery,
}: ChallengeEntityAnalysisHeaderProps) {
  const locale = languageQuery === 'en' ? 'en' : 'ro'
  const copy = HEADER_COPY[locale]
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
  const heroHeaderRef = useRef<HTMLElement | null>(null)
  const compactHeaderEnterFrameRef = useRef<number | null>(null)
  const compactHeaderScrollFrameRef = useRef<number | null>(null)
  const compactHeaderLastScrollYRef = useRef(0)
  const shouldShowCompactHeaderRef = useRef(false)
  const [shouldShowCompactHeader, setShouldShowCompactHeader] = useState(false)
  const [hasRenderedCompactHeader, setHasRenderedCompactHeader] = useState(false)
  const [isCompactHeaderVisible, setIsCompactHeaderVisible] = useState(false)
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false)
  const [isYearMenuOpen, setIsYearMenuOpen] = useState(false)
  const [isCompactYearMenuOpen, setIsCompactYearMenuOpen] = useState(false)
  const [compactHeaderFrame, setCompactHeaderFrame] = useState<{
    readonly left: number
    readonly width: number
  } | null>(null)
  const activeViewLabel =
    availableViews.find((view) => view.id === activeView)?.label ??
    availableViews[0]?.label ??
    ''
  const ActiveViewIcon = VIEW_ICONS[activeView]

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
    const getScrollY = () =>
      window.pageYOffset || document.documentElement.scrollTop || 0

    compactHeaderLastScrollYRef.current = getScrollY()

    const handleScroll = () => {
      if (compactHeaderScrollFrameRef.current !== null) {
        return
      }

      compactHeaderScrollFrameRef.current = window.requestAnimationFrame(() => {
        compactHeaderScrollFrameRef.current = null

        const currentY = getScrollY()
        const delta = currentY - compactHeaderLastScrollYRef.current
        const nextShouldShowCompactHeader =
          currentY > COMPACT_HEADER_SHOW_THRESHOLD &&
          delta > 0

        if (nextShouldShowCompactHeader !== shouldShowCompactHeaderRef.current) {
          shouldShowCompactHeaderRef.current = nextShouldShowCompactHeader
          setShouldShowCompactHeader(nextShouldShowCompactHeader)
        }

        compactHeaderLastScrollYRef.current = currentY
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)

      if (compactHeaderScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(compactHeaderScrollFrameRef.current)
        compactHeaderScrollFrameRef.current = null
      }
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

    if (shouldShowCompactHeader) {
      syncCompactHeaderFrame()

      if (!hasRenderedCompactHeader) {
        setHasRenderedCompactHeader(true)
        return
      }

      compactHeaderEnterFrameRef.current = window.requestAnimationFrame(() => {
        setIsCompactHeaderVisible(true)
      })

      return
    }

    setIsCompactHeaderVisible(false)

    return () => {
      if (compactHeaderEnterFrameRef.current !== null) {
        window.cancelAnimationFrame(compactHeaderEnterFrameRef.current)
        compactHeaderEnterFrameRef.current = null
      }
    }
  }, [hasRenderedCompactHeader, shouldShowCompactHeader])

  useEffect(() => {
    return () => {
      if (compactHeaderEnterFrameRef.current !== null) {
        window.cancelAnimationFrame(compactHeaderEnterFrameRef.current)
      }
    }
  }, [])

  const inflationBadgeLabel =
    languageQuery === 'en'
      ? 'Inflation-adjusted values (2024)'
      : 'Valori ajustate cu inflația (2024)'

  const stopCompactHeaderClickPropagation = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation()
  }

  const handleCompactHeaderNameClick = (
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation()

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    })
  }

  const handleViewSelection = (view: ChallengeEntityAnalysisView) => {
    setIsViewMenuOpen(false)
    onViewChange(view)
  }

  const handleYearSelection = (year: number) => {
    setIsYearMenuOpen(false)
    onYearChange(year)
  }

  const handleCompactYearSelection = (year: number) => {
    setIsCompactYearMenuOpen(false)
    onYearChange(year)
  }

  return (
    <>
      {hasRenderedCompactHeader ? (
        <div
          data-testid="challenge-entity-compact-header"
          aria-hidden={!isCompactHeaderVisible}
          onClick={stopCompactHeaderClickPropagation}
          className={cn(
            'fixed top-0 z-40 overflow-hidden rounded-b-[28px] shadow-[0_16px_34px_-22px_rgba(15,23,42,0.32)] backdrop-blur-xl will-change-[translate,opacity]',
            'transition-[opacity,translate] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:translate-y-0 motion-reduce:transition-opacity',
            isCompactHeaderVisible ? 'pointer-events-auto' : 'pointer-events-none',
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
                    <button
                      type="button"
                      onClick={handleCompactHeaderNameClick}
                      className="min-w-0 text-balance text-left text-[2.5rem] font-black leading-[0.94] tracking-tight text-foreground transition-colors hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:text-[2.8rem]"
                    >
                      {displayName}
                    </button>
                  </div>
                  <ResponsivePopover
                    open={isCompactYearMenuOpen}
                    onOpenChange={setIsCompactYearMenuOpen}
                    align="end"
                    mobileSide="bottom"
                    className="min-h-0 max-h-[70vh] sm:w-auto sm:p-0"
                    trigger={
                      <button
                        type="button"
                        aria-label={copy.selectYear}
                        className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-sm font-semibold text-foreground tabular-nums transition-colors hover:bg-muted/70 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                      >
                        <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span>{selectedYear}</span>
                        <ChevronDown className="h-3 w-3 shrink-0" aria-hidden="true" />
                      </button>
                    }
                    content={
                      <ChallengeEntityYearMenu
                        title={copy.yearMenuTitle}
                        years={availableYears}
                        selectedYear={selectedYear}
                        onYearChange={handleCompactYearSelection}
                      />
                    }
                  />
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
            <div>
              <h1 className="text-balance text-[3rem] font-black leading-[0.94] tracking-tight text-foreground md:text-[2.85rem] lg:text-5xl">
                {displayName}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {showInflationBadge ? (
                <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                  {inflationBadgeLabel}
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

          <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 md:flex-col md:items-end md:gap-3">
            <ResponsivePopover
              open={isViewMenuOpen}
              onOpenChange={setIsViewMenuOpen}
              align="end"
              mobileSide="bottom"
              className="min-h-0 max-h-[70vh] sm:w-auto sm:p-0"
              trigger={
                <button
                  type="button"
                  aria-label={copy.openViewMenu}
                  className="inline-flex min-w-[7.5rem] items-center gap-2 whitespace-nowrap rounded-full border border-border/60 bg-muted/40 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  <ActiveViewIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{activeViewLabel}</span>
                  <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
                </button>
              }
              content={
                <ChallengeEntityViewMenu
                  title={copy.viewMenuTitle}
                  views={availableViews}
                  activeView={activeView}
                  onViewChange={handleViewSelection}
                />
              }
            />

            <ResponsivePopover
              open={isYearMenuOpen}
              onOpenChange={setIsYearMenuOpen}
              align="end"
              mobileSide="bottom"
              className="min-h-0 max-h-[70vh] sm:w-auto sm:p-0"
              trigger={
                <button
                  type="button"
                  aria-label={copy.selectYear}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border/60 bg-muted/40 px-4 py-2 text-sm font-semibold text-foreground tabular-nums transition-colors hover:bg-muted/70 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{selectedYear}</span>
                  <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
                </button>
              }
              content={
                <ChallengeEntityYearMenu
                  title={copy.yearMenuTitle}
                  years={availableYears}
                  selectedYear={selectedYear}
                  onYearChange={handleYearSelection}
                />
              }
            />
          </div>
        </div>
      </section>
    </>
  )
}
