import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { Database } from 'lucide-react'
import type { StatisticsLandingCatalog } from '@/schemas/statistics'
import { formatObservationValue } from '../../lib/format'

type LandingHonestySectionProps = {
  readonly catalog: StatisticsLandingCatalog | undefined
  readonly catalogError: boolean
}

/**
 * B5 — „Ce date avem". Live loaded-vs-catalog counts from the aliased probe;
 * never a fake figure (this band is exempt from the observation guard — it is
 * ABOUT the data, not data). When catalog-only datasets exist, the
 * request-dataset flow lives behind the explorer's catalog-only filter.
 */
export function LandingHonestySection({
  catalog,
  catalogError,
}: LandingHonestySectionProps) {
  if (catalogError) {
    return (
      <section aria-labelledby="landing-honesty-heading">
        <h2 id="landing-honesty-heading" className="sr-only">
          <Trans>Ce date avem</Trans>
        </h2>
        <p className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
          <Trans>
            Nu am putut încărca acoperirea catalogului. Cifrele afișate mai sus
            rămân reale — fiecare își arată perioada de referință.
          </Trans>
        </p>
      </section>
    )
  }

  if (!catalog) return null

  const catalogOnlyCount = Math.max(catalog.catalogCount - catalog.loadedCount, 0)
  const loaded = formatObservationValue(String(catalog.loadedCount))
  const total = formatObservationValue(String(catalog.catalogCount))

  return (
    <section
      aria-labelledby="landing-honesty-heading"
      className="rounded-lg border border-border/70 bg-muted/30 p-4 md:p-6"
    >
      <h2
        id="landing-honesty-heading"
        className="flex items-center gap-2 text-sm font-semibold"
      >
        <Database className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Trans>Ce date avem</Trans>
      </h2>

      <p className="mt-2 text-sm text-muted-foreground">
        {catalogOnlyCount > 0 ? (
          <Trans>
            {loaded} din {total} seturi din catalogul INS Tempo au observații
            încărcate aici.
          </Trans>
        ) : (
          <Trans>
            Toate cele {total} seturi din catalogul INS Tempo au observații
            încărcate aici.
          </Trans>
        )}{' '}
        <Trans>
          Datele sunt un instantaneu INS Tempo — fiecare cifră își arată propria
          perioadă de referință.
        </Trans>
      </p>

      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link
          to="/statistici/seturi"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          <Trans>Deschide catalogul complet</Trans>
        </Link>
        {catalogOnlyCount > 0 ? (
          <Link
            to="/statistici/seturi"
            search={{ stare: 'catalog-only' }}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            <Trans>
              {formatObservationValue(String(catalogOnlyCount))} seturi doar în
              catalog — cere încărcarea lor
            </Trans>
          </Link>
        ) : null}
      </p>
    </section>
  )
}
