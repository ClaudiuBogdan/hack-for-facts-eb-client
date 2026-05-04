import { Trans } from '@lingui/react/macro'
import { usePnrrCurrency } from '../lib/usePnrrCurrency'
import { formatPnrrCurrency } from '../lib/formatting'
import type { PnrrProject } from '@/schemas/pnrr'
import type { usePnrrFilterState } from '../hooks/usePnrrFilterState'
import { PnrrProjectDrawer } from './table/PnrrProjectDrawer'
import { usePnrrProjectDetail } from '../hooks/usePnrrData'
import type { PnrrWorkerProjectRow } from '../workers/pnrr-worker-types'

interface PnrrProjectsPreviewProps {
  readonly projects: readonly PnrrWorkerProjectRow[]
  readonly projectCount: number
  readonly filterState: ReturnType<typeof usePnrrFilterState>
}

export function PnrrProjectsPreview({
  projects,
  projectCount,
  filterState,
}: PnrrProjectsPreviewProps) {
  const currency = usePnrrCurrency()
  const topProjects = projects
  const selectedProjectId =
    filterState.search.panel === 'project'
      ? filterState.search.panelProjectId
      : null
  const { data: selectedProjectResult } = usePnrrProjectDetail(selectedProjectId)
  const selectedProject = selectedProjectResult?.project ?? null

  if (topProjects.length === 0) return null

  return (
    <section className="flex min-w-0 flex-col h-full">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-y-2">
        <div className="flex min-w-0 items-center gap-4">
          <span className="h-8 w-1.5 bg-[var(--pnrr-blue)]" />
          <h2 className="text-2xl font-black tracking-tight text-[var(--pnrr-fg)]">
            <Trans>Projects</Trans>
          </h2>
          <span className="hidden text-sm text-[var(--pnrr-muted)] sm:inline">
            {projectCount.toLocaleString('ro-RO')} <Trans>in total</Trans>
          </span>
        </div>
        <button
          onClick={() => filterState.setView('projects')}
          className="group inline-flex shrink-0 items-center gap-2 text-sm font-black uppercase tracking-wide text-[var(--pnrr-fg)] transition-colors hover:text-[var(--pnrr-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
        >
          <Trans>View all projects</Trans>
          <span className="transition-transform group-hover:translate-x-1">
            →
          </span>
        </button>
      </div>

      {/* List container */}
      <div
        className="flex-1 overflow-auto border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]"
        style={{ borderRadius: '6px' }}
      >
        <div className="divide-y-2 divide-[var(--pnrr-border)]">
          {topProjects.map((project) => (
            <button
              key={project.id}
              onClick={() => filterState.openProjectPanel(project.id)}
              className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
            >
              {/* Left: Title + meta */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-black text-[var(--pnrr-fg)]">
                  {project.title}
                </p>
                <p className="truncate text-sm text-[var(--pnrr-muted)]">
                  {project.beneficiary} · {project.county}
                </p>
              </div>

              {/* Right: Value + indicator */}
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-base font-black tabular-nums text-[var(--pnrr-fg)]">
                  {formatPnrrCurrency(project.totalValueEur ?? project.valueEur, currency)}
                </span>
                <StatusSquare status={project.status} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <PnrrProjectDrawer
        project={selectedProject}
        onClose={filterState.closePanel}
      />
    </section>
  )
}

function StatusSquare({ status }: { readonly status: PnrrProject['status'] }) {
  const color =
    status === 'completed'
      ? 'var(--pnrr-green)'
      : status === 'advanced'
        ? 'var(--pnrr-blue)'
        : status === 'mid-progress'
          ? 'var(--pnrr-orange)'
          : status === 'under-30'
            ? 'var(--pnrr-red)'
            : status === 'not-started'
              ? 'var(--pnrr-muted)'
              : '#d4d4d4'

  return (
    <span
      className="h-3 w-3 shrink-0"
      style={{ backgroundColor: color }}
      title={status}
    />
  )
}
