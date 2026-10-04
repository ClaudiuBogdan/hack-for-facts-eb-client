import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import type { CompanyProfileModel, StatementValues } from '../../lib/company-profile-model'
import {
  metricLabel,
  metricStatusLabel,
  netResultStatusLabel,
  notAssessedNotice,
  otherBasisNotice,
  qualificationLede,
  statementPublisherLabel,
  statementStateLabel,
} from '../../lib/company-profile-text'
import { exactDecimalText } from '../../lib/financial-qualification'
import { hubNumberLocale } from '../../lib/hub-format'

/**
 * What the figures above are made of: the published policy that admitted
 * them, the statements outside it, and every value every statement published
 * — reported or not, any year — exactly as the source published it (a
 * 300-trillion-lei turnover included), beside its state and reason. The net
 * result the evaluator derives is listed apart from its published components:
 * a reported profit stays readable while the net built from it is held.
 * Nothing here is summed, charted or compared.
 */
export function CompanyQualificationNote({ model, className }: { readonly model: CompanyProfileModel; readonly className?: string }) {
  if (!model.latest) return null
  // The digits grouped as every other number on the page is.
  const locale = hubNumberLocale() === 'ro-RO' ? 'ro' : 'en'
  const lede = qualificationLede(model)
  const notAssessed = notAssessedNotice(model)
  const otherBasis = otherBasisNotice(model)
  const { statements } = model.qualification
  return (
    <section className={cn('max-w-[68ch] text-sm leading-relaxed text-muted-foreground', className)} aria-labelledby="company-qualification-title">
      <MonoLabel id="company-qualification-title" className="block text-muted-foreground">
        <Trans>Ce intră în cifre</Trans>
      </MonoLabel>
      {notAssessed ? <p className="mt-2 border-l-2 border-amber-500 py-0.5 pl-3 text-foreground">{notAssessed}</p> : null}
      {lede ? <p className="mt-2">{lede}</p> : null}
      {otherBasis ? <p className="mt-2">{otherBasis}</p> : null}
      <p className="mt-3">
        <Trans>Valorile publicate de sursă, pe bilanțuri, cu starea fiecăreia:</Trans>
      </p>
      <div className="mt-2 divide-y divide-border/70 border-y border-border/70">
        {statements.map((statement, index) => (
          <StatementDetails
            key={statement.year}
            statement={statement}
            locale={locale}
            // The newest statement opens when something in it stays out of the figures.
            open={index === 0 && (statement.keptOut > 0 || statement.netHeld)}
          />
        ))}
      </div>
    </section>
  )
}

function StatementDetails({ statement, locale, open }: { readonly statement: StatementValues; readonly locale: 'ro' | 'en'; readonly open: boolean }) {
  const { source } = statement
  return (
    <details open={open} className="py-2">
      <summary className="cursor-pointer text-foreground">
        {statement.year} · {statementPublisherLabel(statement.publisher)} · <span className="text-muted-foreground">{statementStateLabel(statement)}</span>
      </summary>
      <table className="mt-2 w-full text-sm">
        <tbody className="divide-y divide-border/50">
          {statement.values.map((value) => (
            <tr key={value.metric}>
              <th scope="row" className="py-1.5 pr-3 text-left font-normal text-foreground">
                {metricLabel(value.metric)}
              </th>
              <td className="py-1.5 pr-3 text-right font-semibold whitespace-nowrap tabular-nums text-foreground">
                <span>{exactDecimalText(value.original, locale)}</span>
                {value.metric === 'employees' ? null : (
                  <>
                    {' '}
                    <Trans>lei</Trans>
                  </>
                )}
              </td>
              <td className="py-1.5">{metricStatusLabel(value.status)}</td>
            </tr>
          ))}
          {/* The derived net, apart from its components: when it was computed, or held. */}
          {statement.netResult && statement.netResult.status !== 'missing' ? (
            <tr>
              <th scope="row" className="py-1.5 pr-3 text-left font-normal text-foreground">
                <Trans>Rezultat net, calculat din profit și pierdere</Trans>
              </th>
              <td className="py-1.5 pr-3 text-right font-semibold whitespace-nowrap tabular-nums text-foreground">
                {statement.netResult.value === null ? (
                  '—'
                ) : (
                  <>
                    <span>{exactDecimalText(statement.netResult.value, locale)}</span> <Trans>lei</Trans>
                  </>
                )}
              </td>
              <td className="py-1.5">{netResultStatusLabel(statement.netResult.status)}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      {statement.values.length === 0 ? (
        <p className="mt-1">
          <Trans>Bilanțul nu conține valori publicate.</Trans>
        </p>
      ) : null}
      {statement.holdReason ? <p className="mt-1 text-xs">{statement.holdReason}</p> : null}
      {source?.url ? (
        <p className="mt-1">
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
            {source.urlKind === 'mfp_resource' ? (
              <Trans>Fișierul publicat de Ministerul Finanțelor pe data.gov.ro, {statement.year}</Trans>
            ) : (
              <Trans>Bilanțul publicat de ANAF, {statement.year}</Trans>
            )}
          </a>
        </p>
      ) : null}
    </details>
  )
}
