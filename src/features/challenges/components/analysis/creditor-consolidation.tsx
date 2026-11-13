import { t } from '@lingui/core/macro'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { formatDecimal } from '@/lib/exact-decimal'
import { graphqlQuery } from '@/lib/graphql/graphql-client'

const money = z.string().regex(/^-?\d+(\.\d{1,2})?$/)
const response = z.object({
  budgetCreditorConsolidation: z.object({
    sectors: z.array(z.number().int()),
    estimate: z.object({
      sector: z.number().int(),
      reportedIncome: money,
      reportedSpending: money,
      income: money,
      spending: money,
      balance: money,
      eliminated: money,
      source: z.string().url(),
    }).nullable(),
  }).nullable(),
})
const query = `
  query CreditorConsolidation($cui: CUI!, $year: Int!, $frequency: BudgetFrequency!) {
    budgetCreditorConsolidation(cui: $cui, year: $year, frequency: $frequency) {
      sectors
      estimate { sector reportedIncome reportedSpending income spending balance eliminated source }
    }
  }
`

interface Props {
  readonly cui: string
  readonly year: number
  readonly frequency: 'YEAR' | 'QUARTER' | 'MONTH'
  readonly locale: 'ro' | 'en'
}

export function CreditorConsolidation({ cui, year, frequency, locale }: Props) {
  const [active, setActive] = useState(false)
  const result = useQuery({
    queryKey: ['creditor-consolidation', cui, year, frequency],
    enabled: active,
    retry: false,
    queryFn: async ({ signal }) => response.parse(await graphqlQuery(query, { cui, year, frequency }, {
      operationName: 'CreditorConsolidation', signal, auth: 'none',
    })).budgetCreditorConsolidation,
  })
  const estimate = result.data?.estimate
  const format = (amount: string) => formatDecimal(amount, locale, 2)
  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" size="sm" aria-expanded={active} onClick={() => setActive(!active)}>
        {active ? t`Hide consolidation estimate` : t`Show consolidation estimate`}
      </Button>
      {active && (
        <section className="space-y-2 rounded-md border p-4" aria-label={t`Consolidation estimate`}>
          {result.isPending ? <p role="status">{t`Loading consolidation evidence…`}</p> :
            result.isError ? <p role="status">{t`Could not load consolidation evidence.`}</p> :
              estimate ? (
                <>
                  <p className="font-medium">{t`Partial consolidation with verified transfers`}</p>
                  <p className="text-sm">{t`Local budget · Sector ${estimate.sector} · Year-end ${year}`}</p>
                  <p className="text-sm text-muted-foreground">{t`Some internal transfers may still be included. Amounts are in nominal RON.`}</p>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt>{t`Reported revenue`}</dt><dd>{format(estimate.reportedIncome)}</dd>
                    <dt>{t`Revenue after elimination`}</dt><dd>{format(estimate.income)}</dd>
                    <dt>{t`Reported spending`}</dt><dd>{format(estimate.reportedSpending)}</dd>
                    <dt>{t`Spending after elimination`}</dt><dd>{format(estimate.spending)}</dd>
                    <dt>{t`Cash balance`}</dt><dd>{format(estimate.balance)}</dd>
                    <dt>{t`Removed from each side`}</dt><dd>{format(estimate.eliminated)}</dd>
                  </dl>
                  <a href={estimate.source} className="text-sm underline" target="_blank" rel="noreferrer">
                    {t`Official transfer evidence`}
                  </a>
                </>
              ) : <p role="status">{t`Consolidation evidence is unavailable for this period and scope.`}</p>}
        </section>
      )}
    </div>
  )
}
