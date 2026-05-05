import { Trans } from '@lingui/react/macro'
import type {
  PnrrWorkerMapSelectionSummary,
  PnrrWorkerProjectRow,
} from '../workers/pnrr-worker-types'
import { PnrrMapDetailsDrawer } from './PnrrMapDetailsDrawer'

interface PnrrUatDetailsPanelProps {
  readonly uatName: string | null
  readonly countyName: string | null
  readonly natcode: string | null
  readonly summary?: PnrrWorkerMapSelectionSummary | null | undefined
  readonly projects: readonly PnrrWorkerProjectRow[]
  readonly onClose: () => void
  readonly selectedProjectId?: string
  readonly onProjectClick?: (projectId: string) => void
  readonly onProjectClose?: () => void
  readonly onBeneficiaryClick?: (beneficiary: { readonly name: string; readonly cui: string | null }) => void
  readonly onViewProjects?: (uat: { readonly siruta: string; readonly name: string }) => void
  readonly onViewBeneficiaries?: (uat: { readonly siruta: string; readonly name: string }) => void
}

export function PnrrUatDetailsPanel({
  uatName,
  countyName,
  natcode,
  summary,
  projects,
  onClose,
  selectedProjectId,
  onProjectClick,
  onProjectClose,
  onBeneficiaryClick,
  onViewProjects,
  onViewBeneficiaries,
}: PnrrUatDetailsPanelProps) {
  const matchedProjects = natcode ? projects : []
  const activeUatProject = getActiveUatProject(matchedProjects, uatName)
  const hasUatProjects = (summary?.projectCount ?? matchedProjects.length) > 0

  if (!natcode || !uatName || !hasUatProjects) return null

  return (
    <PnrrMapDetailsDrawer
      open={uatName !== null}
      title={uatName}
      eyebrow={<Trans>UAT</Trans>}
      description={countyName ?? undefined}
      summary={summary}
      projects={matchedProjects}
      onClose={onClose}
      selectedProjectId={selectedProjectId}
      onProjectClick={onProjectClick}
      onProjectClose={onProjectClose}
      onBeneficiaryClick={onBeneficiaryClick}
      onViewProjects={() => onViewProjects?.({ siruta: natcode, name: uatName })}
      onViewBeneficiaries={() => onViewBeneficiaries?.({ siruta: natcode, name: uatName })}
      footerEntityShortcut={
        activeUatProject
          ? {
              cui: activeUatProject.cui,
              label: activeUatProject.beneficiary,
            }
          : undefined
      }
    />
  )
}

function normalizeUatText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^\dA-Z]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getActiveUatProject(
  projects: readonly PnrrWorkerProjectRow[],
  uatName: string | null
): PnrrWorkerProjectRow | undefined {
  const normalizedUatName = uatName ? normalizeUatText(uatName) : null
  const uatProjects = projects.filter(
    (project) => project.cui && project.beneficiaryType === 'uat'
  )

  return (
    uatProjects.find((project) =>
      normalizedUatName
        ? normalizeUatText(project.beneficiary).includes(normalizedUatName)
        : false
    ) ?? uatProjects[0]
  )
}
