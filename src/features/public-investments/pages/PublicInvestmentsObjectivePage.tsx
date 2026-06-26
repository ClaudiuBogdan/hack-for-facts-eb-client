import { useNavigate } from '@tanstack/react-router'
import { Building2, FileText, Users } from 'lucide-react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AbsorptionBar,
  AmountWithEvidence,
  BlockedDataState,
  DataStatusBadge,
  LoadingRows,
  ProgramChip,
  StageBadge,
  usePublicInvestmentsEvidence,
} from '../components'
import {
  useObjectiveBundle,
  usePaymentsLedgerData,
} from '../hooks/use-public-investments-data'
import {
  cleanObjectiveSearch,
  type ObjectiveTab,
  type PublicInvestmentsObjectiveSearchState,
} from '@/schemas/public-investments'
import {
  identityConfidenceLabel,
  partyRoleLabel,
  sourceKindLabel,
} from '../lib/display'
import type { ContractFact, EvidenceRef, Party, PaymentFact } from '../lib/types'

type Props = {
  readonly objectiveId: string
  readonly search: Partial<PublicInvestmentsObjectiveSearchState>
}

export function PublicInvestmentsObjectivePage({ objectiveId, search }: Props) {
  const navigate = useNavigate({ from: '/investitii-publice/obiective/$id' })
  const bundleQuery = useObjectiveBundle(objectiveId)
  const paymentsQuery = usePaymentsLedgerData(
    objectiveId,
    search.paySort ?? 'date',
    search.payOrder ?? 'asc',
  )
  const { openEvidence } = usePublicInvestmentsEvidence()
  const currentTab = search.tab ?? 'prezentare'

  const setTab = (tab: ObjectiveTab) => {
    void navigate({
      search: (previous) =>
        cleanObjectiveSearch({
          ...previous,
          tab,
        }),
    })
  }

  if (bundleQuery.isLoading) return <LoadingRows rows={3} />
  if (bundleQuery.isBlocked) {
    return (
      <BlockedDataState
        reason={bundleQuery.blockedReason}
        messageKey={bundleQuery.blockedMessageKey}
        messageParams={bundleQuery.blockedMessageParams}
      />
    )
  }
  if (bundleQuery.isError) {
    return (
      <div className="rounded-md border border-destructive/30 p-4 text-sm text-destructive">
        <Trans>Nu am putut încărca obiectivul.</Trans>
      </div>
    )
  }
  if (!bundleQuery.data) return null

  const { objective, contracts, parties, stages } = bundleQuery.data

  return (
    <div className="space-y-6">
      <section className="space-y-4 border-b pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <ProgramChip program={objective.program} />
          <StageBadge stage={objective.stage.bucket} raw={objective.stage.raw} />
          <Badge variant="outline">
            {objective.county}
            {objective.uat ? ` · ${objective.uat}` : ''}
          </Badge>
        </div>
        <DataStatusBadge status={bundleQuery.data.status} />
        <h1 className="max-w-4xl text-2xl font-semibold leading-tight">
          {objective.title}
        </h1>
      </section>

      <Tabs value={currentTab} onValueChange={(value) => setTab(value as ObjectiveTab)}>
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="prezentare">{t`Prezentare`}</TabsTrigger>
          <TabsTrigger value="plati">{t`Plăți`}</TabsTrigger>
          <TabsTrigger value="contract">{t`Contract`}</TabsTrigger>
          <TabsTrigger value="parti">{t`Părți`}</TabsTrigger>
          <TabsTrigger value="dovezi">{t`Dovezi`}</TabsTrigger>
        </TabsList>

        <TabsContent value="prezentare" className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-md border p-4">
              <AmountWithEvidence
                label={t`Contractat`}
                value={objective.contracted}
                evidenceRef={objective.evidenceRef}
                objectiveId={objective.objectiveId}
                onEvidenceOpen={openEvidence}
              />
            </div>
            <div className="rounded-md border p-4">
              <AmountWithEvidence
                label={t`Decontat`}
                value={objective.reimbursed}
                evidenceRef={objective.evidenceRef}
                objectiveId={objective.objectiveId}
                onEvidenceOpen={openEvidence}
              />
            </div>
            <div className="rounded-md border p-4">
              <AbsorptionBar value={objective.absorptionPct} />
            </div>
          </div>
          <div className="rounded-md border p-4">
            <h2 className="mb-2 text-sm font-semibold">
              <Trans>Context</Trans>
            </h2>
            <dl className="grid gap-3 text-sm md:grid-cols-3">
              <InfoItem label={t`Domeniu`} value={objective.domain ?? t`Necunoscut`} />
              <InfoItem label={t`SIRUTA`} value={objective.siruta ?? t`Lipsă`} />
              <InfoItem
                label={t`Încredere identitate`}
                value={identityConfidenceLabel(objective.identityConfidence)}
              />
            </dl>
          </div>
        </TabsContent>

        <TabsContent value="plati" className="space-y-3">
          {paymentsQuery.isLoading && <LoadingRows rows={2} />}
          {paymentsQuery.data?.payments.length === 0 && (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              <Trans>Nu există plăți încărcate pentru acest obiectiv.</Trans>
            </div>
          )}
          {paymentsQuery.data?.payments.map((payment) => (
            <PaymentRow
              key={payment.paymentId}
              payment={payment}
              objectiveId={objective.objectiveId}
              onEvidenceOpen={openEvidence}
            />
          ))}
        </TabsContent>

        <TabsContent value="contract" className="space-y-3">
          {contracts.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              <Trans>Nu există contracte normalizate în fixture.</Trans>
            </div>
          ) : (
            contracts.map((contract) => (
              <ContractRow
                key={contract.contractId}
                contract={contract}
                objectiveId={objective.objectiveId}
                onEvidenceOpen={openEvidence}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="parti" className="space-y-3">
          {parties.map((party) => (
            <PartyRow key={party.partyId} party={party} />
          ))}
        </TabsContent>

        <TabsContent value="dovezi" className="space-y-3">
          {stages.map((stage) => (
            <div key={stage.snapshotId} className="rounded-md border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{stage.raw ?? t`Stadiu necunoscut`}</p>
                  <p className="text-sm text-muted-foreground">{stage.snapshotDate}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEvidence(stage.evidenceRef, objective.objectiveId)}
                >
                  <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                  <Trans>Dovadă</Trans>
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InfoItem({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

function PaymentRow({
  payment,
  objectiveId,
  onEvidenceOpen,
}: {
  readonly payment: PaymentFact
  readonly objectiveId: string
  readonly onEvidenceOpen: (evidenceRef: EvidenceRef, objectiveId?: string) => void
}) {
  return (
    <div className="rounded-md border p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <InfoItem label={t`Data`} value={payment.date ?? t`Nedisponibil`} />
        <AmountWithEvidence
          label={t`Plată`}
          value={payment.reimbursed ?? payment.amount}
          evidenceRef={payment.evidenceRef}
          objectiveId={objectiveId}
          onEvidenceOpen={onEvidenceOpen}
        />
        <AmountWithEvidence
          label={t`Cumulat`}
          value={payment.cumulative}
          evidenceRef={payment.evidenceRef}
          objectiveId={objectiveId}
          onEvidenceOpen={onEvidenceOpen}
        />
      </div>
    </div>
  )
}

function ContractRow({
  contract,
  objectiveId,
  onEvidenceOpen,
}: {
  readonly contract: ContractFact
  readonly objectiveId: string
  readonly onEvidenceOpen: (evidenceRef: EvidenceRef, objectiveId?: string) => void
}) {
  return (
    <div className="rounded-md border p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">{contract.contractNumber ?? t`Contract fără număr`}</p>
          <p className="text-sm text-muted-foreground">{contract.contractDate ?? t`Dată lipsă`}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEvidenceOpen(contract.evidenceRef, objectiveId)}
        >
          <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
          <Trans>Dovadă</Trans>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <PartyInline label={t`Executant`} party={contract.contractor} />
        <PartyInline label={t`Proiectant`} party={contract.designer} />
        <AmountWithEvidence
          label={t`Valoare`}
          value={contract.value}
          evidenceRef={contract.evidenceRef}
          objectiveId={objectiveId}
          onEvidenceOpen={onEvidenceOpen}
        />
      </div>
    </div>
  )
}

function PartyInline({
  label,
  party,
}: {
  readonly label: string
  readonly party: Party | null
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">
        {party?.displayName ?? t`Nume reținut - verificare în curs`}
      </p>
    </div>
  )
}

function PartyRow({ party }: { readonly party: Party }) {
  return (
    <div className="rounded-md border p-4">
      <div className="flex items-start gap-3">
        <Building2 className="mt-1 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="font-medium">
            {party.displayName ?? t`Nume reținut - verificare în curs`}
          </p>
          <p className="text-sm text-muted-foreground">
            <Users className="mr-1 inline h-3 w-3" aria-hidden="true" />
            {partyRoleLabel(party.role)} · {party.cui ?? t`CUI reținut`} ·{' '}
            {sourceKindLabel(party.evidenceRef.sourceUrlKind)}
          </p>
        </div>
      </div>
    </div>
  )
}
