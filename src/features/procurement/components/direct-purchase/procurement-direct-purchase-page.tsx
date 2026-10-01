import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { FileQuestion } from 'lucide-react'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HubLoadError, HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { useWarmRouteCode } from '@/hooks/use-warm-route-code'
import { useProcurementDirectPurchase, useProcurementDirectPurchaseContext } from '../../hooks/use-procurement-direct-purchase'
import { dayOf, redoOf, type DirectPurchase, type DpContext } from '../../lib/direct-purchase-model'
import { buildDirectPurchaseDocumentTitle } from '../../lib/procurement-page-titles'
import { DirectPurchaseBlock } from './direct-purchase-block'
import { DirectPurchaseContextBand } from './direct-purchase-context'
import { DirectPurchaseHead, DirectPurchaseHeadPending, DirectPurchaseHeadShell } from './direct-purchase-head'

/**
 * One direct purchase (`/procurement/direct-acquisitions/$id`), as a record
 * sheet (`design.md` §16): the head (how it ended, what, from whom, for how
 * much, when), the purchase (the institution's words, the value beside its
 * facts, the lines, the steps, delivery and payment, the source), and after
 * it, in its own tinted band, the context — the other purchases between the
 * two.
 */

export interface ProcurementDirectPurchaseInitialData {
  readonly id: string
  /** `null`: SEAP has no such record. Absent: not read on the server (a client-side navigation, or a failed read). */
  readonly purchase?: DirectPurchase | null
  /** `null`: the purchase has no context to read. */
  readonly context?: DpContext | null
}

export function ProcurementDirectPurchasePage({ id, initialData }: { readonly id: string; readonly initialData?: ProcurementDirectPurchaseInitialData }) {
  const query = useProcurementDirectPurchase(id, initialData?.id === id ? initialData.purchase : undefined)
  const purchase = query.data
  useClientDocumentTitle(buildDirectPurchaseDocumentTitle({ id, title: purchase?.title, authorityName: purchase?.authority.name }))
  // Where a purchase mostly leads: the institution's page, the firm's.
  useWarmRouteCode('/procurement/institutions/$cui')
  useWarmRouteCode('/procurement/suppliers/$cui')

  if (purchase) return <DirectPurchaseSheet purchase={purchase} initialContext={initialData?.id === id ? (initialData.context ?? undefined) : undefined} />
  if (purchase === null) return <DirectPurchaseMissing id={id} />
  return (
    <div className="bg-background">
      <DirectPurchaseHeadPending>
        {query.isError ? (
          <div className="mt-8">
            <HubLoadError onRetry={() => void query.refetch()} />
          </div>
        ) : null}
      </DirectPurchaseHeadPending>
      {query.isError ? null : (
        <RuledFrame className="py-14">
          <HubPending rows={8} />
        </RuledFrame>
      )}
    </div>
  )
}

function DirectPurchaseSheet({ purchase, initialContext }: { readonly purchase: DirectPurchase; readonly initialContext?: DpContext }) {
  const contextQuery = useProcurementDirectPurchaseContext(purchase, initialContext)
  const context = contextQuery.data ?? null
  const day = dayOf(purchase)
  return (
    <div className="bg-background">
      <DirectPurchaseHead purchase={purchase} redo={redoOf(purchase, context)} />
      <RuledFrame className="py-10 sm:py-14">
        <DirectPurchaseBlock purchase={purchase} year={context?.year ?? (day ? Number(day.slice(0, 4)) : null)} />
      </RuledFrame>
      <DirectPurchaseContextBand purchase={purchase} context={{ data: contextQuery.data, isError: contextQuery.isError, retry: () => void contextQuery.refetch() }} />
    </div>
  )
}

/** The API answered and has no such record — distinct from a failed read, which says nothing about the record. */
function DirectPurchaseMissing({ id }: { readonly id: string }) {
  return (
    <div className="bg-background">
      <DirectPurchaseHeadShell>
        <div role="status" className="mt-8 max-w-[60ch]">
          <FileQuestion className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-lg font-semibold text-foreground">
            <Trans>Achiziția nu a fost găsită</Trans>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t`SEAP nu are o achiziție directă cu identificatorul ${id} în datele publicate.`}</p>
        </div>
      </DirectPurchaseHeadShell>
    </div>
  )
}

