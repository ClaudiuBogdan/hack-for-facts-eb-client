import { Trans } from '@lingui/react/macro'
import type { PnrrProject } from '@/schemas/pnrr'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import { PnrrProjectTable } from '../table/PnrrProjectTable'

export function PnrrProjectsView({
  projects,
  filterState,
}: {
  readonly projects: readonly PnrrProject[]
  readonly filterState: ReturnType<typeof usePnrrFilterState>
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="h-10 w-1.5 bg-[var(--pnrr-blue)]" />
          <h2 className="text-2xl font-black tracking-tight text-[var(--pnrr-fg)]">
            <Trans>Projects</Trans>
          </h2>
          <span className="hidden text-sm text-[var(--pnrr-muted)] sm:inline">
            {projects.length.toLocaleString('ro-RO')} <Trans>projects</Trans>
          </span>
        </div>
      </div>

      <PnrrProjectTable projects={projects} filterState={filterState} />
    </div>
  )
}
