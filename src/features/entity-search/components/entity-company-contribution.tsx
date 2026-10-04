import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { TriangleAlert } from 'lucide-react'
import type {
  EntitySearchCompanyContribution,
  EntitySearchContributionReason,
} from '@/schemas/entity-search'

type Props = {
  readonly contribution: EntitySearchCompanyContribution
  readonly reason: EntitySearchContributionReason | null
}

/** Why no company value is served, in plain words; null when the state says it all. */
function unavailableReasonText(reason: EntitySearchContributionReason | null): string | null {
  switch (reason) {
    case 'no_search':
      return t`Nu s-a efectuat nicio căutare pentru aceste filtre.`
    case 'engine_unavailable':
      return t`Motorul de căutare nu a răspuns.`
    case 'control_missing':
    case 'control_unreadable':
    case 'control_unsupported':
    case 'control_malformed':
    case 'control_incoherent':
      return t`Indexul de căutare nu a putut fi verificat față de ediția registrului comerțului.`
    case 'company_check_unavailable':
      return t`Verificarea de acum nu a putut fi făcută, așa că lipsesc și instituțiile, ONG-urile și celelalte rezultate identificate prin CUI.`
    case 'registry_not_published':
      return t`Ediția registrului comerțului nu este publicată acum.`
    case 'generation_scope_stale':
    case null:
      return null
  }
}

/**
 * The company part of the answer, said plainly for each state (shared-search
 * contract r2 §3). Non-company results keep their own meaning; the note only
 * speaks for companies and for what the counts can be trusted with.
 */
export function EntityCompanyContribution({ contribution, reason }: Props) {
  if (contribution === 'CURRENT') {
    return (
      <p className="text-xs text-[var(--pnrr-muted)]">
        <Trans>
          Firme: la zi. Lista și datele firmelor corespund ediției publicate a
          registrului comerțului.
        </Trans>
      </p>
    )
  }

  const detail = contribution === 'UNAVAILABLE' ? unavailableReasonText(reason) : null
  return (
    <div
      role="status"
      className="flex items-start gap-2 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-4 py-3 text-sm text-[var(--pnrr-fg)]"
    >
      <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-1">
        {contribution === 'PARTIAL' ? (
          <p>
            <Trans>
              Firme: parțial. Datele afișate ale firmelor sunt citite acum, dar
              lista vine dintr-un index construit pentru altă ediție a
              registrului: pot lipsi firme sau pot apărea firme în plus.
              Numărătorile nu sunt afișate.
            </Trans>
          </p>
        ) : (
          <p>
            <Trans>
              Firme: indisponibile. Acum nu se afișează nicio firmă și nicio dată
              de firmă; celelalte rezultate rămân. Lipsa unei firme din listă nu
              înseamnă că ea nu există.
            </Trans>
          </p>
        )}
        {detail ? <p className="text-xs text-[var(--pnrr-muted)]">{detail}</p> : null}
      </div>
    </div>
  )
}
