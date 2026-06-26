import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Button } from '@/components/ui/button'
import { AbsorptionBar } from './AbsorptionBar'
import { AmountWithEvidence } from './AmountWithEvidence'
import { ProgramChip } from './ProgramChip'
import { StageBadge } from './StageBadge'
import type { EvidenceRef, ObjectiveSummary } from '../lib/types'

type Props = {
  readonly objective: ObjectiveSummary
  readonly onEvidenceOpen: (evidenceRef: EvidenceRef) => void
}

export function ObjectiveListRow({ objective, onEvidenceOpen }: Props) {
  return (
    <article className="rounded-md border bg-card p-4 text-card-foreground shadow-xs">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <ProgramChip program={objective.program} />
            <StageBadge stage={objective.stage.bucket} raw={objective.stage.raw} />
            <span className="text-xs text-muted-foreground">
              {objective.county}
              {objective.uat ? ` · ${objective.uat}` : ''}
            </span>
          </div>
          <h3 className="text-base font-semibold leading-tight">
            <Link
              to="/investitii-publice/obiective/$id"
              params={{ id: objective.objectiveId }}
              className="hover:underline"
            >
              {objective.title}
            </Link>
          </h3>
          <p className="text-sm text-muted-foreground">
            {objective.domain ?? t`Domeniu necunoscut`}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-2 lg:shrink-0">
          <Link to="/investitii-publice/obiective/$id" params={{ id: objective.objectiveId }}>
            {t`Detalii`}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <AmountWithEvidence
          label={t`Contractat`}
          value={objective.contracted}
          evidenceRef={objective.evidenceRef}
          onEvidenceOpen={onEvidenceOpen}
        />
        <AmountWithEvidence
          label={t`Decontat`}
          value={objective.reimbursed}
          evidenceRef={objective.evidenceRef}
          onEvidenceOpen={onEvidenceOpen}
        />
        <AbsorptionBar value={objective.absorptionPct} />
      </div>
    </article>
  )
}
