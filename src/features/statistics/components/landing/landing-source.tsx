import { landingSourceSearch } from '../../lib/landing-source-search'
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import type { NativeInsObservation } from '@/schemas/ins'
import type {
  NativeLandingIssue,
  NativeLandingProvenance,
} from '../../lib/native-landing-types'

/** Raw decimal/status strings are deliberately available without float conversion. */
export function LandingSourceCell({
  observation,
}: {
  readonly observation: NativeInsObservation
}) {
  return (
    <span className="break-all tabular-nums">
      {observation.value ?? '—'}
      {observation.unit.symbol || observation.unit.name_ro
        ? ` ${observation.unit.symbol ?? observation.unit.name_ro}`
        : ''}
      {observation.value_status !== null ? (
        <span className="ml-1 text-xs text-amber-700 dark:text-amber-400">
          <Trans>Marcaj INS:</Trans> {observation.value_status || '∅'}
        </span>
      ) : null}
    </span>
  )
}
export function LandingSource({
  source,
}: {
  readonly source: NativeLandingProvenance
}) {
  const { descriptor } = source
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer">
        <Trans>Sursă și selecție</Trans> · {descriptor.code}
      </summary>
      <div className="mt-2 space-y-2 break-all">
        <a
          href={`https://statistici.insse.ro/tempoins/index.jsp?ind=${encodeURIComponent(descriptor.code)}&lang=ro&page=tempo3`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          INS Tempo · {descriptor.code}
        </a>
        <p>
          <Trans>Coordonate sursă:</Trans>{' '}
          {source.classificationPins.join(' · ') || '—'} ·{' '}
          <Trans>Unitate:</Trans> {source.unitCode}
        </p>
        <p>
          <Trans>Revizie:</Trans> {descriptor.metadata.revision_id}
        </p>
        <p>
          <Trans>Identificator de custodie:</Trans>{' '}
          {String(descriptor.metadata.custody_sha256)}
        </p>
        <p>
          <Trans>Identificator de transformare:</Trans>{' '}
          {descriptor.metadata.transform_contract_sha256}
        </p>
      </div>
    </details>
  )
}
function IssueReason({
  reason,
}: {
  readonly reason: NativeLandingIssue['reason']
}) {
  switch (reason) {
    case 'AMBIGUOUS':
      return <Trans>Mai multe serii sursă</Trans>
    case 'QUALIFIED':
      return <Trans>Geografie cu limitări de acoperire</Trans>
    case 'STATUS':
      return <Trans>Valoare cu marcaj INS</Trans>
    case 'DENOMINATOR':
      return <Trans>Valori incompatibile cu acest calcul</Trans>
    case 'PERIOD':
      return <Trans>Perioade incompatibile</Trans>
    default:
      return <Trans>Lipsesc observații comparabile</Trans>
  }
}
export function LandingIssues({
  issues,
  source,
}: {
  readonly issues: readonly NativeLandingIssue[]
  readonly source: NativeLandingProvenance
}) {
  return (
    <ul className="space-y-2 text-sm">
      {issues.map((issue) => (
        <li key={issue.code}>
          <Link
            to="/statistici/seturi/$cod"
            params={{ cod: source.descriptor.code }}
            search={landingSourceSearch(
              source,
              issue.code,
              issue.observations?.[0],
            )}
            className="underline"
          >
            {source.territories.find((t) => t.code === issue.code)?.name ??
              issue.code}
          </Link>
          {' · '}
          <IssueReason reason={issue.reason} />
          {issue.observations?.map((row) => (
            <div key={row.id} className="ml-3 text-xs">
              {row.time_period.iso_period}:{' '}
              <LandingSourceCell observation={row} />
            </div>
          ))}
        </li>
      ))}
    </ul>
  )
}
