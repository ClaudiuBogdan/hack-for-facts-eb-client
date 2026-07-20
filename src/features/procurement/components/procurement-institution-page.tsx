import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AuthorityProcurementSlice } from '@/schemas/procurement'
import { useProcurementAuthoritySlice } from '../hooks/use-procurement-data'
import {
  procurementSectionLabelClassName,
  procurementUnderlineLinkClassName,
} from '../lib/procurement-theme'
import { ProcurementAuthoritySlice } from './procurement-authority-slice'
import { ProcurementErrorState } from './procurement-error-state'
import { ProcurementDetailSkeleton } from './procurement-skeletons'

type Props = {
  readonly cui: string
  readonly initialSlice?: AuthorityProcurementSlice
  readonly className?: string
}

/** Dedicated buyer profile under `/procurement/institutions/$cui`. */
export function ProcurementInstitutionPage({
  cui,
  initialSlice,
  className,
}: Props) {
  const query = useProcurementAuthoritySlice(cui, initialSlice)
  const slice = query.data
  const title =
    slice?.authorityName?.trim() ||
    t`Institution CUI ${cui}`

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8',
        className,
      )}
    >
      <nav
        aria-label={t`Breadcrumb`}
        className="flex flex-wrap items-center gap-1 text-sm text-[var(--pnrr-muted)]"
      >
        <Link
          to="/procurement"
          className="underline underline-offset-2 hover:text-[var(--pnrr-fg)]"
        >
          <Trans>Public procurement</Trans>
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="text-[var(--pnrr-fg)]">
          <Trans>Institution</Trans>
        </span>
      </nav>

      {query.isPending && !slice ? (
        <ProcurementDetailSkeleton />
      ) : query.isError && !slice ? (
        <ProcurementErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          isRetrying={query.isRefetching}
        />
      ) : (
        <>
          <header className="space-y-2">
            <div className={procurementSectionLabelClassName}>
              <Trans>Public buyer</Trans>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--pnrr-fg)] sm:text-4xl">
              {title}
            </h1>
            <p className="text-sm text-[var(--pnrr-muted)]">
              <Trans>CUI: {cui}</Trans>
            </p>
            <Link
              to="/entities/$cui"
              params={{ cui }}
              className={procurementUnderlineLinkClassName}
            >
              <Trans>Open institution profile</Trans>
            </Link>
          </header>

          <ProcurementAuthoritySlice
            authorityCui={cui}
            initialSlice={slice}
          />
        </>
      )}
    </div>
  )
}
