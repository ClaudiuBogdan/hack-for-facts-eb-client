import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import type { StenogramTocEntry } from '../lib/stenogram-toc'
import {
  stenogramMutedTextClassName,
  stenogramTocClassName,
} from '../lib/stenogram-theme'

type Props = {
  readonly entries: readonly StenogramTocEntry[]
  readonly activePosition: number | undefined
  readonly onSelect: (position: number) => void
  readonly className?: string
}

/**
 * The agenda rail. Rendered as a real `<nav>` + ordered list so the document
 * structure is available to assistive tech, and every entry is a button that
 * moves focus to its block — not just scrolls to it, so keyboard readers land
 * where sighted readers look.
 */
export function ParliamentStenogramToc({
  entries,
  activePosition,
  onSelect,
  className,
}: Props) {
  if (entries.length === 0) {
    return (
      <div className={cn(stenogramTocClassName, className)}>
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
          <Trans>Ordinea de zi</Trans>
        </h2>
        <p className={cn(stenogramMutedTextClassName, 'mt-2')}>
          <Trans>
            Stenograma acestei ședințe nu conține titluri de ordine de zi
            tipărite, așa că nu putem construi un cuprins din ea.
          </Trans>
        </p>
      </div>
    )
  }

  return (
    <nav
      aria-label={t`Ordinea de zi a ședinței`}
      className={cn(stenogramTocClassName, className)}
    >
      <h2 className="text-sm font-bold uppercase tracking-wide text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
        <Trans>Ordinea de zi</Trans>
      </h2>
      <ol className="mt-3 space-y-1">
        {entries.map((entry) => {
          const active = entry.position === activePosition
          return (
            <li key={entry.segmentKey}>
              <button
                type="button"
                onClick={() => onSelect(entry.position)}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'w-full border-l-[3px] px-3 py-1.5 text-left text-sm leading-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]',
                  active
                    ? 'border-l-[#1d70b8] bg-white font-bold text-[#0b0c0c] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)]'
                    : 'border-l-transparent text-[#0b0c0c] hover:bg-white/70 hover:underline dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-card)]/70',
                )}
              >
                <span className="line-clamp-3">{entry.label}</span>
                {entry.speechCount > 0 ? (
                  <span className="mt-0.5 block text-xs tabular-nums text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                    <Trans>{entry.speechCount} luări de cuvânt</Trans>
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
