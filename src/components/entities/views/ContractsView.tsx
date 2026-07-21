import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import type { EntityDetailsData } from '@/lib/api/entities'
import { ProcurementAuthoritySlice } from '@/features/procurement/components/procurement-authority-slice'
import {
  procurementOutlineButtonClassName,
  procurementUnderlineLinkClassName,
} from '@/features/procurement/lib/procurement-theme'
import { cn } from '@/lib/utils'

type Props = {
  readonly entity: EntityDetailsData | null | undefined
}

/**
 * Entity-page procurement view. Replaces the legacy SICAP.ai iframe with the
 * live authority slice and a deep link to the dedicated institution page.
 */
export function ContractsView({ entity }: Readonly<Props>) {
  if (!entity?.cui) {
    return null
  }

  const cui = String(entity.cui).trim()
  if (!cui) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-subtle)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--pnrr-muted)]">
          <Trans>
            Public procurement for this institution — contracts, direct
            acquisitions, suppliers, and CPV categories from SEAP and
            e-licitatie.
          </Trans>
        </p>
        <Button
          variant="outline"
          size="sm"
          className={cn(procurementOutlineButtonClassName, 'shrink-0')}
          asChild
        >
          <Link to="/procurement/institutions/$cui" params={{ cui }}>
            <Trans>Open full procurement profile</Trans>
          </Link>
        </Button>
      </div>

      <ProcurementAuthoritySlice authorityCui={cui} embedded />

      <p className="text-sm">
        <Link
          to="/procurement"
          search={{ view: 'list', authority_cui: cui }}
          className={procurementUnderlineLinkClassName}
        >
          <Trans>Search all records for this institution</Trans>
        </Link>
      </p>
    </div>
  )
}
