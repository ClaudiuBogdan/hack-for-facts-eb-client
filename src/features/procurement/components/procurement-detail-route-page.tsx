import { Trans } from '@lingui/react/macro'
import { FileQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProcurementRecordDetail } from '@/schemas/procurement'
import { useProcurementRecordDetail } from '../hooks/use-procurement-data'
import { DETAIL_CONFIG, type DetailGrainKey, type DetailRecord } from '../lib/detail-config'
import { procurementSectionClassName } from '../lib/procurement-theme'
import { ProcurementDetailPage } from './procurement-detail-page'
import { ProcurementErrorState } from './procurement-error-state'
import { ProcurementDetailSkeleton } from './procurement-skeletons'

type Props = {
  readonly grain: DetailGrainKey
  readonly id: string
  /**
   * Present only on the server-rendered first paint. On a client-side
   * navigation the loader returns before the API answers, so the query below
   * is the sole source and this is `undefined`.
   */
  readonly initialDetail?: ProcurementRecordDetail<DetailRecord>
}

/**
 * Container for the three record-detail routes. The loaders no longer await
 * their fetch in the browser (it froze the *previous* page for the length of
 * the round-trip), so the states that the route's `notFound`/error boundaries
 * used to cover have to live here instead.
 *
 * "Errored" and "absent" are kept apart on purpose: a failed request is not
 * evidence that the record does not exist, and rendering it as such would
 * assert something about the data that a 500 does not support
 * (`DESIGN.md` §Data Trust & Provenance).
 */
export function ProcurementDetailRoutePage({ grain, id, initialDetail }: Props) {
  const query = useProcurementRecordDetail(grain, id, initialDetail)
  const detail = query.data ?? undefined

  if (query.isPending && !detail) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <ProcurementDetailSkeleton />
      </div>
    )
  }

  if (query.isError && !detail) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <ProcurementErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          isRetrying={query.isRefetching}
        />
      </div>
    )
  }

  if (!detail) {
    return <ProcurementRecordNotFound grain={grain} id={id} />
  }

  return <ProcurementDetailPage grain={grain} detail={detail} />
}

/**
 * The API answered and reported no such record — distinct from the error state
 * above, which means we never got an answer at all.
 */
function ProcurementRecordNotFound({
  grain,
  id,
}: {
  readonly grain: DetailGrainKey
  readonly id: string
}) {
  // Bound to a variable so Lingui extracts a named placeholder rather than
  // inlining a call expression into the message.
  const recordLabel = DETAIL_CONFIG[grain].pageLabel()

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div
        role="status"
        className={cn(procurementSectionClassName, 'p-6 text-center sm:p-8')}
      >
        <FileQuestion
          className="mx-auto h-6 w-6 text-[var(--pnrr-muted)]"
          aria-hidden
        />
        <p className="mt-3 text-base font-bold text-[var(--pnrr-fg)]">
          <Trans>This record could not be found</Trans>
        </p>
        <p className="mt-1 text-sm text-[var(--pnrr-muted)]">
          <Trans>
            No {recordLabel} with the identifier {id} exists in the published
            data.
          </Trans>
        </p>
      </div>
    </div>
  )
}
