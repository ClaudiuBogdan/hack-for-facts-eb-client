import { Trans } from '@lingui/react/macro'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import { PnrrProjectTable } from '../table/PnrrProjectTable'
import { PnrrProjectSearchInput } from '../filters/PnrrProjectSearchInput'
import type { PnrrWorkerProjectPage } from '../../workers/pnrr-worker-types'

export function PnrrProjectsView({
  page,
  projectRecordCount,
  filterState,
  isPageStatePending = false,
}: {
  readonly page: PnrrWorkerProjectPage
  readonly projectRecordCount: number
  readonly filterState: ReturnType<typeof usePnrrFilterState>
  readonly isPageStatePending?: boolean
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="h-10 w-1.5 bg-[var(--pnrr-blue)]" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <h2 className="text-2xl font-black leading-none tracking-tight text-[var(--pnrr-fg)]">
              <Trans>Projects</Trans>
            </h2>
            <span className="hidden leading-none text-sm text-[var(--pnrr-muted)] sm:inline">
              {page.totalCount.toLocaleString('ro-RO')}{' '}
              <Trans>projects</Trans> ·{' '}
              {projectRecordCount.toLocaleString('ro-RO')}{' '}
              <Trans>records</Trans>
            </span>
          </div>
        </div>
      </div>

      <PnrrProjectSearchInput
        filterState={filterState}
        inputId="pnrr-projects-project-search"
        className="max-w-md"
      />

      <PnrrProjectTable
        page={page}
        filterState={filterState}
        isPageStatePending={isPageStatePending}
      />
    </div>
  )
}
