import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ChevronDown, Plus, X } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ResponsivePopover } from '@/components/ui/ResponsivePopover'
import { cn } from '@/lib/utils'
import { MAX_COMPARISON_TERRITORIES } from '../../lib/comparison-territories'
import { statisticsTheme } from '../../lib/statistics-theme'
import { ComparisonIndicatorPicker, ComparisonPlacePicker, type ComparisonPlaceSuggestion } from './comparison-pickers'

export interface ComparisonRailTerritory {
  readonly token: string
  readonly name: string
  readonly kind: string | null
  readonly color: string
}

/** The popover's width; the phone sheet spans the screen and must not carry it. */
const POPOVER_CLASS = 'w-[24rem] max-w-[calc(100vw-2rem)] overflow-hidden'

/**
 * The comparison's selection, as the detail page's rail: what is compared
 * (the indicator), where (up to six territories, each in its chart colour,
 * so the list is also the legend) and — folded away until wanted — which of
 * the indicator's series. Every row opens its own picker; on a phone the
 * picker is a sheet, named for what it picks.
 *
 * Removing a territory keeps the keyboard where it was: the focus moves to
 * the next territory's remove button, the previous one's after the last,
 * or „Adaugă un teritoriu" when none is left — rather than falling to the
 * page top with the button that left.
 */
export function ComparisonRail({
  indicator,
  onSelectIndicator,
  territories,
  suggestions,
  localities,
  onAdd,
  onRemove,
  details,
  example,
}: {
  readonly indicator: { readonly code: string | undefined; readonly name: string | null; readonly meta: string | null }
  readonly onSelectIndicator: (code: string) => void
  readonly territories: readonly ComparisonRailTerritory[]
  readonly suggestions: readonly ComparisonPlaceSuggestion[]
  /** False when the indicator has no locality figures. */
  readonly localities: boolean
  readonly onAdd: (token: string) => void
  readonly onRemove: (token: string) => void
  /** The series' own coordinates, unit and frequency; null until the indicator is read. */
  readonly details: {
    readonly summary: string
    readonly defaulted: boolean
    readonly defaultOpen: boolean
    readonly content: ReactNode
  } | null
  /** True while the page shows its worked example rather than the reader's selection. */
  readonly example: boolean
}) {
  const [picking, setPicking] = useState<'indicator' | 'place' | null>(null)
  const full = territories.length >= MAX_COMPARISON_TERRITORIES
  const selected = new Set(territories.map((territory) => territory.token))
  const removeButtons = useRef<Map<string, HTMLButtonElement>>(new Map())
  const addButton = useRef<HTMLButtonElement>(null)
  // The focus moves before the row leaves, inside the click: the router
  // commits the new address after this handler returns, and a focused button
  // that unmounts drops the focus to the page. Rows are keyed by token, so
  // a neighbour's button — and the add button, which a removal never hides —
  // survives the reload.
  const removeTerritory = (index: number, token: string) => {
    const neighbour = territories[index + 1] ?? territories[index - 1]
    const target = neighbour ? removeButtons.current.get(neighbour.token) : addButton.current
    target?.focus()
    onRemove(token)
  }

  return (
    <section aria-labelledby="comparison-selection-title" className="space-y-3">
      <div className={cn(statisticsTheme.band, 'divide-y divide-border/70 overflow-hidden')}>
        <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
          <h2 id="comparison-selection-title" className={statisticsTheme.sectionLabel}>
            <Trans>Selecție</Trans>
          </h2>
          {example ? (
            <MonoLabel className="text-primary">
              <Trans>exemplu</Trans>
            </MonoLabel>
          ) : null}
        </div>

        <ResponsivePopover
          open={picking === 'indicator'}
          onOpenChange={(open) => setPicking(open ? 'indicator' : null)}
          align="start"
          className="p-0"
          popoverClassName={POPOVER_CLASS}
          title={t`Alege un indicator`}
          description={t`Caută în catalogul INS sau alege unul dintre indicatorii des comparați.`}
          trigger={
            <button type="button" className={cn(statisticsTheme.scopeRailRow, 'items-start')}>
              <span className="flex min-w-0 flex-col items-start">
                <span className={statisticsTheme.scopeRailLabel}>
                  <Trans>Indicator</Trans>
                </span>
                <span className={cn(statisticsTheme.scopeRailValue, 'line-clamp-3')}>
                  {indicator.name ??
                    (indicator.code ? (
                      // The address names the matrix before its name is read: the code is what is known.
                      <span className="font-mono font-normal">{indicator.code}</span>
                    ) : (
                      <span className="font-normal text-muted-foreground">{t`Alege un indicator`}</span>
                    ))}
                </span>
                {indicator.meta ? <MonoLabel className="mt-1 text-muted-foreground">{indicator.meta}</MonoLabel> : null}
              </span>
              <ChevronDown className="mt-5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          }
          content={
            <ComparisonIndicatorPicker
              selectedCode={indicator.code}
              onSelect={(code) => {
                setPicking(null)
                onSelectIndicator(code)
              }}
            />
          }
        />

        <div className="px-4 py-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className={statisticsTheme.scopeRailLabel}>
              <Trans>Teritorii</Trans>
            </h3>
            <MonoLabel className="tabular-nums text-muted-foreground">
              {territories.length}/{MAX_COMPARISON_TERRITORIES}
            </MonoLabel>
          </div>
          {territories.length > 0 ? (
            <ul className="mt-1.5 space-y-0.5" aria-label={t`Teritorii comparate`}>
              {territories.map((territory, index) => (
                <li key={territory.token} className="group flex min-h-9 items-center gap-2.5">
                  <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: territory.color }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">
                    {territory.name}
                    {territory.kind ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">{territory.kind}</span> : null}
                  </span>
                  <button
                    type="button"
                    ref={(node) => {
                      if (node) removeButtons.current.set(territory.token, node)
                      else removeButtons.current.delete(territory.token)
                    }}
                    onClick={() => removeTerritory(index, territory.token)}
                    aria-label={t`Scoate ${territory.name} din comparație`}
                    className="-mr-1.5 inline-flex size-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-sm text-muted-foreground">
              <Trans>Niciun teritoriu încă.</Trans>
            </p>
          )}
          {full ? (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              <Trans>Ai atins maximul de {MAX_COMPARISON_TERRITORIES} teritorii. Scoate unul ca să adaugi altul.</Trans>
            </p>
          ) : (
            <ResponsivePopover
              open={picking === 'place'}
              onOpenChange={(open) => setPicking(open ? 'place' : null)}
              align="start"
              className="p-0"
              popoverClassName={POPOVER_CLASS}
              title={t`Adaugă un teritoriu`}
              description={t`Caută o localitate sau un județ, sau alege una dintre sugestii.`}
              trigger={
                <button
                  ref={addButton}
                  type="button"
                  className="-mx-1.5 mt-1 inline-flex min-h-9 items-center gap-1.5 rounded-sm px-1.5 text-sm font-medium text-primary transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  <Trans>Adaugă un teritoriu</Trans>
                </button>
              }
              content={
                <ComparisonPlacePicker
                  selected={selected}
                  suggestions={suggestions}
                  localities={localities}
                  onAdd={(token) => {
                    setPicking(null)
                    onAdd(token)
                  }}
                />
              }
            />
          )}
        </div>

        {details ? (
          <Collapsible defaultOpen={details.defaultOpen}>
            <CollapsibleTrigger className={cn(statisticsTheme.scopeRailRow, 'group')}>
              <span className="flex min-w-0 flex-col items-start">
                <span className={statisticsTheme.scopeRailLabel}>
                  <Trans>Detaliile seriei</Trans>
                </span>
                <span className={cn(statisticsTheme.scopeRailValue, 'font-normal')}>{details.summary}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {details.defaulted ? (
                  <span className="text-xs text-muted-foreground">
                    <Trans>implicit</Trans>
                  </span>
                ) : null}
                <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 pt-1">{details.content}</CollapsibleContent>
          </Collapsible>
        ) : null}
      </div>

      {example ? (
        <p className="px-1 text-xs leading-relaxed text-muted-foreground">
          <Trans>Un exemplu, ca să vezi cum arată. Schimbă indicatorul sau teritoriile și comparația devine a ta.</Trans>
        </p>
      ) : null}
    </section>
  )
}
