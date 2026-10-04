import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import type { CompanyRegistryEvidence, CompanyRegistryIdentityObservation, CompanyRegistryProvenance } from '@/schemas/private-company-registry'
import { dateText } from '../../lib/company-profile-format'
import { caenRevisionText, statusCodeText } from '../../lib/company-registry-text'
import { countyName } from '../../lib/hub-counties'

/**
 * The public original observations the pinned edition holds for the CUI, as
 * the edition holds them: every resolved identifier with its own statuses
 * (an „în funcțiune" observation beside a conflicting one is shown, not chosen
 * away), and every original row with its stable id and the edition's own
 * source file — also when no identifier group is resolved, since the rows do
 * not depend on one. An identity row shows each value it carries (name, legal
 * form, recorded date, county, identifier), so two rows that disagree read
 * apart; a value the row lacks is shown as lacking, never filled in. No
 * address, contact, raw token or storage locator is shown — the API serves
 * none.
 */
export function CompanyRegistryEvidenceList({ evidence, className }: { readonly evidence: CompanyRegistryEvidence; readonly className?: string }) {
  const { identifiers } = evidence
  if (evidence.cuiState !== 'in_edition') return null
  const rows = [
    ...evidence.identityObservations.map((row) => ({ id: row.id, provenance: row.provenance, text: row.name ?? '—', detail: identityDetail(row) })),
    ...evidence.statusObservations.map((row) => ({ id: row.id, provenance: row.provenance, text: row.code ? statusCodeText(row.code) : '—', detail: null })),
    ...evidence.caenObservations.map((row) => ({
      id: row.id,
      provenance: row.provenance,
      text: row.code ? `${row.code} · ${caenRevisionText(row.revision)}${row.catalogLabel ? ` · ${row.catalogLabel}` : ''}` : '—',
      detail: null,
    })),
  ]
  if (identifiers.length === 0 && rows.length === 0) return null
  return (
    <section className={cn('text-sm', className)} aria-labelledby="company-registry-evidence-title" data-testid="company-registry-evidence">
      <MonoLabel id="company-registry-evidence-title" className="block text-muted-foreground">
        <Trans>Înscrierile din ediția ONRC</Trans>
      </MonoLabel>
      {identifiers.length > 1 ? (
        <p className="mt-2 text-muted-foreground">
          <Trans>CUI-ul apare sub mai mulți identificatori de înregistrare; fiecare e listat cu stările lui, niciunul nu e ales.</Trans>
        </p>
      ) : null}
      {identifiers.length > 0 ? (
        <ul className="mt-2 divide-y divide-border/70 border-y border-border/70" data-testid="company-registry-identifiers">
          {identifiers.map((identifier) => (
            <li key={identifier.id} className="grid gap-1 py-2.5 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-x-4">
              <span className="font-mono text-xs text-foreground">{identifier.identifierKey}</span>
              <span className="text-muted-foreground">
                {identifier.statusCodes.length > 0 ? identifier.statusCodes.map(statusCodeText).join('; ') : <Trans>nicio stare înscrisă</Trans>}
                {identifier.hasActiveObservation && identifier.statusCodes.length > 1 ? (
                  <span className="ml-2 text-foreground">
                    <Trans>(are o înscriere „în funcțiune” alături de alte stări)</Trans>
                  </span>
                ) : null}
                {identifier.countyCodes.length > 0 ? ` · ${identifier.countyCodes.map(countyName).join(', ')}` : ''}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">
        <Trans>Denumirile stărilor sunt din nomenclatorul aplicației, nu etichete publicate de ONRC.</Trans>
      </p>
      {rows.length > 0 ? (
        <details className="mt-3" data-testid="company-registry-rows">
          <summary className="cursor-pointer text-foreground">
            {evidence.observationsTruncated
              ? plural(rows.length, { one: 'O înscriere originală afișată', few: '# înscrieri originale afișate', other: '# de înscrieri originale afișate' })
              : plural(rows.length, { one: 'O înscriere originală', few: '# înscrieri originale', other: '# de înscrieri originale' })}
          </summary>
          <ul className="mt-2 space-y-1.5">
            {rows.map((row) => (
              <li key={row.id} className="grid gap-x-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <span className="text-foreground">
                  {row.text}
                  {row.detail ? <span className="block text-xs text-muted-foreground">{row.detail}</span> : null}
                </span>
                <ProvenanceText provenance={row.provenance} />
              </li>
            ))}
          </ul>
          {evidence.observationsTruncated ? (
            <p className="mt-2 text-xs text-muted-foreground">
              <Trans>Lista e scurtată: ediția are mai multe înscrieri decât cele afișate aici.</Trans>
            </p>
          ) : null}
        </details>
      ) : null}
    </section>
  )
}

/** What an identity row records beside its name, each value as the row has it: `—` where it has none. */
function identityDetail(row: CompanyRegistryIdentityObservation): string {
  const none = '—'
  return [
    t`formă juridică: ${row.legalForm ?? none}`,
    t`data înregistrată: ${row.recordedDate ? dateText(row.recordedDate) : none}`,
    t`județ: ${row.countyCode ? countyName(row.countyCode) : none}`,
    row.identifierKey ? t`identificator: ${row.identifierKey}` : t`fără identificator de înregistrare`,
  ].join(' · ')
}

/** `OD_FIRME, rândul 12`, linked to the edition's own source file when there is an https link for it. */
function ProvenanceText({ provenance }: { readonly provenance: CompanyRegistryProvenance }) {
  const text = (
    <Trans>
      {provenance.resourceKey}, rândul {provenance.sourceRowNumber}
    </Trans>
  )
  return (
    <MonoLabel className="text-muted-foreground">
      {provenance.sourceUrl ? (
        <a href={provenance.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
          {text}
        </a>
      ) : (
        text
      )}
    </MonoLabel>
  )
}
