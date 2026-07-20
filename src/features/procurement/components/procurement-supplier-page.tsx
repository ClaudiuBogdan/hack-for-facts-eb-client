import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProcurementSupplierSlice } from '../hooks/use-procurement-data'
import {
  procurementSectionLabelClassName,
  procurementUnderlineLinkClassName,
} from '../lib/procurement-theme'
import { ProcurementSupplierSlice } from './procurement-supplier-slice'
import { ProcurementErrorState } from './procurement-error-state'
import { ProcurementDetailSkeleton } from './procurement-skeletons'

type Props = {
  readonly cui: string
  readonly className?: string
}

/** Dedicated supplier profile under `/procurement/suppliers/$cui`. */
export function ProcurementSupplierPage({ cui, className }: Props) {
  const query = useProcurementSupplierSlice(cui)

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
          <Trans>Supplier</Trans>
        </span>
      </nav>

      {query.isPending ? (
        <ProcurementDetailSkeleton />
      ) : query.isError && !query.data ? (
        <ProcurementErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          isRetrying={query.isRefetching}
        />
      ) : (
        <>
          <header className="space-y-2">
            <div className={procurementSectionLabelClassName}>
              <Trans>Public-sector supplier</Trans>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--pnrr-fg)] sm:text-4xl">
              <Trans>Supplier CUI {cui}</Trans>
            </h1>
            <p className="text-sm text-[var(--pnrr-muted)]">
              <Trans>
                Public revenue from procurement contracts and direct
                acquisitions — not company turnover.
              </Trans>
            </p>
            <Link
              to="/companies/$cui"
              params={{ cui }}
              className={procurementUnderlineLinkClassName}
            >
              <Trans>Open company profile</Trans>
            </Link>
          </header>

          <ProcurementSupplierSlice supplierCui={cui} />
        </>
      )}
    </div>
  )
}
