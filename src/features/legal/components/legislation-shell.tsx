import type { ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import { useLingui } from '@lingui/react'
import { cn } from '@/lib/utils'
import { DataStatusBadge } from '@/components/data-trust'
import type { DataStatus } from '@/schemas/elections'
import type { LegalActCounts } from '@/schemas/legal'
import { formatLegalDate, formatLegalNumber } from '../lib/legal-format'
import {
  legislationHeaderDescriptionClassName,
  legislationHeaderHeroClassName,
  legislationHeaderMetaClassName,
  legislationHeaderStatClassName,
  legislationHeaderStatLabelClassName,
  legislationHeaderStatValueClassName,
  legislationHeaderTitleClassName,
  legislationHeaderTitleLineClassName,
  legislationHeaderTitleStyle,
} from '../lib/legislation-theme'
import { LegislationTabNav, type LegislationTab } from './legislation-tab-nav'
import { LegislationHeaderVisual } from './legislation-header-visual'

type Props = {
  readonly activeTab: LegislationTab
  readonly counts?: LegalActCounts
  readonly measuredAt?: string | null
  /**
   * Trust state for the whole surface. Rendered in the meta line rather than in
   * a coverage ribbon — the ribbon was removed as visual noise, but the
   * mock/live label is a product requirement (DESIGN.md §Mock-First Contract),
   * so it moved here rather than disappearing.
   */
  readonly dataStatus?: DataStatus
  readonly children: ReactNode
}

/**
 * Shared frame for `/legislation` — hero, stat chips, tab nav, content column.
 *
 * Structurally the same as `ParliamentShell`; the skin differs only in accent.
 * Lady Justice and the Palace of Justice provide a distinct legal allegory while
 * preserving Parliament's engraved, right-weighted header language.
 */
export function LegislationShell({
  activeTab,
  counts,
  measuredAt,
  dataStatus,
  children,
}: Props) {
  const { i18n } = useLingui()
  const formatCount = (value: number) => formatLegalNumber(value, i18n.locale)
  const formatDate = (value: string) => formatLegalDate(value, i18n.locale)

  return (
    <div className="min-h-screen min-w-0 bg-background">
      <header className="border-b-2 border-[var(--pnrr-border)] bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className={cn(
              legislationHeaderHeroClassName,
              'relative min-w-0 overflow-hidden xl:min-h-[34rem]',
            )}
          >
            <div className="absolute inset-y-0 right-0 hidden w-[70%] items-end justify-end xl:flex">
              <LegislationHeaderVisual />
            </div>

            <div className="relative z-10 min-w-0 pr-12 xl:max-w-[52%] xl:pr-0">
              <h1
                className={legislationHeaderTitleClassName}
                style={legislationHeaderTitleStyle}
              >
                <span className={legislationHeaderTitleLineClassName}>
                  <Trans>Legislația</Trans>
                </span>
                <span className={legislationHeaderTitleLineClassName}>
                  <Trans>României</Trans>
                </span>
              </h1>

              <p
                className={cn(
                  legislationHeaderDescriptionClassName,
                  'mt-6 sm:mt-8',
                )}
              >
                <Trans>
                  Fiecare lege, ordonanță și hotărâre publicată în România — cu
                  statutul ei actual, ce a modificat, ce a modificat-o și
                  numărul din Monitorul Oficial în care a apărut.
                </Trans>
              </p>

              <div
                className={cn(
                  legislationHeaderMetaClassName,
                  'mt-4 flex flex-wrap items-center gap-x-2 gap-y-1',
                )}
              >
                <span>
                  <Trans>Portal Legislativ și Monitorul Oficial</Trans>
                  {measuredAt ? (
                    <>
                      {' · '}
                      <Trans>date până la {formatDate(measuredAt)}</Trans>
                    </>
                  ) : null}
                </span>
                {dataStatus ? <DataStatusBadge status={dataStatus} /> : null}
              </div>

              {counts ? (
                <div className="mt-8 flex flex-wrap gap-3">
                  <div className={legislationHeaderStatClassName}>
                    <span className={legislationHeaderStatValueClassName}>
                      {formatCount(counts.total)}
                    </span>
                    <span className={legislationHeaderStatLabelClassName}>
                      <Trans>acte</Trans>
                    </span>
                  </div>
                  <div className={legislationHeaderStatClassName}>
                    <span className={legislationHeaderStatValueClassName}>
                      {formatCount(counts.inVigoare)}
                    </span>
                    <span className={legislationHeaderStatLabelClassName}>
                      <Trans>în vigoare</Trans>
                    </span>
                  </div>
                  <div className={legislationHeaderStatClassName}>
                    <span className={legislationHeaderStatValueClassName}>
                      {formatCount(counts.abrogat)}
                    </span>
                    <span className={legislationHeaderStatLabelClassName}>
                      <Trans>abrogate</Trans>
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-t-2 border-[var(--pnrr-border)]">
            <LegislationTabNav activeTab={activeTab} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
