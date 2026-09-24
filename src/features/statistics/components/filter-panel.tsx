import type { ReactNode, Ref } from 'react'
import { Trans } from '@lingui/react/macro'
import { RotateCcw, type LucideIcon } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { statisticsTheme } from '../lib/statistics-theme'

/**
 * The INS pages' selection panel, in pieces: a header strip, then one
 * accordion section per axis that opens onto its options in place. It is the
 * shape the app's other filter panels have (the entity analytics filter, the
 * chart builder's INS series), with the axis's VALUE in the trigger: on these
 * pages the value on screen, not a count of selections, is what the reader
 * needs. The dataset page and the comparison page both build their panel
 * from these, inside a shadcn `Accordion` of their own.
 */

/** The header strip: the panel's title and, at the far edge, its actions. */
export function FilterPanelHeader({
  title,
  titleId,
  children,
}: {
  readonly title: ReactNode
  readonly titleId?: string
  readonly children?: ReactNode
}) {
  return (
    <div className={statisticsTheme.scopePanelHeader}>
      <h2 id={titleId} className="text-sm font-semibold text-foreground">
        {title}
      </h2>
      {children}
    </div>
  )
}

/**
 * Undo every value the reader chose. Renders nothing at a count of 0 — so
 * the caller moves the focus before it goes (see the pages' reset handlers).
 */
export function FilterPanelReset({
  count,
  onReset,
}: {
  readonly count: number
  readonly onReset: (from: HTMLElement) => void
}) {
  if (count === 0) return null
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto shrink-0 gap-1.5 px-2 py-1 text-xs text-muted-foreground"
      onClick={(event) => onReset(event.currentTarget)}
    >
      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
      <Trans>Resetează ({count})</Trans>
    </Button>
  )
}

type HeadingProps = {
  /** What kind of axis this is, at a glance: a place, a class, a unit, time. */
  readonly icon: LucideIcon
  readonly label: string
  readonly value: ReactNode
  /** A quiet line under the value: a code, a scope. */
  readonly detail?: string | null
}

/** What a section says while closed: the axis's kind, its name, its value. */
function SectionHeading({ icon: Icon, label, value, detail }: HeadingProps) {
  return (
    <span className="flex min-w-0 flex-1 items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col items-start">
        <span className={statisticsTheme.scopeRailLabel}>{label.trim()}</span>
        {/* The value on screen, whoever chose it: the page's own choice and
            the reader's read the same. An axis still to choose says so in
            its own text. */}
        <span className={cn(statisticsTheme.scopePanelValue, 'mt-0.5')}>{value}</span>
        {detail ? <MonoLabel className="mt-1 text-muted-foreground">{detail}</MonoLabel> : null}
      </span>
    </span>
  )
}

/** One axis: a trigger naming it and its value, and its control in place. */
export function FilterPanelSection({
  id,
  ariaLabel,
  triggerRef,
  children,
  ...heading
}: HeadingProps & {
  /** The section's value in the `Accordion` it sits in. */
  readonly id: string
  /** The trigger's name when its text alone would not say it plainly. */
  readonly ariaLabel?: string
  readonly triggerRef?: Ref<HTMLButtonElement>
  readonly children: ReactNode
}) {
  return (
    <AccordionItem value={id} className="border-b border-border/70 last:border-b-0">
      <AccordionTrigger
        ref={triggerRef}
        className={statisticsTheme.scopePanelTrigger}
        aria-label={ariaLabel}
      >
        <SectionHeading {...heading} />
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 pt-1">{children}</AccordionContent>
    </AccordionItem>
  )
}

/**
 * An axis with nothing to choose: its name and value as text. Given a
 * trigger like its neighbours it read as a control that did nothing when
 * pressed.
 */
export function FilterPanelStatic(props: HeadingProps) {
  return (
    <div className={statisticsTheme.scopePanelStatic}>
      <SectionHeading {...props} />
    </div>
  )
}
