import { Trans } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { EvidenceLink, IdentityConfidenceBadge } from '@/components/data-trust'
import { DEFAULT_CONTEST_SEARCH } from '@/schemas/elections'
import type {
  Candidacy,
  CompetitorResult,
  ContestSummary,
  HeadlineContest,
  MandateAllocation,
  ReportingUnitRef,
  SourcePointer,
  TurnoutMetrics,
} from '../types'
import {
  formatNullableNumber,
} from '../lib/format'

function evidenceContext({
  entityTitle,
  metricLabel,
  valueDisplay,
}: {
  readonly entityTitle: string
  readonly metricLabel: string
  readonly valueDisplay: string | null
}) {
  return {
    entityTitle,
    metricLabel,
    sourceMetricCode: null,
    mappingStatus: 'mapat',
    resolverVersion: 'mock-read-model-v1',
    valueDisplay,
  }
}

export function NumericEvidence({
  value,
  suffix,
  pointer,
  entityTitle,
  metricLabel,
}: {
  readonly value: number | null
  readonly suffix?: string
  readonly pointer: SourcePointer | null
  readonly entityTitle: string
  readonly metricLabel: string
}) {
  if (value !== null && pointer === null) {
    return (
      <span className="inline-flex flex-wrap items-baseline gap-1">
        <span className="font-medium tabular-nums">-</span>
        <span className="text-xs text-muted-foreground">
          <Trans>provenienta indisponibila</Trans>
        </span>
      </span>
    )
  }

  if (value === null) {
    return (
      <span className="inline-flex flex-wrap items-baseline gap-1">
        <span className="font-medium tabular-nums">-</span>
        <span className="text-xs text-muted-foreground">
          <Trans>metric indisponibil</Trans>
        </span>
        {pointer !== null && (
          <EvidenceLink
            pointers={[pointer]}
            context={evidenceContext({
              entityTitle,
              metricLabel,
              valueDisplay: null,
            })}
          >
            <Trans>sursa</Trans>
          </EvidenceLink>
        )}
      </span>
    )
  }

  const display = `${value.toLocaleString('ro-RO')}${suffix ?? ''}`
  return (
    <span className="inline-flex flex-wrap items-baseline gap-1">
      <span className="font-medium tabular-nums">{display}</span>
      {pointer !== null && (
        <EvidenceLink
          pointers={[pointer]}
          context={evidenceContext({
            entityTitle,
            metricLabel,
            valueDisplay: display,
          })}
        >
          <Trans>sursa</Trans>
        </EvidenceLink>
      )}
    </span>
  )
}

export function ElectionBoundaryBadge() {
  return <Badge variant="outline"><Trans>Rezultate alegeri</Trans></Badge>
}

export function WinnerCard({
  headline,
  compact = false,
}: {
  readonly headline: HeadlineContest
  readonly compact?: boolean
}) {
  const top = headline.topCompetitor
  const entityTitle = `${headline.contest.officeLabel} - ${headline.contest.scopeLabel}`
  const pointer = top?.provenance ?? headline.turnout.provenance

  return (
    <div className="rounded-md border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ElectionBoundaryBadge />
        <Badge variant={headline.contest.isReferendum ? 'warning' : 'secondary'}>
          {headline.contest.officeLabel}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        <Trans>Primul rezultat publicat de sursa</Trans>
      </p>
      <h3 className="mt-1 text-lg font-semibold">
        {top?.sourceLabel ?? <Trans>Fara rezultat publicat</Trans>}
      </h3>
      {top !== null && (
        <p className="mt-2 text-sm">
          <NumericEvidence
            value={top.votes}
            pointer={top.provenance}
            entityTitle={entityTitle}
            metricLabel="Voturi"
          />{' '}
          <span className="text-muted-foreground">
            (<NumericEvidence
              value={top.votePercent}
              suffix="%"
              pointer={top.provenance}
              entityTitle={entityTitle}
              metricLabel="Procent voturi"
            />)
          </span>
        </p>
      )}
      {!compact && (
        <p className="mt-3 text-xs text-muted-foreground">
          <Trans>
            Eticheta candidatului sau competitorului este preluata din sursa; nu
            implica identitate de persoana rezolvata.
          </Trans>
        </p>
      )}
      {pointer !== null && (
        <div className="mt-3">
          <EvidenceLink
            pointers={[pointer]}
            context={evidenceContext({
              entityTitle,
              metricLabel: 'Rezultat principal',
              valueDisplay: top?.sourceLabel ?? null,
            })}
          >
            <Trans>vezi provenienta</Trans>
          </EvidenceLink>
        </div>
      )}
    </div>
  )
}

export function TurnoutSummary({
  turnout,
  title,
}: {
  readonly turnout: TurnoutMetrics
  readonly title: string
}) {
  return (
    <div className="grid gap-3 rounded-md border bg-muted/20 p-4 sm:grid-cols-3">
      <div>
        <p className="text-xs text-muted-foreground">
          <Trans>Voturi valide</Trans>
        </p>
        <NumericEvidence
          value={turnout.validVotes}
          pointer={turnout.provenance}
          entityTitle={title}
          metricLabel="Voturi valide"
        />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">
          <Trans>Voturi nule</Trans>
        </p>
        <NumericEvidence
          value={turnout.invalidVotes}
          pointer={turnout.provenance}
          entityTitle={title}
          metricLabel="Voturi nule"
        />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">
          <Trans>Prezenta</Trans>
        </p>
        <NumericEvidence
          value={turnout.turnoutPercent}
          suffix="%"
          pointer={turnout.provenance}
          entityTitle={title}
          metricLabel="Prezenta"
        />
      </div>
    </div>
  )
}

export function RankedResultsChart({
  rows,
  title,
}: {
  readonly rows: readonly CompetitorResult[]
  readonly title: string
}) {
  const maxVotes = rows.reduce((max, row) => {
    if (row.votes === null) return max
    return row.votes > max ? row.votes : max
  }, 0)

  return (
    <div className="space-y-3 rounded-md border p-4" aria-label={title}>
      {rows.map((row) => {
        const width =
          row.votes === null || maxVotes === 0
            ? '0%'
            : `${Math.max(8, (row.votes / maxVotes) * 100)}%`

        return (
          <div key={row.competitorKey} className="space-y-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{row.sourceLabel}</span>
              <span className="text-muted-foreground">
                <NumericEvidence
                  value={row.votes}
                  pointer={row.provenance}
                  entityTitle={title}
                  metricLabel="Voturi"
                />{' '}
                <span>
                  (<NumericEvidence
                    value={row.votePercent}
                    suffix="%"
                    pointer={row.provenance}
                    entityTitle={title}
                    metricLabel="Procent voturi"
                  />)
                </span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary" style={{ width }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function RankedResultsTable({
  rows,
  title,
}: {
  readonly rows: readonly CompetitorResult[]
  readonly title: string
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[42rem] text-sm">
        <caption className="sr-only">{title}</caption>
        <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2">
              <Trans>Rang</Trans>
            </th>
            <th scope="col" className="px-3 py-2">
              <Trans>Competitor din sursa</Trans>
            </th>
            <th scope="col" className="px-3 py-2">
              <Trans>Voturi</Trans>
            </th>
            <th scope="col" className="px-3 py-2">
              <Trans>Procent</Trans>
            </th>
            <th scope="col" className="px-3 py-2">
              <Trans>Mandate</Trans>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.competitorKey} className="border-b last:border-b-0">
              <td className="px-3 py-2 tabular-nums">{formatNullableNumber(row.rank)}</td>
              <td className="px-3 py-2">
                <div className="font-medium">{row.sourceLabel}</div>
                <div className="text-xs text-muted-foreground">
                  {row.normalizedLabel ?? <Trans>eticheta sursa fara rezolvare</Trans>}
                </div>
              </td>
              <td className="px-3 py-2">
                <NumericEvidence
                  value={row.votes}
                  pointer={row.provenance}
                  entityTitle={title}
                  metricLabel="Voturi"
                />
              </td>
              <td className="px-3 py-2">
                <NumericEvidence
                  value={row.votePercent}
                  suffix="%"
                  pointer={row.provenance}
                  entityTitle={title}
                  metricLabel="Procent voturi"
                />
              </td>
              <td className="px-3 py-2">
                <NumericEvidence
                  value={row.mandates}
                  pointer={row.provenance}
                  entityTitle={title}
                  metricLabel="Mandate alocate"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function GeographyDrilldown({
  children,
  pollingStations,
  expert,
}: {
  readonly children: readonly ReportingUnitRef[]
  readonly pollingStations: readonly ReportingUnitRef[]
  readonly expert: boolean
}) {
  const visibleUnits = expert ? pollingStations : children

  return (
    <div className="rounded-md border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">
            <Trans>Geografie</Trans>
          </h2>
          <p className="text-sm text-muted-foreground">
            {expert ? (
              <Trans>Sectii de votare disponibile in modul expert.</Trans>
            ) : (
              <Trans>Lista sincronizata cu harta va fi conectata dupa API.</Trans>
            )}
          </p>
        </div>
        <Badge variant={expert ? 'warning' : 'outline'}>
          {expert ? <Trans>Expert</Trans> : <Trans>Lista</Trans>}
        </Badge>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {visibleUnits.map((unit) => (
          <div key={unit.reportingUnitKey} className="rounded-md border bg-muted/20 p-3">
            <p className="font-medium">{unit.name}</p>
            <p className="text-xs text-muted-foreground">
              {unit.countyName ?? unit.scopeType}
              {unit.pollingStationNumber !== null
                ? ` · sectia ${unit.pollingStationNumber}`
                : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CandidacyList({ candidacies }: { readonly candidacies: readonly Candidacy[] }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <IdentityConfidenceBadge status="source_only" />
        <span className="text-sm text-muted-foreground">
          <Trans>Nume din sursa - identitate nerezolvata</Trans>
        </span>
      </div>
      {candidacies.map((candidacy) => (
        <div key={`${candidacy.contestKey}-${candidacy.ballotPosition ?? 'x'}`} className="rounded-md border p-3 text-sm">
          <p className="font-medium">{candidacy.competitorLabel ?? <Trans>Independent</Trans>}</p>
          <p className="text-xs text-muted-foreground">
            <Trans>Pozitie buletin</Trans>: {candidacy.ballotPosition ?? '-'} ·{' '}
            <Trans>Lista finala</Trans>: {candidacy.isFinalList ? 'da' : 'nu'}
          </p>
          <div className="mt-1">
            <NumericEvidence
              value={candidacy.votes}
              pointer={candidacy.provenance}
              entityTitle={`${candidacy.officeLabel} - ${candidacy.scopeLabel}`}
              metricLabel="Voturi candidatura"
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MandateAllocationPanel({
  mandates,
  title,
}: {
  readonly mandates: readonly MandateAllocation[]
  readonly title: string
}) {
  return (
    <div className="space-y-3 rounded-md border p-4">
      <div>
        <h2 className="text-base font-semibold">
          <Trans>Mandate pe lista/partid</Trans>
        </h2>
        <p className="text-sm text-muted-foreground">
          <Trans>
            Acestea sunt alocari numerice publicate de sursa, nu persoane alese
            nominal.
          </Trans>
        </p>
      </div>
      {mandates.map((mandate) => (
        <div key={`${mandate.competitorKey}-${mandate.allocationPhase}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/30 p-3 text-sm">
          <span className="font-medium">{mandate.sourceLabel}</span>
          <NumericEvidence
            value={mandate.mandates}
            pointer={mandate.provenance}
            entityTitle={title}
            metricLabel="Mandate alocate"
          />
        </div>
      ))}
    </div>
  )
}

export function ContestLinkRow({
  contest,
  isMockBacked,
}: {
  readonly contest: ContestSummary
  readonly isMockBacked: boolean
}) {
  if (contest.isReferendum) {
    return (
      <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">{contest.officeLabel}</p>
        <p>
          <Trans>Ruta de referendum este planificata, dar nu face parte din acest MVP.</Trans>
        </p>
      </div>
    )
  }

  if (!isMockBacked) {
    return (
      <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">
          {contest.officeLabel} - {contest.scopeLabel}
        </p>
        <p>
          <Trans>
            Concursul este listat in hub, dar explorerul mock este conectat doar
            pentru fixture-ul Cluj-Napoca primar.
          </Trans>
        </p>
      </div>
    )
  }

  return (
    <Link
      to="/alegeri/contest/$contestKey"
      params={{ contestKey: contest.contestKey }}
      search={DEFAULT_CONTEST_SEARCH}
      className="group flex items-center justify-between gap-3 rounded-md border p-3 text-sm transition-colors hover:bg-muted/40"
    >
      <span>
        <span className="block font-medium">
          {contest.officeLabel} - {contest.scopeLabel}
        </span>
        <span className="text-xs text-muted-foreground">
          {contest.constituencyName ?? contest.scopeType}
        </span>
      </span>
      <span className="rounded-md border px-3 py-1 text-xs font-medium">
        <Trans>Deschide</Trans>
      </span>
    </Link>
  )
}
