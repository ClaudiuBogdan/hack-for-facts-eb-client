import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Building2, ExternalLink, FileText, Stamp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { EvidenceLink } from '@/components/shared/procurement-data'
import { CpvLabel } from './cpv-label'
import { ProcurementStatusBadge } from './procurement-status-badge'
import { ValueWithCurrency } from './value-with-currency'
import { ronAmountSlice } from '../lib/formatting'
import type { MoneyFields, ProcurementRecordSummary } from '@/schemas/procurement'

type Props = {
  readonly record: ProcurementRecordSummary
  readonly className?: string
}

function partyLink(
  party: { readonly cui: string | null; readonly displayName: string | null; readonly name: string | null } | null | undefined,
  kind: 'authority' | 'supplier',
): React.ReactNode {
  if (!party) return null
  const label = party.displayName ?? party.name ?? party.cui ?? t`Necunoscut`
  if (!party.cui) {
    return <span className="font-medium">{label}</span>
  }
  const to = kind === 'authority' ? '/entities/$cui' : '/companies/$cui'
  return (
    <Link
      to={to}
      params={{ cui: party.cui }}
      className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
    >
      {label}
    </Link>
  )
}

function detailRoute(grain: ProcurementRecordSummary['grain']): string {
  switch (grain) {
    case 'procedure':
      return '/achizitii/proceduri/$id'
    case 'contract':
      return '/achizitii/contracte/$id'
    case 'direct_acquisition':
      return '/achizitii/achizitii-directe/$id'
    case 'modification':
      // Modifications link to the parent contract detail with a section/hash
      // (design review change #6). When unlinked, the card is non-navigable.
      return '/achizitii/contracte/$id'
  }
}

function recordGrainLabel(grain: ProcurementRecordSummary['grain']): string {
  switch (grain) {
    case 'procedure':
      return t`Procedură`
    case 'contract':
      return t`Contract`
    case 'direct_acquisition':
      return t`Achiziție directă`
    case 'modification':
      return t`Modificare`
  }
}

function recordAuthority(record: ProcurementRecordSummary) {
  switch (record.grain) {
    case 'procedure':
    case 'contract':
    case 'direct_acquisition':
    case 'modification':
      return record.authority
  }
}

function recordSupplier(record: ProcurementRecordSummary) {
  switch (record.grain) {
    case 'contract':
    case 'direct_acquisition':
    case 'modification':
      return record.supplier
    case 'procedure':
      return null
  }
}

/**
 * One result row across grains. Per-grain field slots: authority (→
 * /entities/$cui), supplier (→ /companies/$cui, contracts/DAs only),
 * ValueWithCurrency, date, CpvLabel, StatusBadge, source-system badge,
 * EvidenceLink to e-licitatie, link to the detail page. Modifications link
 * to the parent contract detail (with hash); unlinked modifications are
 * non-navigable.
 */
export function ProcurementRecordCard({ record, className }: Props) {
  const isModification = record.grain === 'modification'
  const parentContractId = isModification ? record.contractId : null
  const isUnlinkedModification = isModification && parentContractId === null
  const detailTo = isUnlinkedModification ? null : detailRoute(record.grain)
  const detailParams = isModification
    ? { id: parentContractId ?? '' }
    : { id: record.id }
  const detailHash = isModification ? 'modificari' : undefined

  const value: MoneyFields | null =
    record.grain === 'contract' || record.grain === 'direct_acquisition'
      ? {
          valueRon: record.valueRon,
          currency: record.currency,
          isRon: record.isRon,
          valueSuspect: record.valueSuspect,
        }
      : record.grain === 'procedure'
        ? {
            valueRon: record.awardedValueRon,
            currency: record.currency,
            isRon: record.isRon,
            valueSuspect: record.valueSuspect,
          }
        : ronAmountSlice(record.valueDeltaRon)

  const date =
    record.grain === 'procedure'
      ? record.publicationDate ?? record.stateDate
      : record.grain === 'contract'
        ? record.contractDate
        : record.grain === 'direct_acquisition'
          ? record.publicationDate ?? record.finalizationDate
          : record.modificationDate

  const title =
    'title' in record
      ? record.title
      : isModification
        ? t`Modificare ${record.modificationType ?? ''}`
        : null

  const numberLabel =
    record.grain === 'procedure'
      ? record.noticeNo
      : record.grain === 'contract'
        ? record.contractNo
        : record.grain === 'direct_acquisition'
          ? record.uniqueCode
          : null

  const sourceSystem = 'sourceSystem' in record ? record.sourceSystem : null
  const sourceUrl = 'sourceUrl' in record ? record.sourceUrl : null
  const authority = recordAuthority(record)
  const supplier = recordSupplier(record)

  const cardInner = (
    <CardContent className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-900">
              {recordGrainLabel(record.grain)}
            </Badge>
            {numberLabel ? (
              <span className="text-xs text-muted-foreground">{numberLabel}</span>
            ) : null}
            {'status' in record ? (
              <ProcurementStatusBadge status={record.status} />
            ) : (
              <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-900">
                <Trans>fără status</Trans>
              </Badge>
            )}
          </div>
          {title ? (
            <p className="text-sm font-medium leading-snug">{title}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Trans>Titlu indisponibil</Trans>
            </p>
          )}
        </div>
        {value ? <ValueWithCurrency value={value} notation="compact" /> : null}
      </div>

      <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Trans>Autoritate</Trans>
          </p>
          <div className="flex items-center gap-1">
            <Building2 className="h-3 w-3 text-muted-foreground" aria-hidden />
            {authority ? (
              partyLink(authority, 'authority')
            ) : (
              <span className="text-muted-foreground">
                <Trans>indisponibil</Trans>
              </span>
            )}
          </div>
        </div>
        {supplier ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Trans>Furnizor</Trans>
            </p>
            <div className="flex items-center gap-1">
              <Building2 className="h-3 w-3 text-muted-foreground" aria-hidden />
              {partyLink(supplier, 'supplier')}
            </div>
          </div>
        ) : null}
        {'cpvCode' in record ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Trans>CPV</Trans>
            </p>
            <CpvLabel code={record.cpvCode} variant="compact" />
          </div>
        ) : null}
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Trans>Dată</Trans>
          </p>
          <p>{date ?? t`dată indisponibilă`}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
        <div className="flex items-center gap-2">
          {sourceSystem ? (
            <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-900">
              <Stamp className="h-3 w-3" aria-hidden />
              {sourceSystem}
            </Badge>
          ) : null}
          {sourceUrl ? <EvidenceLink href={sourceUrl} kind="source" /> : null}
        </div>
        {detailTo && !isUnlinkedModification ? (
          <Link
            to={detailTo}
            params={detailParams}
            hash={detailHash}
            className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline underline-offset-2 hover:text-primary"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden />
            <Trans>Vezi detalii</Trans>
          </Link>
        ) : isUnlinkedModification ? (
          <span className="text-xs text-muted-foreground">
            <Trans>Modificare neasociată — fără contract părinte</Trans>
          </span>
        ) : null}
      </div>
    </CardContent>
  )

  return <Card className={cn('transition-colors hover:bg-muted/40', className)}>{cardInner}</Card>
}

export { ExternalLink }
