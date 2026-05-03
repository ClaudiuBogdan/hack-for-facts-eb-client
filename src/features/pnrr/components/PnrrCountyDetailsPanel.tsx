import { Trans } from '@lingui/react/macro'
import type { PnrrProject } from '@/schemas/pnrr'
import { PnrrMapDetailsDrawer } from './PnrrMapDetailsDrawer'

interface PnrrCountyDetailsPanelProps {
  readonly county: string | null
  readonly projects: readonly PnrrProject[]
  readonly onClose: () => void
  readonly onBeneficiaryClick?: (beneficiary: {
    readonly name: string
    readonly cui: string | null
  }) => void
}

export function PnrrCountyDetailsPanel({
  county,
  projects,
  onClose,
  onBeneficiaryClick,
}: PnrrCountyDetailsPanelProps) {
  const countyProjects = county
    ? projects.filter((project) => project.county === county)
    : []
  const countyCouncilProject = getCountyCouncilProject(countyProjects, county)

  if (!county || countyProjects.length === 0) return null

  return (
    <PnrrMapDetailsDrawer
      open={county !== null}
      title={county}
      eyebrow={<Trans>County</Trans>}
      projects={countyProjects}
      onClose={onClose}
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
  projects: readonly PnrrProject[],
  county: string | null,
): PnrrProject | undefined {
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
