import { useState, type ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ProcurementLandingFilters } from '@/schemas/procurement-overview'
import { useProcurementLanding } from '../hooks/use-procurement-data'
import { formatFlowCount } from '../lib/formatting'
import {
  procurementHeaderDescriptionClassName,
  procurementHeaderHeroClassName,
  procurementHeaderMetaClassName,
  procurementHeaderStatClassName,
  procurementHeaderStatLabelClassName,
  procurementHeaderStatValueClassName,
  procurementHeaderTitleClassName,
  procurementHeaderTitleStyle,
} from '../lib/procurement-theme'
import { ProcurementInfoSheet } from './procurement-info-sheet'
import { ProcurementTabNav, type ProcurementTab } from './procurement-tab-nav'

type Props = {
  readonly activeTab: ProcurementTab
  readonly children: ReactNode
  readonly actions?: ReactNode
  readonly landingFilters?: ProcurementLandingFilters
}

/** Shared page frame for the procurement hub — parliament-shell rhythm. */
export function ProcurementShell({
  activeTab,
  children,
  actions,
  landingFilters = {},
}: Props) {
  const [infoOpen, setInfoOpen] = useState(false)
  const { data } = useProcurementLanding(landingFilters)

  const buildId = data?.analysisByGrain.directAcquisition.stats.meta.buildId

  return (
    <div className="min-h-screen min-w-0 bg-background">
      <header className="border-b-2 border-[var(--pnrr-border)] bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className={procurementHeaderHeroClassName}>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h1
                  className={procurementHeaderTitleClassName}
                  style={procurementHeaderTitleStyle}
                >
                  {/* One Trans for the whole phrase — splitting it per line
                      produced mixed-language fragments ("Publică procurement");
                      text-balance handles the two-line wrap. */}
                  <Trans>Public procurement</Trans>
                </h1>
                <p
                  className={cn(
                    procurementHeaderDescriptionClassName,
                    'mt-6 sm:mt-8',
                  )}
                >
                  <Trans>
                    Tenders, contracts and direct purchases made by Romanian
                    public institutions — with sources, coverage and honest
                    limits disclosed for every figure.
                  </Trans>
                </p>
                <div className={cn(procurementHeaderMetaClassName, 'mt-4')}>
                  <Trans>Live procurement API</Trans>
                  {buildId ? ` · build ${buildId}` : null}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:pt-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-none border-2"
                  onClick={() => setInfoOpen(true)}
                  aria-label={t`About this data`}
                >
                  <Info className="h-4 w-4" aria-hidden />
                </Button>
                {actions}
              </div>
            </div>

            {data ? (
              <div className="mt-8 flex flex-wrap gap-3">
                {data.headline.recordsCount !== null ? (
                  <div className={procurementHeaderStatClassName}>
                    <span className={procurementHeaderStatValueClassName}>
                      {formatFlowCount(data.headline.recordsCount)}
                    </span>
                    <span className={procurementHeaderStatLabelClassName}>
                      <Trans>records</Trans>
                    </span>
                  </div>
                ) : null}
                {data.headline.buyersCount !== null ? (
                  <div className={procurementHeaderStatClassName}>
                    <span className={procurementHeaderStatValueClassName}>
                      {formatFlowCount(data.headline.buyersCount)}
                    </span>
                    <span className={procurementHeaderStatLabelClassName}>
                      <Trans>public buyers</Trans>
                    </span>
                  </div>
                ) : null}
                {data.headline.suppliersCount !== null ? (
                  <div className={procurementHeaderStatClassName}>
                    <span className={procurementHeaderStatValueClassName}>
                      {formatFlowCount(data.headline.suppliersCount)}
                    </span>
                    <span className={procurementHeaderStatLabelClassName}>
                      <Trans>suppliers</Trans>
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="border-t-2 border-[var(--pnrr-border)]">
            <ProcurementTabNav activeTab={activeTab} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>

      <ProcurementInfoSheet
        open={infoOpen}
        onOpenChange={setInfoOpen}
      />
    </div>
  )
}
