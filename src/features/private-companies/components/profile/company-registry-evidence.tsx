import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import type { CompanyRegistryEvidence } from '@/schemas/private-company-registry'
import { statusCodeText } from '../../lib/company-registry-text'
import { countyName } from '../../lib/hub-counties'

/**
 * The registration identifiers the pinned edition holds for the CUI, each
 * with its own statuses and counties: an „în funcțiune" observation beside a
 * conflicting one is shown, not chosen away. The edition's original rows are
 * not listed (owner, 14 October 2026: too much detail for the page); the
 * registry values above say where rows disagree, and the sources line names
 * the edition.
 */
export function CompanyRegistryEvidenceList({ evidence, className }: { readonly evidence: CompanyRegistryEvidence; readonly className?: string }) {
  const { identifiers } = evidence
  if (evidence.cuiState !== 'in_edition' || identifiers.length === 0) return null
  return (
    <section className={cn('text-sm', className)} aria-labelledby="company-registry-evidence-title" data-testid="company-registry-evidence">
      <MonoLabel id="company-registry-evidence-title" className="block text-muted-foreground">
        <Trans>Identificatorii din ediția ONRC</Trans>
      </MonoLabel>
      {identifiers.length > 1 ? (
        <p className="mt-2 text-muted-foreground">
          <Trans>CUI-ul apare sub mai mulți identificatori de înregistrare; fiecare e listat cu stările lui, niciunul nu e ales.</Trans>
        </p>
      ) : null}
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
      <p className="mt-2 text-xs text-muted-foreground">
        <Trans>Denumirile stărilor sunt din nomenclatorul aplicației, nu etichete publicate de ONRC.</Trans>
      </p>
    </section>
  )
}
