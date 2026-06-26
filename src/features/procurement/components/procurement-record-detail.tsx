import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { AlertCircle, Building2, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  CoverageRibbonFromGate,
  DataStatusBadge,
  RequestDatasetAction,
  SourceProvenanceDrawer,
} from '@/components/shared/procurement-data'
import { CpvLabel } from './cpv-label'
import { ModificationTrail } from './modification-trail'
import { ProcurementRecordHeader } from './procurement-record-header'
import { ValueWithCurrency } from './value-with-currency'
import { grainLabel } from '../lib/grain-labels'
import type {
  ContractRecord,
  DirectAcquisitionRecord,
  Party,
  ProcedureRecord,
  ProcurementGrain,
  ProcurementRecordDetail as ProcurementRecordDetailType,
  ProvenanceInfo,
} from '@/schemas/procurement'

type AnyRecord = ProcedureRecord | ContractRecord | DirectAcquisitionRecord
type AnyDetail = ProcurementRecordDetailType<AnyRecord>

type Props = {
  readonly detail: AnyDetail
  readonly className?: string
}

function provenanceInfo(detail: AnyDetail): ProvenanceInfo {
  const r = detail.record
  const provenance = 'provenance' in r ? r.provenance : null
  return {
    sourceLabel: provenance?.sourceSystem ? `e-licitatie / SEAP (${provenance.sourceSystem})` : 'e-licitatie / SEAP',
    sourceUrl: provenance?.sourceUrl ?? null,
    scraperRef: 'public-contracts-seap',
    retrievedAt: provenance?.retrievedAt ?? null,
    publishedAt: provenance?.publishedAt ?? null,
    parserNotes: [
      t`Valorile non-RON păstrează valoarea nativă; nu se însumează între monede.`,
      t`Numele pot conține prefixe proprii de CUI și separatori |...| (afișați curățiți).`,
      t`~310k proceduri e-licitatie pot lipsi publication_date până la o reîncărcare.`,
    ],
  }
}

function partyLink(party: Party, kind: 'authority' | 'supplier'): React.ReactNode {
  const label = party.displayName ?? party.name ?? party.cui ?? t`Necunoscut`
  if (!party.cui) return <span className="font-medium">{label}</span>
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

/**
 * Shared procurement record detail layout. Three routes (procedure /
 * contract / direct acquisition) map `$id` → adapter → this layout, with
 * grain-specific slot content. Includes breadcrumb, header, parties,
 * classification, lifecycle, values, modification trail (contracts), related
 * records, gated per-lot / TED slots, related links rail, and a footer with
 * provenance drawer + report-issue affordance.
 */
export function ProcurementRecordDetail({ detail, className }: Props) {
  const r = detail.record
  const grain: ProcurementGrain =
    r.grain === 'direct_acquisition' ? 'direct_acquisitions' : `${r.grain}s`
  const info = provenanceInfo(detail)

  return (
    <div className={className}>
      <Breadcrumb grain={grain} recordId={r.id} />

      <CoverageRibbonFromGate
        gate={detail.gate}
        status="mock"
        className="mt-3"
      />

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <ProcurementRecordHeader
            grain={r.grain}
            identifiers={identifiersFor(r)}
            status={r.status}
            valueLabel={valueLabelFor(r)}
            value={primaryValue(r)}
            secondaryValue={secondaryValue(r)}
            sourceSystem={info.sourceLabel}
            sourceUrl={info.sourceUrl}
            publishedAt={info.publishedAt}
            retrievedAt={info.retrievedAt}
            dataStatus="mock"
          />

          <PartiesSection record={r} />

          <ClassificationSection record={r} />

          <LifecycleSection record={r} />

          {r.grain === 'contract' ? (
            <section id="modificari" className="space-y-2 scroll-mt-24">
              <h2 className="text-base font-semibold">
                <Trans>Modificări</Trans>
              </h2>
              <ModificationTrail modifications={detail.related.modifications} />
            </section>
          ) : null}

          {r.grain === 'procedure' ? (
            <RelatedContractsSection detail={detail} />
          ) : null}

          <GatedSlotsSection detail={detail} />
        </div>

        <aside className="space-y-4">
          <RelatedLinksSection record={r} />
          {detail.related.duplicates.length > 0 ? (
            <DuplicatesSection detail={detail} />
          ) : null}
        </aside>
      </div>

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <SourceProvenanceDrawer provenance={info} />
        <RequestDatasetAction dataset="public-contracts-seap" />
      </footer>
    </div>
  )
}

function Breadcrumb({
  grain,
  recordId,
}: {
  readonly grain: string
  readonly recordId: string
}) {
  return (
    <nav aria-label={t`Breadcrumb`} className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      <Link to="/achizitii" className="underline underline-offset-2 hover:text-foreground">
        <Trans>Achiziții publice</Trans>
      </Link>
      <span aria-hidden>/</span>
      <Link
        to="/achizitii/cautare"
        search={{ grain: grain as 'procedures' | 'contracts' | 'direct_acquisitions' }}
        className="underline underline-offset-2 hover:text-foreground"
      >
        {grainLabel(grain as 'procedures' | 'contracts' | 'direct_acquisitions')}
      </Link>
      <span aria-hidden>/</span>
      <span className="font-medium text-foreground">{recordId}</span>
    </nav>
  )
}

function identifiersFor(r: AnyRecord): ReadonlyArray<{ readonly label: string; readonly value: string | null }> {
  if (r.grain === 'procedure') {
    return [
      { label: t`Număr anunț`, value: r.noticeNo },
      { label: t`Tip procedură`, value: r.procedureType },
    ]
  }
  if (r.grain === 'contract') {
    return [
      { label: t`Număr contract`, value: r.contractNo },
      { label: t`Număr anunț`, value: r.noticeNo },
      { label: t`Procedură`, value: r.procedureId },
    ]
  }
  return [
    { label: t`Cod unic`, value: r.uniqueCode },
    { label: t`ID stare`, value: r.stateId },
  ]
}

function valueLabelFor(r: AnyRecord): string {
  if (r.grain === 'procedure') return t`Valoare estimată`
  if (r.grain === 'contract') return t`Valoare contract`
  return t`Valoare`
}

function primaryValue(r: AnyRecord): import('@/schemas/procurement').MoneyValue {
  if (r.grain === 'procedure') return r.estimatedValue
  if (r.grain === 'contract') return r.value
  return r.value
}

function secondaryValue(
  r: AnyRecord,
): { readonly label: string; readonly value: import('@/schemas/procurement').MoneyValue } | null {
  if (r.grain === 'procedure') {
    return { label: t`Valoare atribuită`, value: r.awardedValue }
  }
  if (r.grain === 'contract') {
    return { label: t`Valoare estimată`, value: r.estimatedValue }
  }
  return { label: t`Valoare estimată`, value: r.estimatedValue }
}

function PartiesSection({ record }: { readonly record: AnyRecord }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">
        <Trans>Părți</Trans>
      </h2>
      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Trans>Autoritate contractantă</Trans>
          </p>
          <div className="flex items-center gap-1">
            <Building2 className="h-3 w-3 text-muted-foreground" aria-hidden />
            {partyLink(record.authority, 'authority')}
          </div>
          <p className="text-xs text-muted-foreground">
            CUI: {record.authority.cui ?? t`indisponibil`}
          </p>
        </div>
        {'supplier' in record ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Trans>Furnizor</Trans>
            </p>
            <div className="flex items-center gap-1">
              <Building2 className="h-3 w-3 text-muted-foreground" aria-hidden />
              {partyLink(record.supplier, 'supplier')}
            </div>
            <p className="text-xs text-muted-foreground">
              CUI: {record.supplier.cui ?? t`indisponibil`}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function ClassificationSection({ record }: { readonly record: AnyRecord }) {
  const cpv = 'cpvCode' in record ? record.cpvCode : null
  const contractKind =
    'contractKind' in record ? record.contractKind : null
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">
        <Trans>Clasificare</Trans>
      </h2>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <CpvLabel code={cpv} />
        {contractKind ? (
          <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-900">
            {contractKind}
          </Badge>
        ) : null}
      </div>
    </section>
  )
}

function LifecycleSection({ record }: { readonly record: AnyRecord }) {
  const dates: Array<{ readonly label: string; readonly value: string | null }> = []
  if (record.grain === 'procedure') {
    dates.push(
      { label: t`Dată publicare`, value: record.publicationDate },
      { label: t`Dată stare`, value: record.stateDate },
    )
  } else if (record.grain === 'contract') {
    dates.push({ label: t`Dată contract`, value: record.contractDate })
  } else {
    dates.push(
      { label: t`Dată publicare`, value: record.publicationDate },
      { label: t`Dată finalizare`, value: record.finalizationDate },
    )
  }

  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">
        <Trans>Ciclu de viață</Trans>
      </h2>
      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        {dates.map((d) => (
          <div key={d.label} className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">{d.label}</dt>
            <dd className="font-medium">{d.value ?? t`dată indisponibilă`}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function RelatedContractsSection({ detail }: { readonly detail: AnyDetail }) {
  const r = detail.record
  if (r.grain !== 'procedure') return null
  const contracts = detail.related.contracts
  if (contracts.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-base font-semibold">
          <Trans>Contracte</Trans>
        </h2>
        <p className="text-sm text-muted-foreground">
          <Trans>Niciun contract legat.</Trans>
        </p>
      </section>
    )
  }
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">
        <Trans>Contracte</Trans>
      </h2>
      <ul className="space-y-1 text-sm">
        {contracts.map((c) => (
          <li key={c.id}>
            <Link
              to="/achizitii/contracte/$id"
              params={{ id: c.id }}
              className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
            >
              {c.contractNo ?? c.id}
            </Link>
            <span className="text-muted-foreground"> · <ValueWithCurrency value={c.value} notation="compact" /></span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function GatedSlotsSection({ detail }: { readonly detail: AnyDetail }) {
  const r = detail.record
  const showPerLot = r.grain === 'procedure'
  const showTed = r.grain === 'procedure' || r.grain === 'contract'

  if (!showPerLot && !showTed) return null

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">
        <Trans>Sloturi sub prag</Trans>
      </h2>
      {showPerLot ? (
        <GatedSlot
          title={t`Câștigători pe loți`}
          reason={t`Lane-ul de câștigători pe loți nu este încă servit.`}
        />
      ) : null}
      {showTed ? (
        <GatedSlot
          title={t`Vezi și pe TED`}
          reason={t`Lane-ul TED RO nu este încă servit.`}
        />
      ) : null}
    </section>
  )
}

function GatedSlot({ title, reason }: { readonly title: string; readonly reason: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-3 text-sm">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span className="font-medium">{title}</span>
        <DataStatusBadge status="unverified" />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{reason}</p>
    </div>
  )
}

function RelatedLinksSection({ record }: { readonly record: AnyRecord }) {
  const authorityCui = record.authority.cui
  const supplierCui = 'supplier' in record ? record.supplier.cui : null
  return (
    <section className="space-y-2 rounded-lg border border-border p-3 text-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Trans>Legături înrudite</Trans>
      </h2>
      <ul className="space-y-1">
        {authorityCui ? (
          <li>
            <Link
              to="/entities/$cui"
              params={{ cui: authorityCui }}
              className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
            >
              <Trans>Profil autoritate</Trans>
            </Link>
          </li>
        ) : null}
        {supplierCui ? (
          <li>
            <Link
              to="/companies/$cui"
              params={{ cui: supplierCui }}
              className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
            >
              <Trans>Profil furnizor</Trans>
            </Link>
          </li>
        ) : null}
        {record.grain === 'contract' && record.procedureId ? (
          <li>
            <Link
              to="/achizitii/proceduri/$id"
              params={{ id: record.procedureId }}
              className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
            >
              <Trans>Procedura sursă</Trans>
            </Link>
          </li>
        ) : null}
        <li>
          <Link
            to="/achizitii/cautare"
            search={{ authority_cui: authorityCui ?? undefined }}
            className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
          >
            <Trans>Toate achizițiile autorității</Trans>
          </Link>
        </li>
      </ul>
    </section>
  )
}

function DuplicatesSection({ detail }: { readonly detail: AnyDetail }) {
  return (
    <section className="space-y-2 rounded-lg border border-border p-3 text-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Trans>Surse</Trans>
      </h2>
      <p className="text-xs text-muted-foreground">
        <Trans>
          Această înregistrare apare în mai multe surse. Deduplicarea este un
          strat de legături reversibil (dup_group_id + is_canonical).
        </Trans>
      </p>
      <ul className="space-y-1">
        {detail.related.duplicates.map((d) => (
          <li key={`${d.sourceSystem}-${d.id}`} className="flex items-center gap-1">
            <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-900">
              {d.sourceSystem}
            </Badge>
            <span className="font-mono text-xs">{d.id}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export { ExternalLink, Button, Separator }
export type { AnyRecord, AnyDetail }
