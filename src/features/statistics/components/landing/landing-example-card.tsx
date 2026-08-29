import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { LandingExample } from '../../lib/landing-example'
import {
  EXAMPLE_DATASET_CODE,
  EXAMPLE_LAU_SIRUTA,
} from '../../lib/landing-constants'
import { statisticsTheme } from '../../lib/statistics-theme'
import { formatObservationValue, formatPercent } from '../../lib/format'

type LandingExampleCardProps = {
  readonly example: LandingExample | null
}

/**
 * B3 — a WORKED comparison, not a picker: three live numbers on one
 * indicator, one takeaway line, and the whole card is a link into compare
 * with the mixed-level territory tokens prefilled.
 */
export function LandingExampleCard({ example }: LandingExampleCardProps) {
  if (!example) return null

  // The loud-degradation shape: every candidate year was rejected as
  // ambiguous. No numbers to show, but the note must still explain why the
  // card is empty — silence would hide a data defect.
  if (example.rows.length < 2) {
    if (example.ambiguousCellCount === 0) return null
    return (
      <section className="space-y-4" aria-labelledby="landing-example-heading">
        <h2 id="landing-example-heading" className={statisticsTheme.sectionTitle}>
          <Trans>Compară două locuri</Trans>
        </h2>
        <p
          role="status"
          className="rounded-md border border-dashed border-border/70 px-3 py-2 text-sm text-muted-foreground"
        >
          <AmbiguityNote />
        </p>
      </section>
    )
  }

  const lau = example.rows.find((row) => row.level === 'LAU')
  const takeaway =
    example.lauShareOfCounty !== null && lau ? (
      <Trans>
        {lau.name ?? lau.code} concentrează{' '}
        {formatPercent(example.lauShareOfCounty)} din salariații județului.
      </Trans>
    ) : null

  return (
    <section className="space-y-4" aria-labelledby="landing-example-heading">
      <div>
        <h2 id="landing-example-heading" className={statisticsTheme.sectionTitle}>
          <Trans>Compară două locuri</Trans>
        </h2>
        <p className={statisticsTheme.sectionSubtitle}>
          <Trans>
            Un exemplu viu: numărul mediu de salariați, pe trei niveluri
            teritoriale. Apasă pe card ca să pornești propria comparație.
          </Trans>
        </p>
      </div>

      <Link
        to="/statistici/comparatii"
        search={{
          cod: EXAMPLE_DATASET_CODE,
          teritorii: [`siruta:${EXAMPLE_LAU_SIRUTA}`, 'cod:CJ', 'cod:RO'],
        }}
        className="group block rounded-lg border border-border/70 bg-card p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <Badge variant="outline" className="text-xs">
            <Trans>exemplu live</Trans>
          </Badge>
          <ArrowRight
            aria-hidden
            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          />
        </div>

        <dl className="mt-3 grid gap-4 sm:grid-cols-3">
          {example.rows.map((row) => (
            <div key={row.code} className="min-w-0">
              <dt className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {rowDisplayName(row.level, row.name, row.code)}
              </dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
                {formatObservationValue(row.value) ?? '—'}
                {example.unitSymbol ? (
                  <span className="text-sm font-normal text-muted-foreground">
                    {' '}
                    {example.unitSymbol}
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>

        {takeaway ? <p className="mt-4 text-sm">{takeaway}</p> : null}

        {example.ambiguousCellCount > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            <AmbiguityNote />
          </p>
        ) : null}

        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className={statisticsTheme.provenanceChip}>
            {EXAMPLE_DATASET_CODE}
          </span>
          <Trans>INS Tempo · {example.year}</Trans>
        </p>
      </Link>
    </section>
  )
}

function AmbiguityNote() {
  return (
    <Trans>
      Unele perioade au fost omise: sursa raportează mai multe valori pentru
      aceeași combinație teritoriu-an, iar exemplul arată doar perioadele fără
      ambiguitate.
    </Trans>
  )
}

function rowDisplayName(
  level: string | null,
  name: string | null,
  code: string,
): string {
  // The API's national row is literally named "TOTAL" — render the country.
  if (level === 'NATIONAL') return t`România`
  return name ?? code
}
