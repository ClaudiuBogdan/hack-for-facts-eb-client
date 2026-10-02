import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { FileQuestion } from 'lucide-react'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HubLoadError, HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { useWarmRouteCode } from '@/hooks/use-warm-route-code'
import { useProcurementProcedure } from '../../hooks/use-procurement-procedure'
import type { ProcedureSheet } from '../../lib/procedure-model'
import { buildProcedureDocumentTitle } from '../../lib/procurement-page-titles'
import { ProcedureBlock } from './procedure-block'
import { ProcedureHead, ProcedureHeadPending, ProcedureHeadShell } from './procedure-head'

/**
 * One procedure (`/procurement/procedures/$id`), as a record sheet
 * (`design.md` §22): the head (the route, what, who awarded what to whom,
 * when, for how much, how many offered), then the procedure — the value
 * against the estimate with the facts and the parties beside them, the lots,
 * how the offers were scored, the calendar from the call to the award notice,
 * the contracts, the rows SEAP links here by mistake, the source.
 */

export interface ProcurementProcedureInitialData {
  readonly id: string
  /** `null`: SEAP has no such notice. Absent: not read on the server (a client-side navigation, or a failed read). */
  readonly procedure?: ProcedureSheet | null
}

export function ProcurementProcedurePage({ id, initialData }: { readonly id: string; readonly initialData?: ProcurementProcedureInitialData }) {
  const query = useProcurementProcedure(id, initialData?.id === id ? initialData.procedure : undefined)
  const sheet = query.data
  useClientDocumentTitle(buildProcedureDocumentTitle({ id, title: sheet?.title, noticeNo: sheet?.noticeNo, authorityName: sheet?.authority.name }))
  // Where a procedure mostly leads: its contracts, the institution's page, a firm's.
  useWarmRouteCode('/procurement/contracts/$id')
  useWarmRouteCode('/procurement/institutions/$cui')
  useWarmRouteCode('/procurement/suppliers/$cui')

  if (sheet) {
    return (
      <div className="bg-background">
        <ProcedureHead sheet={sheet} />
        <RuledFrame className="py-10 sm:py-14">
          <ProcedureBlock sheet={sheet} />
        </RuledFrame>
      </div>
    )
  }
  if (sheet === null) return <ProcedureMissing id={id} />
  return (
    <div className="bg-background">
      <ProcedureHeadPending>
        {query.isError ? (
          <div className="mt-8">
            <HubLoadError onRetry={() => void query.refetch()} />
          </div>
        ) : null}
      </ProcedureHeadPending>
      {query.isError ? null : (
        <RuledFrame className="py-14">
          <HubPending rows={8} />
        </RuledFrame>
      )}
    </div>
  )
}

/** The API answered and has no such notice — distinct from a failed read, which says nothing about the record. */
function ProcedureMissing({ id }: { readonly id: string }) {
  return (
    <div className="bg-background">
      <ProcedureHeadShell>
        <div role="status" className="mt-8 max-w-[60ch]">
          <FileQuestion className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-lg font-semibold text-foreground">
            <Trans>Procedura nu a fost găsită</Trans>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t`SEAP nu are o procedură cu identificatorul ${id} în datele publicate.`}</p>
        </div>
      </ProcedureHeadShell>
    </div>
  )
}
