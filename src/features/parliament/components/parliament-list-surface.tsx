import { ChevronRight, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import {
  parliamentListIntroClassName,
  parliamentListMutedClassName,
  parliamentListRuleClassName,
  parliamentListTitleClassName,
} from '../lib/list-surface-theme'

type HeaderProps = {
  readonly title: ReactNode
  /** One or two lines. What the list IS, not how to operate the controls. */
  readonly description: ReactNode
  readonly headingId?: string
  /**
   * Caveats and source links, behind a closed disclosure. These used to sit as
   * purple blocks between the title and the search box on three of the six
   * tabs — read once, then in the way on every visit after that.
   */
  readonly about?: ReactNode
  readonly aboutLabel?: ReactNode
  readonly className?: string
}

/** Title, description, and the optional "despre aceste date" disclosure. */
export function ParliamentListHeader({
  title,
  description,
  headingId,
  about,
  aboutLabel,
  className,
}: HeaderProps) {
  return (
    <header className={cn('max-w-4xl', className)}>
      <h2 id={headingId} className={parliamentListTitleClassName}>
        {title}
      </h2>
      <p className={parliamentListIntroClassName}>{description}</p>
      {about ? (
        <details className="group mt-4">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-[#1d70b8] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] [&::-webkit-details-marker]:hidden">
            <ChevronRight
              aria-hidden
              className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90"
            />
            {aboutLabel ?? <Trans>Despre aceste date și surse</Trans>}
          </summary>
          <div className="mt-3 max-w-3xl border-l-[5px] border-l-[#512178] bg-[#f3f0ff] px-4 py-3 text-sm leading-6 text-[#0b0c0c] dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-fg)]">
            {about}
          </div>
        </details>
      ) : null}
    </header>
  )
}

type ToolbarProps = {
  /** The control row: search, then the sort and filter controls. */
  readonly children: ReactNode
  /** A second row of controls that have no sheet to hide in (chamber pills). */
  readonly secondary?: ReactNode
  /** `ParliamentActiveFilterChips`, or nothing when no filter is on. */
  readonly chips?: ReactNode
  readonly className?: string
}

/**
 * The control row, closed by the rule that separates the tools from the rows
 * they act on.
 */
export function ParliamentListToolbar({
  children,
  secondary,
  chips,
  className,
}: ToolbarProps) {
  return (
    <div
      className={cn(
        'space-y-3 border-b pb-5',
        parliamentListRuleClassName,
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {children}
      </div>
      {secondary}
      {chips}
    </div>
  )
}

export type ParliamentFilterChip = {
  readonly key: string
  readonly label: ReactNode
  /** Overrides the removal button's name when the label is not a plain string. */
  readonly ariaLabel?: string
  readonly onRemove: () => void
}

type ChipsProps = {
  readonly chips: ReadonlyArray<ParliamentFilterChip>
  readonly onClearAll: () => void
  /**
   * A rule the reader needs in order to read the RESULTS correctly while this
   * filter is on — e.g. that a group filter matches the group's majority. It
   * belongs with the chip that caused it, not in the header disclosure, which
   * is closed by default.
   */
  readonly note?: ReactNode
  readonly className?: string
}

/**
 * Active filters, as removable chips.
 *
 * `role="status"` because this IS the summary of what is narrowing the list:
 * a filter applied from a sheet that closes behind it, or from a heatmap
 * square, changes the results with nothing else on screen to say so.
 */
export function ParliamentActiveFilterChips({
  chips,
  onClearAll,
  note,
  className,
}: ChipsProps) {
  if (chips.length === 0) return null

  return (
    <div className={cn('space-y-2', className)} role="status">
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <span
            key={chip.key}
            className="inline-flex max-w-full items-center gap-1.5 border-2 border-[#b1b4b6] bg-[#f3f2f1] px-2.5 py-1 text-sm font-semibold text-[#0b0c0c] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-fg)]"
          >
            <span className="min-w-0 truncate">{chip.label}</span>
            <button
              type="button"
              onClick={chip.onRemove}
              aria-label={
                chip.ariaLabel ??
                (typeof chip.label === 'string'
                  ? t`Elimină filtrul ${chip.label}`
                  : t`Elimină filtrul`)
              }
              className="inline-flex h-4 w-4 shrink-0 items-center justify-center hover:text-[#1d70b8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={onClearAll}
          className="text-sm font-semibold text-[#0b0c0c] underline underline-offset-4 hover:text-[#1d70b8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:text-[var(--pnrr-fg)]"
        >
          <Trans>Șterge filtrele</Trans>
        </button>
      </div>
      {note ? (
        <p className={cn('max-w-3xl', parliamentListMutedClassName)}>{note}</p>
      ) : null}
    </div>
  )
}

type FooterProps = {
  /** How many rows there are, and how many of them are on screen. */
  readonly summary: ReactNode
  /** The pager, or the "load more" button. */
  readonly children?: ReactNode
  readonly className?: string
}

/**
 * The line that closes a list: the count on the left, the way to more of it on
 * the right.
 *
 * The count sits here rather than above the results because it answers a
 * question the reader has AFTER reading the rows — "is this all of it?" — and
 * because a boxed sentence above the list pushed the first row down the page on
 * every one of the six tabs.
 */
export function ParliamentListFooter({
  summary,
  children,
  className,
}: FooterProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between',
        parliamentListRuleClassName,
        className,
      )}
    >
      <p className={parliamentListMutedClassName}>{summary}</p>
      {children ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {children}
        </div>
      ) : null}
    </div>
  )
}
