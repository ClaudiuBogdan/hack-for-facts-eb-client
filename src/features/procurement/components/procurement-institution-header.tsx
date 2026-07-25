import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { ChevronRight, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  procurementHeaderEntityTitleStyle,
  procurementHeaderTitleClassName,
  procurementCompactActionClassName,
  procurementSectionLabelClassName,
} from '../lib/procurement-theme'
import {
  stickyCompactBarPositionClassName,
  useStickyCompactHeader,
} from '../hooks/use-sticky-compact-header'

type Props = {
  readonly cui: string
  readonly title: string
  /** Activity window from the unfiltered slice, as a header stat. */
  readonly firstSeen: string | null
  readonly lastSeen: string | null
  /**
   * The selected population's anchor money, with the basis that makes it
   * meaningful. Omitted for populations that carry no summable money, and for
   * empty ones — "indisponibil" there would claim a gate hid something that
   * simply does not exist for this buyer.
   */
  readonly valueStat?: { readonly value: string; readonly label: string } | null
  /** The quick-filter row — rendered in the header AND in the sticky bar. */
  readonly filters?: ReactNode
  /**
   * Population tabs, flush with the header's bottom rule so the active
   * indicator sits ON it — the hub's tab anatomy.
   */
  readonly tabs?: ReactNode
  /** Compact copy of the same tabs for the sticky bar — the reader must be able
   *  to see AND change the population without scrolling back up. */
  readonly compactTabs?: ReactNode
  readonly onOpenMethodology: () => void
}

function activityYears(
  firstSeen: string | null,
  lastSeen: string | null,
): string | null {
  const first = firstSeen?.slice(0, 4)
  const last = lastSeen?.slice(0, 4)
  if (!first && !last) return null
  if (!first || !last) return (first ?? last) as string
  return first === last ? first : `${first}–${last}`
}

/**
 * Institution profile header — the hub's rhythm (hero title, inline stat
 * chips, actions, filter toolbar) rather than the hub's own shell, because
 * this page has no Overview/List/Rankings tabs to carry.
 *
 * No money figure lives up here: every population's value is in the table
 * below, with the basis that makes it meaningful attached to it. A single
 * headline number could only ever repeat one row while implying it was the
 * page's total.
 */
export function ProcurementInstitutionHeader({
  cui,
  title,
  firstSeen,
  lastSeen,
  valueStat,
  filters,
  tabs,
  compactTabs,
  onOpenMethodology,
}: Props) {
  const { headerRef, isCompactVisible, hasMounted, isMobile, sidebarState } =
    useStickyCompactHeader({ enabled: true })
  const years = activityYears(firstSeen, lastSeen)

  const actions = (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        type="button"
        variant="outline"
        asChild
        className={cn(procurementCompactActionClassName)}
      >
        <Link to="/entities/$cui" params={{ cui }}>
          <Trans>Profil</Trans>
        </Link>
      </Button>
      <Button
        type="button"
        variant="outline"
        asChild
        className={cn(procurementCompactActionClassName)}
      >
        <Link to="/procurement" search={{ view: 'list', authority_cui: cui }}>
          <Trans>Înregistrări</Trans>
        </Link>
      </Button>
      {/* Quiet utility, same slot the hub gives it. */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-none text-[var(--pnrr-muted)] hover:bg-[var(--pnrr-subtle)] hover:text-[var(--pnrr-fg)]"
        onClick={onOpenMethodology}
        aria-label={t`Cum sunt calculate sumele`}
      >
        <Info className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  )

  return (
    <>
      {hasMounted ? (
        <div
          aria-hidden={!isCompactVisible}
          inert={!isCompactVisible ? true : undefined}
          className={cn(
            'fixed top-0 z-30 border-b-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)]/90 backdrop-blur-md transition-[transform,opacity] duration-200 ease-out',
            isCompactVisible
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none -translate-y-full opacity-0',
            stickyCompactBarPositionClassName({ isMobile, sidebarState }),
          )}
        >
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-1.5 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="max-w-[10rem] shrink-0 truncate text-sm font-black tracking-tight text-[var(--pnrr-fg)] transition-colors hover:text-[var(--pnrr-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] sm:max-w-xs"
              title={title}
            >
              {title}
            </button>
            {compactTabs ? (
              <div className="min-w-0 flex-1">{compactTabs}</div>
            ) : null}
          </div>
          {filters ? (
            <div className="mx-auto max-w-7xl border-t-2 border-[var(--pnrr-border)] px-4 py-1.5 sm:px-6 lg:px-8">
              {filters}
            </div>
          ) : null}
        </div>
      ) : null}

      <header
        ref={headerRef}
        className="relative border-b-2 border-[var(--pnrr-border)] bg-background"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Identity band: where you are, who this is, what it amounts to —
              and the two ways out. Actions sit up here so the figures below
              are the only thing competing for the reader's eye. */}
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 pt-4">
            <nav
              aria-label={t`Traseu de navigare`}
              className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-[var(--pnrr-muted)]"
            >
              <Link
                to="/procurement"
                className="underline underline-offset-2 hover:text-[var(--pnrr-fg)]"
              >
                <Trans>Achiziții publice</Trans>
              </Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              <Link
                to="/procurement"
                search={{ view: 'rankings', rank_dim: 'buyer' }}
                className="underline underline-offset-2 hover:text-[var(--pnrr-fg)]"
              >
                <Trans>Instituții</Trans>
              </Link>
            </nav>
            {actions}
          </div>

          <div className="pb-5 pt-3 sm:pb-6 sm:pt-4">
            <div className={procurementSectionLabelClassName}>
              <Trans>Cumpărător public</Trans>
            </div>
            <h1
              className={cn(procurementHeaderTitleClassName, 'mt-1.5')}
              style={procurementHeaderEntityTitleStyle}
            >
              {title}
            </h1>

            {/* Quiet metadata, deliberately NOT boxed: bordered stat tiles read
                as controls next to the bordered year buttons below, and a
                reader could not tell which rectangles were clickable. */}
            <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-[var(--pnrr-muted)]">
              <span>
                <Trans>CUI</Trans>{' '}
                <span className="font-semibold tabular-nums text-[var(--pnrr-fg)]">
                  {cui}
                </span>
              </span>
              {years ? (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    <Trans>activitate</Trans>{' '}
                    <span className="font-semibold tabular-nums text-[var(--pnrr-fg)]">
                      {years}
                    </span>
                  </span>
                </>
              ) : null}
              {valueStat ? (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    <span className="text-base font-bold tabular-nums text-[var(--pnrr-fg)]">
                      {valueStat.value}
                    </span>{' '}
                    {valueStat.label}
                  </span>
                </>
              ) : null}
            </p>

            {filters ? <div className="mt-5">{filters}</div> : null}
          </div>

          {tabs ? (
            // `overflow-hidden` here would clip the active tab's indicator,
            // which deliberately hangs 2px below the strip to land ON the
            // header's bottom rule.
            <div className="min-w-0 pt-2">{tabs}</div>
          ) : null}
        </div>
      </header>
    </>
  )
}
