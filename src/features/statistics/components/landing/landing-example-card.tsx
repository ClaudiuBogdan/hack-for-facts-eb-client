import { landingSourceSearch } from '../../lib/landing-source-search'
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import type { buildNativeLandingExample } from '../../lib/native-landing'
import { statisticsTheme } from '../../lib/statistics-theme'
import {
  LandingIssues,
  LandingSource,
  LandingSourceCell,
} from './landing-source'

/** Fixed source-compatible territories; the common year is explicit, never a hidden fallback. */
export function LandingExampleCard({
  example,
}: {
  readonly example: ReturnType<typeof buildNativeLandingExample>
}) {
  return (
    <section className="space-y-4" aria-labelledby="landing-example-heading">
      <h2 id="landing-example-heading" className={statisticsTheme.sectionTitle}>
        <Trans>Compară trei niveluri teritoriale</Trans>
      </h2>
      <p className={statisticsTheme.sectionSubtitle}>
        <Trans>
          Numărul mediu de salariați în România, județul Cluj și Cluj-Napoca.
        </Trans>
      </p>
      {example.status === 'UNAVAILABLE' ? (
        <>
          <p role="status">
            <Trans>
              Exemplul nu are trei serii comparabile cu valori eligibile într-un
              an comun.
            </Trans>
          </p>
          {example.year !== null ? (
            <p>
              <Trans>An comun verificat:</Trans> {example.year}
            </p>
          ) : null}
          <LandingIssues issues={example.issues} source={example.source} />
          <Link
            to="/statistici/comparatii"
            search={{
              cod: 'FOM104D',
              teritorii: ['cod:RO', 'cod:CJ', 'siruta:54975'],
              clasificari: example.source.classificationPins,
              unitate: example.source.unitCode,
              frecventa: 'ANNUAL',
            }}
            className="text-sm underline"
          >
            <Trans>Inspectează comparația</Trans>
          </Link>
        </>
      ) : (
        <div className="space-y-4 rounded-lg border border-border/70 bg-card p-4 md:p-6">
          <p className="text-sm">
            <Trans>
              Cel mai recent an cu valori numerice pentru toate cele trei
              teritorii:
            </Trans>{' '}
            <strong>{example.year}</strong>
          </p>
          <dl className="grid gap-4 sm:grid-cols-3">
            {example.rows.map((row) => (
              <div key={row.code} className="min-w-0">
                <dt className="text-sm text-muted-foreground">
                  {row.code === 'RO' ? (
                    <Trans>România</Trans>
                  ) : (
                    (row.name ?? row.code)
                  )}
                </dt>
                <dd className="mt-1 text-xl font-semibold">
                  <Link
                    to="/statistici/seturi/$cod"
                    params={{ cod: 'FOM104D' }}
                    search={{
                      ...landingSourceSearch(
                        example.source,
                        row.code,
                        row.observation,
                      ),
                      din: example.year,
                      pana: example.year,
                    }}
                    className="underline-offset-4 hover:underline"
                  >
                    <LandingSourceCell observation={row.observation} />
                  </Link>
                </dd>
              </div>
            ))}
          </dl>
          {example.latestYearByTerritory
            .filter((row) => row.year > example.year)
            .map((row) => (
              <p key={row.code} className="text-xs text-muted-foreground">
                {example.rows.find((r) => r.code === row.code)?.name ??
                  row.code}
                : <Trans>valoare raportată și în</Trans> {row.year} ·{' '}
                <LandingSourceCell observation={row.observation} />
              </p>
            ))}
          <Link
            to="/statistici/comparatii"
            search={{
              cod: 'FOM104D',
              teritorii: ['cod:RO', 'cod:CJ', 'siruta:54975'],
              clasificari: example.source.classificationPins,
              unitate: example.source.unitCode,
              frecventa: 'ANNUAL',
              perioada: String(example.year),
            }}
            className="inline-block text-sm underline"
          >
            <Trans>Deschide comparația</Trans>
          </Link>
        </div>
      )}
      <LandingSource source={example.source} />
    </section>
  )
}
