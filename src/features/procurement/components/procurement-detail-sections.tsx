/**
 * Detail-page sections: hero, parties, classification/lifecycle rows,
 * modification trail and related records — composed by
 * `procurement-detail-page.tsx` per the grain's `DetailConfig`.
 */
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Building2, Factory } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EvidenceLink } from '@/components/shared/procurement-data/evidence-link'
import type {
  ContractModification,
  ContractRecordSummary,
  Party,
  ProcedureRecordSummary,
  ProcurementSourceSystem,
} from '@/schemas/procurement'
import type { DetailConfig, DetailRecord, DetailRow } from '../lib/detail-config'
import {
  recordCpv,
  recordPrimaryMoney,
  recordSecondaryMoney,
} from '../lib/record-accessors'
import { partyLabel, partyProfileLink, type PartyKind } from '../lib/party-links'
import { sourceSystemLabel } from '../lib/enum-labels'
import {
  procurementSectionClassName,
  procurementSectionHeaderClassName,
  procurementSectionLabelClassName,
} from '../lib/procurement-theme'
import { ProcurementStatusBadge } from './procurement-status-badge'
import { ProcurementRecordCard } from './procurement-record-card'
import { ValueWithCurrency } from './value-with-currency'
import { CpvLabel } from './cpv-label'

function formatDetailDate(iso: string): string {
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`))
}

// ── hero ────────────────────────────────────────────────────────────────────

export function ProcurementDetailHero({
  record,
  config,
}: {
  readonly record: DetailRecord
  readonly config: DetailConfig
}) {
  const primary = recordPrimaryMoney(record)
  const secondary = recordSecondaryMoney(record)

  return (
    <section className={procurementSectionClassName}>
      <div className="border-l-[5px] border-l-[#1d70b8] dark:border-l-[#3b82f6]">
        <div className="p-5 sm:p-6">
          <p className={procurementSectionLabelClassName}>{config.pageLabel()}</p>
          <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight text-[var(--pnrr-fg)] sm:text-3xl">
            {record.title ?? <Trans>Untitled record</Trans>}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ProcurementStatusBadge status={record.status} />
            <span className="inline-flex items-center border-2 border-[var(--pnrr-border)] px-2 py-0.5 text-xs font-semibold text-[var(--pnrr-muted)]">
              {sourceSystemLabel(record.sourceSystem)}
            </span>
            {record.sourceUrl ? (
              <EvidenceLink href={record.sourceUrl} kind="source" />
            ) : null}
          </div>
          <div className="mt-5 flex flex-wrap gap-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--pnrr-muted)]">
                {config.primaryValueLabel()}
              </p>
              <p className="mt-1 text-2xl font-semibold text-[var(--pnrr-fg)]">
                {primary ? (
                  <ValueWithCurrency value={primary} showCurrencyBadge />
                ) : (
                  <span className="text-[var(--pnrr-muted)]">
                    <Trans>unavailable</Trans>
                  </span>
                )}
              </p>
            </div>
            {config.secondaryValueLabel && secondary ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--pnrr-muted)]">
                  {config.secondaryValueLabel()}
                </p>
                <p className="mt-1 text-2xl font-semibold text-[var(--pnrr-fg)]">
                  <ValueWithCurrency value={secondary} />
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── parties ─────────────────────────────────────────────────────────────────

function PartyCard({
  party,
  kind,
  label,
}: {
  readonly party: Party
  readonly kind: PartyKind
  readonly label: string
}) {
  const profile = partyProfileLink(party, kind)
  const Icon = kind === 'authority' ? Building2 : Factory

  return (
    <div className="flex items-start gap-3 p-5">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--pnrr-muted)]" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--pnrr-muted)]">
          {label}
        </p>
        {profile ? (
          <Link
            to={profile.to}
            params={profile.params}
            className="mt-1 block text-base font-bold text-[var(--pnrr-fg)] underline underline-offset-2 hover:text-[var(--pnrr-muted)]"
          >
            {partyLabel(party)}
          </Link>
        ) : (
          <p className="mt-1 text-base font-bold text-[var(--pnrr-fg)]">
            {partyLabel(party)}
          </p>
        )}
        {party.cui ? (
          <p className="mt-0.5 text-sm text-[var(--pnrr-muted)]">
            CUI {party.cui}
          </p>
        ) : (
          <p className="mt-0.5 text-sm text-[var(--pnrr-muted)]">
            <Trans>CUI unavailable in the source data</Trans>
          </p>
        )}
      </div>
    </div>
  )
}

export function ProcurementPartiesSection({
  authority,
  supplier,
}: {
  readonly authority: Party
  readonly supplier: Party | null
}) {
  return (
    <section className={procurementSectionClassName} aria-label={t`Parties`}>
      <div className="grid divide-y-2 divide-[var(--pnrr-border)] sm:grid-cols-2 sm:divide-x-2 sm:divide-y-0">
        <PartyCard
          party={authority}
          kind="authority"
          label={t`Contracting authority`}
        />
        {supplier ? (
          <PartyCard party={supplier} kind="supplier" label={t`Supplier`} />
        ) : (
          <div className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--pnrr-muted)]">
              <Trans>Supplier</Trans>
            </p>
            <p className="mt-1 text-sm text-[var(--pnrr-muted)]">
              <Trans>Procedures carry no supplier until an award.</Trans>
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

// ── key facts (identifier + lifecycle rows + CPV) ───────────────────────────

function FactRows({ rows }: { readonly rows: readonly DetailRow[] }) {
  return (
    <dl className="divide-y divide-[var(--pnrr-border)]/30">
      {rows.map((row) => (
        <div key={row.key} className="flex justify-between gap-4 py-2">
          <dt className="text-sm text-[var(--pnrr-muted)]">{row.label}</dt>
          <dd className="text-right text-sm font-semibold text-[var(--pnrr-fg)]">
            {row.value ?? <Trans>unavailable</Trans>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function ProcurementKeyFactsSection({
  record,
  config,
}: {
  readonly record: DetailRecord
  readonly config: DetailConfig
}) {
  const lifecycle = config
    .lifecycleRows(record)
    .map((row) => ({
      ...row,
      value: row.value ? formatDetailDate(row.value) : null,
    }))

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className={procurementSectionClassName}>
        <div className={procurementSectionHeaderClassName}>
          <h2 className={procurementSectionLabelClassName}>
            <Trans>Identification</Trans>
          </h2>
        </div>
        <div className="px-5 pb-3 sm:px-6">
          <FactRows rows={config.identifierRows(record)} />
          <div className="flex justify-between gap-4 py-2">
            <span className="text-sm text-[var(--pnrr-muted)]">
              <Trans>CPV category</Trans>
            </span>
            <CpvLabel code={recordCpv(record)} className="justify-end" />
          </div>
        </div>
      </section>

      <section className={procurementSectionClassName}>
        <div className={procurementSectionHeaderClassName}>
          <h2 className={procurementSectionLabelClassName}>
            <Trans>Lifecycle</Trans>
          </h2>
        </div>
        <div className="px-5 pb-3 sm:px-6">
          <FactRows rows={lifecycle} />
        </div>
      </section>
    </div>
  )
}

// ── modification trail ──────────────────────────────────────────────────────

export function ProcurementModificationTrail({
  modifications,
}: {
  readonly modifications: readonly ContractModification[]
}) {
  if (modifications.length === 0) return null

  return (
    <section id="modificari" className={procurementSectionClassName}>
      <div className={procurementSectionHeaderClassName}>
        <h2 className={procurementSectionLabelClassName}>
          <Trans>Modification trail</Trans>
        </h2>
        <p className="mt-1 text-sm text-[var(--pnrr-muted)]">
          <Trans>
            Amendments (acte adiționale) that changed this contract's value.
          </Trans>
        </p>
      </div>
      <ol className="divide-y divide-[var(--pnrr-border)]/30">
        {modifications.map((modification) => {
          const delta = modification.valueDeltaRon
          const deltaNumber = delta !== null ? Number(delta) : null
          return (
            <li key={modification.id} className="px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-[var(--pnrr-fg)]">
                  {modification.modificationType ?? t`Modification`}
                </p>
                <p className="text-sm text-[var(--pnrr-muted)]">
                  {modification.modificationDate
                    ? formatDetailDate(modification.modificationDate)
                    : t`date unavailable`}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap gap-6 text-sm tabular-nums">
                <span className="text-[var(--pnrr-muted)]">
                  <Trans>Before:</Trans>{' '}
                  <ValueWithCurrency
                    value={{
                      valueRon: modification.valueBeforeRon,
                      currency: null,
                      isRon: true,
                      valueSuspect: false,
                    }}
                    notation="compact"
                  />
                </span>
                <span className="text-[var(--pnrr-muted)]">
                  <Trans>After:</Trans>{' '}
                  <ValueWithCurrency
                    value={{
                      valueRon: modification.valueAfterRon,
                      currency: null,
                      isRon: true,
                      valueSuspect: false,
                    }}
                    notation="compact"
                  />
                </span>
                {deltaNumber !== null ? (
                  <span
                    className={cn(
                      'font-semibold',
                      deltaNumber > 0
                        ? 'text-rose-700 dark:text-rose-300'
                        : 'text-emerald-700 dark:text-emerald-300',
                    )}
                  >
                    {deltaNumber > 0 ? '+' : ''}
                    <ValueWithCurrency
                      value={{
                        valueRon: delta,
                        currency: null,
                        isRon: true,
                        valueSuspect: false,
                      }}
                      notation="compact"
                      className="text-inherit"
                    />
                  </span>
                ) : null}
              </div>
              {modification.linkConfidence !== null &&
              modification.linkConfidence < 1 ? (
                <p className="mt-1 text-xs text-[var(--pnrr-muted)]">
                  <Trans>
                    Linked with reduced confidence (
                    {Math.round(modification.linkConfidence * 100)}%).
                  </Trans>
                </p>
              ) : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

// ── related records ─────────────────────────────────────────────────────────

export function ProcurementRelatedRecords({
  config,
  procedure,
  contracts,
  duplicates,
  perLotWinners,
  ted,
}: {
  readonly config: DetailConfig
  readonly procedure: ProcedureRecordSummary | null
  readonly contracts: readonly ContractRecordSummary[]
  readonly duplicates: ReadonlyArray<{
    readonly sourceSystem: ProcurementSourceSystem
    readonly id: string
  }>
  readonly perLotWinners: ReadonlyArray<{
    readonly lotLabel: string
    readonly winner: Party
    readonly valueRon: string | null
    readonly currency: string | null
    readonly isRon: boolean
    readonly valueSuspect: boolean
  }> | null
  readonly ted: { readonly tedNoticeNo: string; readonly sourceUrl: string } | null
}) {
  const showContracts = config.showRelatedContracts && contracts.length > 0
  const showProcedure = config.showSourceProcedure && procedure !== null
  const hasAnything =
    showContracts ||
    showProcedure ||
    duplicates.length > 0 ||
    (perLotWinners?.length ?? 0) > 0 ||
    ted !== null

  if (!hasAnything) return null

  return (
    <div className="space-y-6">
      {showProcedure && procedure ? (
        <section className="space-y-2">
          <h2 className={procurementSectionLabelClassName}>
            <Trans>Source procedure</Trans>
          </h2>
          <ProcurementRecordCard record={procedure} />
        </section>
      ) : null}

      {showContracts ? (
        <section className="space-y-2">
          <h2 className={procurementSectionLabelClassName}>
            <Trans>Contracts awarded under this procedure</Trans>
          </h2>
          <ul className="space-y-3">
            {contracts.map((contract) => (
              <li key={contract.id}>
                <ProcurementRecordCard record={contract} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {perLotWinners && perLotWinners.length > 0 ? (
        <section className={procurementSectionClassName}>
          <div className={procurementSectionHeaderClassName}>
            <h2 className={procurementSectionLabelClassName}>
              <Trans>Per-lot winners</Trans>
            </h2>
          </div>
          <ul className="divide-y divide-[var(--pnrr-border)]/30">
            {perLotWinners.map((lot) => (
              <li
                key={lot.lotLabel}
                className="flex items-baseline justify-between gap-4 px-5 py-3 sm:px-6"
              >
                <span className="text-sm text-[var(--pnrr-muted)]">
                  {lot.lotLabel} · {partyLabel(lot.winner)}
                </span>
                <ValueWithCurrency
                  value={{
                    valueRon: lot.valueRon,
                    currency: lot.currency,
                    isRon: lot.isRon,
                    valueSuspect: lot.valueSuspect,
                  }}
                  notation="compact"
                  className="text-sm font-semibold tabular-nums"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {duplicates.length > 0 || ted !== null ? (
        <section className={procurementSectionClassName}>
          <div className={procurementSectionHeaderClassName}>
            <h2 className={procurementSectionLabelClassName}>
              <Trans>Other sources for this record</Trans>
            </h2>
          </div>
          <ul className="divide-y divide-[var(--pnrr-border)]/30">
            {duplicates.map((duplicate) => (
              <li key={duplicate.id} className="px-5 py-3 text-sm text-[var(--pnrr-muted)] sm:px-6">
                <Trans>
                  Collapsed duplicate in {sourceSystemLabel(duplicate.sourceSystem)}{' '}
                  (id {duplicate.id})
                </Trans>
              </li>
            ))}
            {ted ? (
              <li className="px-5 py-3 sm:px-6">
                <EvidenceLink
                  href={ted.sourceUrl}
                  label={t`TED notice ${ted.tedNoticeNo}`}
                  kind="document"
                />
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
