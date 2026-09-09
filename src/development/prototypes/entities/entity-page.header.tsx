/**
 * Identity + navigation for the entity page. Owned by the header subagent.
 *
 * The landing hero's discipline on a work surface: a mono eyebrow, a tight
 * headline, quiet metadata, then the controls, then the view rail whose active
 * underline sits on the band's bottom rule. One accent (the active view, the
 * county link), everything else neutral; borders, no shadows, no pills.
 *
 * Nothing here reads `window` during render; the only browser access is the
 * scroll-to-top click handler of the compact bar.
 */
import { Link } from '@tanstack/react-router'
import {
  BarChart3,
  Bell,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  FileText,
  HandCoins,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn, formatNumber } from '@/lib/utils'
import { Frame, LocalDataBadge, MonoLabel } from './entity-page.parts'
import {
  ENTITY_PAGE_VIEW_LABELS,
  ENTITY_PAGE_VIEWS,
  type EntityPagePieceProps,
  type EntityPageView,
} from './entity-page.types'

/** Same icons as the real route's view menu, so the promoted page needs no relearning. */
const VIEW_ICONS: Record<EntityPageView, LucideIcon> = {
  'main-info': LayoutDashboard,
  contracts: FileText,
  commitments: HandCoins,
  ins: BarChart3,
  profile: Building2,
}

const NORMALIZATION_OPTIONS = [
  { value: 'total', label: 'Total' },
  { value: 'per_capita', label: 'Pe locuitor' },
] as const

/** `MUNICIPIUL CLUJ-NAPOCA` → `Municipiul Cluj-Napoca` (ported from the current header, Romanian-only here). */
function normalizeDisplayText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('ro-RO')
    .replace(
      /(^|[\s-])(\p{L})/gu,
      (_match, prefix: string, character: string) => `${prefix}${character.toLocaleUpperCase('ro-RO')}`,
    )
}

/** The bordered, square-cornered control shared by the period trigger and the toggle. */
const CONTROL_FRAME = 'h-9 rounded-md border border-input bg-background text-sm shadow-none'

/** The full-size header: name, kind, place, view navigation, period control. */
export function EntityPageHeader({ data, state, onStateChange }: EntityPagePieceProps) {
  const [isPeriodOpen, setIsPeriodOpen] = useState(false)
  const { entity, period } = data
  const displayName = normalizeDisplayText(entity.name)
  const countyName = entity.uat?.county_name?.trim() || null
  const countyEntity = entity.uat?.county_entity ?? null
  const population = entity.uat?.population ?? null
  const address = entity.address?.trim() || null
  const isUat = Boolean(entity.is_uat)
  const hasMeta = population !== null || countyEntity !== null
  // The fixture is static: the label describes the period it carries, so a
  // year picked from the list that the fixture does not cover is shown bare.
  const periodLabel = state.year === period.year ? period.label : String(state.year)
  const years = [...period.availableYears].sort((a, b) => b - a)

  return (
    <div className="pt-8 sm:pt-10">
      {/* Eyebrow: what kind of thing this is, where, and its identifier. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <MonoLabel className="text-muted-foreground">
          {data.entityKindLabel}
          {countyName ? <> · Jud. {countyName}</> : null}
          {' · CUI '}
          <span className="tabular-nums">{entity.cui}</span>
        </MonoLabel>
        {data.source === 'local' ? <LocalDataBadge /> : null}
      </div>

      <h1 className="mt-3 max-w-4xl text-balance break-words text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
        {displayName}
      </h1>

      {hasMeta ? (
        <p className="mt-3 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
          {population !== null ? (
            <span>
              <span className="tabular-nums text-foreground">{formatNumber(population)}</span> locuitori
            </span>
          ) : null}
          {population !== null && countyEntity ? <span aria-hidden="true">·</span> : null}
          {countyEntity ? (
            <Link
              to="/entities/$cui"
              params={{ cui: countyEntity.cui }}
              preload="intent"
              className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary hover:decoration-current"
            >
              {normalizeDisplayText(countyEntity.name)}
            </Link>
          ) : null}
        </p>
      ) : null}
      {address ? <p className="mt-1 text-xs text-muted-foreground">{address}</p> : null}

      {/* Controls: which period, in which unit, and the follow action. */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Popover open={isPeriodOpen} onOpenChange={setIsPeriodOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Perioada: ${periodLabel}. Alege anul`}
              className={cn(CONTROL_FRAME, 'gap-2 px-3 font-medium tabular-nums')}
            >
              <Calendar aria-hidden="true" />
              <span>{periodLabel}</span>
              <ChevronDown aria-hidden="true" className="text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-44 rounded-md p-1 shadow-md">
            <MonoLabel className="block px-2 pb-1.5 pt-1.5 text-muted-foreground">Anul de raportare</MonoLabel>
            <ul className="border-t pt-1">
              {years.map((year) => {
                const isCurrent = year === state.year
                return (
                  <li key={year}>
                    <button
                      type="button"
                      aria-current={isCurrent ? 'true' : undefined}
                      onClick={() => {
                        onStateChange({ year })
                        setIsPeriodOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm tabular-nums transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-hidden',
                        isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {year}
                      {isCurrent ? <Check aria-hidden="true" className="size-4 text-primary" /> : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          </PopoverContent>
        </Popover>

        {isUat ? (
          <div role="group" aria-label="Normalizare" className={cn(CONTROL_FRAME, 'inline-flex overflow-hidden')}>
            {NORMALIZATION_OPTIONS.map((option, index) => {
              const isPressed = state.normalization === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isPressed}
                  onClick={() => onStateChange({ normalization: option.value })}
                  className={cn(
                    'inline-flex h-full items-center px-3 font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring',
                    index > 0 && 'border-l border-input',
                    isPressed
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground',
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(CONTROL_FRAME, 'ml-auto gap-2 px-3 font-medium')}
        >
          <Bell aria-hidden="true" />
          Urmărește
        </Button>
      </div>
      <MonoLabel className="mt-2.5 block leading-relaxed text-muted-foreground">{period.provenance}</MonoLabel>

      {/* The view rail. Bleeds to the frame's side rules; the active underline
          overlaps the band's bottom rule by one pixel (`-mb-px`), so it reads
          as sitting on the line rather than floating above it. On phones the
          rail scrolls sideways and the inner padding leaves the cut-off item
          visible as the hint that there is more. */}
      <nav
        aria-label="Vizualizări"
        className="-mx-5 -mb-px mt-6 snap-x overflow-x-auto px-5 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mt-8"
      >
        <ul className="flex w-max min-w-full">
          {ENTITY_PAGE_VIEWS.map((view) => {
            const Icon = VIEW_ICONS[view]
            const isActive = view === state.view
            return (
              <li key={view} className="shrink-0 snap-start">
                <button
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onStateChange({ view })}
                  className={cn(
                    'inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors first:pl-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                    isActive
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  {ENTITY_PAGE_VIEW_LABELS[view]}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

export type EntityPageCompactHeaderProps = EntityPagePieceProps & {
  /** The layout decides when the bar is shown (a sentinel after the hero); the bar only draws itself. */
  readonly visible: boolean
}

/**
 * The compact bar that pins to the top once the full header scrolls away.
 *
 * Positioned absolutely so the layout's sticky wrapper keeps zero height: a
 * bar with height while hidden would push the hero down, and one that grew
 * into view would shift the whole page under the reader's finger. Hidden, it
 * is translated up, invisible, inert and out of the accessibility tree.
 */
export function EntityPageCompactHeader({ data, state, onStateChange, visible }: EntityPageCompactHeaderProps) {
  const displayName = normalizeDisplayText(data.entity.name)
  const periodLabel = state.year === data.period.year ? data.period.label : String(state.year)

  const scrollToTop = () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
  }

  return (
    <div
      data-visible={visible}
      aria-hidden={!visible}
      inert={visible ? undefined : true}
      className={cn(
        'absolute inset-x-0 top-0 border-b bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/75',
        'transition-[translate,opacity,visibility] duration-200 ease-out motion-reduce:transition-none',
        'data-[visible=false]:pointer-events-none data-[visible=false]:invisible data-[visible=false]:-translate-y-full data-[visible=false]:opacity-0',
      )}
    >
      <Frame>
        <div className="flex h-11 items-center gap-3">
          <button
            type="button"
            onClick={scrollToTop}
            aria-label={`${displayName} — înapoi sus`}
            className="max-w-[55%] shrink-0 truncate text-sm font-semibold tracking-tight text-foreground transition-colors hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring lg:max-w-none"
          >
            {displayName}
          </button>
          {/* The period first: it is the cheaper of the two to keep whole when the row truncates on a phone. */}
          <MonoLabel className="min-w-0 truncate text-muted-foreground">
            {periodLabel}
            <span className="lg:hidden"> · {ENTITY_PAGE_VIEW_LABELS[state.view]}</span>
          </MonoLabel>
          <nav aria-label="Vizualizări" className="ml-auto hidden lg:block">
            <ul className="flex items-center gap-1">
              {ENTITY_PAGE_VIEWS.map((view) => {
                const isActive = view === state.view
                return (
                  <li key={view}>
                    <button
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => onStateChange({ view })}
                      className={cn(
                        'rounded-sm px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                        isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {ENTITY_PAGE_VIEW_LABELS[view]}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      </Frame>
    </div>
  )
}
