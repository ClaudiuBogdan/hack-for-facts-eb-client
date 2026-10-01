import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { FileQuestion } from 'lucide-react'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HubLoadError, HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { useWarmRouteCode } from '@/hooks/use-warm-route-code'
import { useProcurementContract, useProcurementContractContext } from '../../hooks/use-procurement-contract'
import type { ContractSheet, CtContext } from '../../lib/contract-model'
import { buildContractDocumentTitle } from '../../lib/procurement-page-titles'
import { ContractBlock } from './contract-block'
import { ContractContextBand } from './contract-context'
import { ContractHead, ContractHeadPending, ContractHeadShell } from './contract-head'

/**
 * One contract award (`/procurement/contracts/$id`), as a record sheet
 * (`design.md` §17): the head (what it is, what, between whom, for how much,
 * when), the contract (the value on its own row, the facts under it, the
 * association's firms, the values SEAP publishes it at, its history, the
 * notice's other contracts, the source), and after it, in its own tinted
 * band, the context — the other contracts between the two.
 */

export interface ProcurementContractInitialData {
  readonly id: string
  /** `null`: SEAP has no such record. Absent: not read on the server (a client-side navigation, or a failed read). */
  readonly contract?: ContractSheet | null
  /** `null`: the contract has no context to read. */
  readonly context?: CtContext | null
}

export function ProcurementContractPage({ id, initialData }: { readonly id: string; readonly initialData?: ProcurementContractInitialData }) {
  const query = useProcurementContract(id, initialData?.id === id ? initialData.contract : undefined)
  const sheet = query.data
  useClientDocumentTitle(buildContractDocumentTitle({ id, title: sheet?.title, authorityName: sheet?.authority.name }))
  // Where a contract mostly leads: the institution's page, the firm's, another contract.
  useWarmRouteCode('/procurement/institutions/$cui')
  useWarmRouteCode('/procurement/suppliers/$cui')

  if (sheet) return <ContractSheetView sheet={sheet} initialContext={initialData?.id === id ? (initialData.context ?? undefined) : undefined} />
  if (sheet === null) return <ContractMissing id={id} />
  return (
    <div className="bg-background">
      <ContractHeadPending>
        {query.isError ? (
          <div className="mt-8">
            <HubLoadError onRetry={() => void query.refetch()} />
          </div>
        ) : null}
      </ContractHeadPending>
      {query.isError ? null : (
        <RuledFrame className="py-14">
          <HubPending rows={8} />
        </RuledFrame>
      )}
    </div>
  )
}

function ContractSheetView({ sheet, initialContext }: { readonly sheet: ContractSheet; readonly initialContext?: CtContext }) {
  const contextQuery = useProcurementContractContext(sheet, initialContext)
  return (
    <div className="bg-background">
      <ContractHead sheet={sheet} />
      <RuledFrame className="py-10 sm:py-14">
        <ContractBlock sheet={sheet} />
      </RuledFrame>
      <ContractContextBand sheet={sheet} context={{ data: contextQuery.data, isError: contextQuery.isError, retry: () => void contextQuery.refetch() }} />
    </div>
  )
}

/** The API answered and has no such record — distinct from a failed read, which says nothing about the record. */
function ContractMissing({ id }: { readonly id: string }) {
  return (
    <div className="bg-background">
      <ContractHeadShell>
        <div role="status" className="mt-8 max-w-[60ch]">
          <FileQuestion className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-lg font-semibold text-foreground">
            <Trans>Contractul nu a fost găsit</Trans>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t`SEAP nu are un contract cu identificatorul ${id} în datele publicate.`}</p>
        </div>
      </ContractHeadShell>
    </div>
  )
}
