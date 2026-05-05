import { Trans } from '@lingui/react/macro'
import type {
  PnrrWorkerMapSelectionSummary,
  PnrrWorkerProjectRow,
} from '../workers/pnrr-worker-types'
import { PnrrMapDetailsDrawer } from './PnrrMapDetailsDrawer'

interface PnrrCountyDetailsPanelProps {
  readonly county: string | null
  readonly summary?: PnrrWorkerMapSelectionSummary | null | undefined
  readonly projects: readonly PnrrWorkerProjectRow[]
  readonly onClose: () => void
  readonly selectedProjectId?: string
  readonly onProjectClick?: (projectId: string) => void
  readonly onProjectClose?: () => void
  readonly onBeneficiaryClick?: (beneficiary: {
    readonly name: string
    readonly cui: string | null
  }) => void
}

export function PnrrCountyDetailsPanel({
  county,
  summary,
  projects,
  onClose,
  selectedProjectId,
  onProjectClick,
  onProjectClose,
  onBeneficiaryClick,
}: PnrrCountyDetailsPanelProps) {
  const countyProjects = county ? projects : []
  const countyCouncilProject = getCountyCouncilProject(countyProjects, county)
  const hasCountyProjects = (summary?.projectCount ?? countyProjects.length) > 0

  if (!county || !hasCountyProjects) return null

  return (
    <PnrrMapDetailsDrawer
      open={county !== null}
      title={county}
      eyebrow={<Trans>County</Trans>}
      summary={summary}
      projects={countyProjects}
      onClose={onClose}
      selectedProjectId={selectedProjectId}
      onProjectClick={onProjectClick}
      onProjectClose={onProjectClose}
      onBeneficiaryClick={onBeneficiaryClick}
      footerEntityShortcut={
        countyCouncilProject
          ? {
              cui: countyCouncilProject.cui,
              label: countyCouncilProject.beneficiary,
            }
          : undefined
      }
    />
  )
}

function normalizeCountyText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^\dA-Z]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getCountyCouncilProject(
  projects: readonly PnrrWorkerProjectRow[],
  county: string | null,
): PnrrWorkerProjectRow | undefined {
  const normalizedCounty = county ? normalizeCountyText(county) : null
  const countyCouncilProjects = projects.filter(
    (project) => project.cui && project.beneficiaryType === 'county-council',
  )

  return (
    countyCouncilProjects.find((project) =>
      normalizedCounty
        ? normalizeCountyText(project.beneficiary).includes(normalizedCounty)
        : false,
    ) ?? countyCouncilProjects[0]
  )
}
