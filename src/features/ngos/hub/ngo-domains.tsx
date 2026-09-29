import { useState } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import type { NgoHubDomainMetric } from '@/schemas/ngos'
import { DOMAIN_METRIC_FIELD, domainTotal, rankDomains } from './finance-figures'
import type { NgoFinanceDomain, NgoFinanceSummary } from './finance-summary-types'
import { formatNgoMoney, formatNgoNumber, formatNgoShare } from './ngo-format'
import { DOMAIN_LABEL } from './ngo-hub-labels'

const ROW_CLASS = 'grid grid-cols-[1.5rem_minmax(0,1fr)_auto] gap-x-3 py-2.5'
const FIGURE_CLASS = 'w-24 text-right text-sm tabular-nums sm:w-28'

/**
 * The domains ranked by one measure, each with its share of the year. An
 * organisation counts once, in the activity it declared, so the shares add
 * up — with the ones that declared the catch-all code as the last, unranked
 * row: it says they file, not what they do. The first `limit` show, the rest
 * a click away.
 */
export function NgoDomainRows({
  summary,
  metric,
  limit = 8,
  className,
}: {
  readonly summary: NgoFinanceSummary
  readonly metric: NgoHubDomainMetric
  readonly limit?: number
  readonly className?: string
}) {
  const { i18n } = useLingui()
  const [expanded, setExpanded] = useState(false)
  const field = DOMAIN_METRIC_FIELD[metric]
  const total = domainTotal(summary, metric)
  const { ranked, general } = rankDomains(summary, metric)
  const max = ranked[0]?.[field] ?? 1
  const shown = expanded ? ranked : ranked.slice(0, limit)
  const figure = (domain: NgoFinanceDomain) => {
    if (field === 'statements') return formatNgoNumber(domain.statements)
    const money = formatNgoMoney(domain.revenue)
    return (
      <>
        {money.value}
        <span className="ml-1 font-normal text-muted-foreground">{money.unit}</span>
      </>
    )
  }
  const share = (domain: NgoFinanceDomain) => (total > 0 ? formatNgoShare(domain[field] / total) : '—')
  const year = summary.year
  const domainCount = ranked.length
  const generalShare = general && summary.statements > 0 ? formatNgoShare(general.statements / summary.statements) : ''

  return (
    <div className={className} data-testid="ngo-hub-domains">
      <ol className="divide-y divide-border/70 border-y border-border/70">
        {shown.map((domain, index) => (
          <li key={domain.key} className={`${ROW_CLASS} items-center`}>
            <MonoLabel className="pl-1 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
            <span className="min-w-0">
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-foreground sm:truncate">{i18n._(DOMAIN_LABEL[domain.key])}</span>
                <MonoLabel className="shrink-0 tabular-nums text-muted-foreground">{share(domain)}</MonoLabel>
              </span>
              <span className="mt-1.5 block h-1.5 bg-muted/70" aria-hidden="true">
                <span className="block h-full bg-primary/70" style={{ width: `${Math.max(0.6, (domain[field] / max) * 100).toFixed(1)}%` }} />
              </span>
            </span>
            <span className={`${FIGURE_CLASS} whitespace-nowrap font-semibold text-foreground`}>{figure(domain)}</span>
          </li>
        ))}
      </ol>
      {general ? (
        <p className={`${ROW_CLASS} items-baseline border-b border-border/70`} data-testid="ngo-hub-domains-general">
          <span aria-hidden="true" />
          <span className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted-foreground">{i18n._(DOMAIN_LABEL.general)}</span>
            <MonoLabel className="shrink-0 tabular-nums text-muted-foreground">{share(general)}</MonoLabel>
          </span>
          <span className={`${FIGURE_CLASS} whitespace-nowrap text-muted-foreground`}>{figure(general)}</span>
        </p>
      ) : null}
      {ranked.length > limit ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="mt-3 inline-flex min-h-9 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {expanded ? (
            <Trans>Doar primele {limit}</Trans>
          ) : (
            <Plural value={domainCount} one="Un domeniu" few="Toate cele # domenii" other="Toate cele # de domenii" />
          )}
        </button>
      ) : null}
      <MonoLabel className="mt-4 block leading-relaxed text-muted-foreground">
        {general ? (
          <Trans>
            Activitatea declarată în situațiile financiare pe {year}. Fără domeniu precis: codul general „alte organizații”, declarat de{' '}
            {generalShare} dintre ele.
          </Trans>
        ) : (
          <Trans>Activitatea declarată în situațiile financiare pe {year}.</Trans>
        )}
      </MonoLabel>
    </div>
  )
}
