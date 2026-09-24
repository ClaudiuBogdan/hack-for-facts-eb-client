import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Database, MapPin, Plus, X, type LucideIcon } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import { MAX_COMPARISON_TERRITORIES } from '../../lib/comparison-territories'
import { statisticsTheme } from '../../lib/statistics-theme'
import {
  FilterPanelHeader,
  FilterPanelReset,
  FilterPanelSection,
  FilterPanelStatic,
} from '../filter-panel'
import { ComparisonIndicatorPicker, ComparisonPlacePicker, type ComparisonPlaceSuggestion } from './comparison-pickers'

export interface ComparisonRailTerritory {
  readonly token: string
  readonly name: string
  readonly kind: string | null
  readonly color: string
}

/** One of the series' own axes — a classification, the unit, the frequency. */
export interface ComparisonRailAxis {
  readonly id: string
  readonly icon: LucideIcon
  readonly label: string
  readonly value: string
  /** The page chose the value; the address does not pin it. */
  readonly implicit: boolean
  /** Nothing is chosen yet: the comparison waits for it. */
  readonly unresolved: boolean
  /** The axis's options, in place. Null when there is nothing to choose. */
  readonly control: ((onPicked: () => void) => ReactNode) | null
}

const INDICATOR = 'indicator'
const ADD = 'teritoriu-nou'

/**
 * The comparison's selection, as the dataset page's panel: what is compared
 * (the indicator), where (up to six territories, each in its chart colour, so
 * the list is also the legend and always shows), and the series' own axes —
 * one section each, opening onto its options in place, on a phone as on a
 * desk. It used to open a popover per row (a sheet on a phone), with the
 * series' axes folded under „Detaliile seriei" as fields that each opened
 * another popover.
 *
 * Every write keeps the keyboard where it was. A pick closes its section and
 * the focus goes back to the trigger it opened from. Removing a territory
 * moves the focus to the next territory's remove button, the previous one's
 * after the last, or „Adaugă un teritoriu" when none is left — rather than
 * falling to the page top with the button that left.
 */
export function ComparisonRail({
  indicator,
  onSelectIndicator,
  territories,
  suggestions,
  localities,
  onAdd,
  onRemove,
  axes,
  pinCount,
  onReset,
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
  /** The series' own axes; empty until the comparison has read the indicator. */
  readonly axes: readonly ComparisonRailAxis[]
  /** How many of the series' axes the address pins: what the reset drops. */
  readonly pinCount: number
  readonly onReset: () => void
  /** True while the page shows its worked example rather than the reader's selection. */
  readonly example: boolean
}) {
  // Null until the reader opens or closes a section: until then an axis the
  // comparison is waiting on stands open, so the way forward is on screen.
  const [chosen, setChosen] = useState<string | null>(null)
  const waitingOn = axes.find((axis) => axis.unresolved && axis.control)?.id ?? ''
  const open = chosen ?? waitingOn
  const full = territories.length >= MAX_COMPARISON_TERRITORIES
  const selected = new Set(territories.map((territory) => territory.token))
  const triggers = useRef<Map<string, HTMLButtonElement>>(new Map())
  const removeButtons = useRef<Map<string, HTMLButtonElement>>(new Map())
  const addButton = useRef<HTMLButtonElement>(null)
  const triggerRef = (id: string) => (element: HTMLButtonElement | null) => {
    if (element) triggers.current.set(id, element)
    else triggers.current.delete(id)
  }

  // The focus moves inside the click, before the router commits the new
  // address: a focused element that unmounts drops the focus to the page.
  const closeAfterPick = (id: string) => {
    setChosen('')
    triggers.current.get(id)?.focus()
  }
  // Rows are keyed by token, so a neighbour's button — and the add button,
  // which a removal never hides — survives the reload.
  const removeTerritory = (index: number, token: string) => {
    const neighbour = territories[index + 1] ?? territories[index - 1]
    const target = neighbour ? removeButtons.current.get(neighbour.token) : addButton.current
    target?.focus()
    onRemove(token)
  }
  const addTerritory = (token: string) => {
    setChosen('')
    // The sixth territory hides the add button; the focus goes to the last
    // remove button, which stays.
    const last = territories[territories.length - 1]
    const target = territories.length + 1 >= MAX_COMPARISON_TERRITORIES && last ? removeButtons.current.get(last.token) : addButton.current
    target?.focus()
    onAdd(token)
  }
  const reset = () => {
    // The reset goes with its count; the focus goes to the panel's first section.
    triggers.current.get(INDICATOR)?.focus()
    setChosen('')
    onReset()
  }

  return (
    <section aria-labelledby="comparison-selection-title" className="space-y-3">
      <div className={cn(statisticsTheme.band, 'overflow-hidden')}>
        <FilterPanelHeader title={<Trans>Selecție</Trans>} titleId="comparison-selection-title">
          <span className="flex items-center gap-2">
            {example ? (
              <MonoLabel className="text-primary">
                <Trans>exemplu</Trans>
              </MonoLabel>
            ) : null}
            <FilterPanelReset count={pinCount} onReset={reset} />
          </span>
        </FilterPanelHeader>

        <Accordion type="single" collapsible value={open} onValueChange={setChosen}>
          <FilterPanelSection
            id={INDICATOR}
            icon={Database}
            label={t`Indicator`}
            triggerRef={triggerRef(INDICATOR)}
            detail={indicator.meta}
            value={
              indicator.name ?? (
                indicator.code ? (
                  // The address names the matrix before its name is read: the code is what is known.
                  <span className="font-mono font-normal">{indicator.code}</span>
                ) : (
                  <span className="font-normal text-muted-foreground">{t`Alege un indicator`}</span>
                )
              )
            }
          >
            <ComparisonIndicatorPicker
              selectedCode={indicator.code}
              onSelect={(code) => {
                closeAfterPick(INDICATOR)
                onSelectIndicator(code)
              }}
            />
          </FilterPanelSection>

          {/* The territories are always on screen: the list is the chart's
              legend. Only adding one opens a section. */}
          <div className="border-b border-border/70 last:border-b-0">
            <div className="flex items-start gap-2.5 px-4 pb-1 pt-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className={statisticsTheme.scopeRailLabel}>
                    <Trans>Teritorii</Trans>
                  </h3>
                  <MonoLabel className="tabular-nums text-muted-foreground">
                    {territories.length}/{MAX_COMPARISON_TERRITORIES}
                  </MonoLabel>
                </div>
                {territories.length > 0 ? (
                  <ul className="mt-1 space-y-0.5" aria-label={t`Teritorii comparate`}>
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
                  <p className="mt-1 pb-1 text-sm text-muted-foreground">
                    <Trans>Niciun teritoriu încă.</Trans>
                  </p>
                )}
                {full ? (
                  <p className="pb-2 pt-1 text-xs leading-relaxed text-muted-foreground">
                    <Trans>Ai atins maximul de {MAX_COMPARISON_TERRITORIES} teritorii. Scoate unul ca să adaugi altul.</Trans>
                  </p>
                ) : null}
              </div>
            </div>
            {full ? null : (
              <AccordionItem value={ADD} className="border-0">
                <AccordionTrigger ref={addButton} className={statisticsTheme.scopePanelAdd}>
                  <span className="flex items-center gap-2.5">
                    <Plus className="h-4 w-4 shrink-0" aria-hidden />
                    <Trans>Adaugă un teritoriu</Trans>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-1">
                  <ComparisonPlacePicker
                    selected={selected}
                    suggestions={suggestions}
                    localities={localities}
                    onAdd={addTerritory}
                  />
                </AccordionContent>
              </AccordionItem>
            )}
          </div>

          {axes.map((axis) =>
            axis.control ? (
              <FilterPanelSection
                key={axis.id}
                id={axis.id}
                icon={axis.icon}
                label={axis.label}
                value={axis.value}
                implicit={axis.implicit}
                triggerRef={triggerRef(axis.id)}
              >
                {axis.control(() => closeAfterPick(axis.id))}
              </FilterPanelSection>
            ) : (
              <FilterPanelStatic key={axis.id} icon={axis.icon} label={axis.label} value={axis.value} />
            ),
          )}
        </Accordion>
      </div>

      {example ? (
        <p className="px-1 text-xs leading-relaxed text-muted-foreground">
          <Trans>Un exemplu, ca să vezi cum arată. Schimbă indicatorul sau teritoriile și comparația devine a ta.</Trans>
        </p>
      ) : null}
    </section>
  )
}
