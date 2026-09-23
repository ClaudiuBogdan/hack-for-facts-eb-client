import { plural } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { InsDatasetDetails } from '@/schemas/ins'
import { dimensionTypeLabel } from '../lib/dimension-labels'
import { statisticsTheme } from '../lib/statistics-theme'
import { DetailDefinition } from './detail-definition'
import { RequestDatasetAction } from './request-dataset-action'

type Props = {
  readonly dataset: InsDatasetDetails
  /** The definition in the reader's language, when INS published one. */
  readonly definition: string | null
}

/**
 * Catalog-only datasets carry metadata and dimensions but zero observations.
 * Showing a filter bar over an empty fact table would promise data that does
 * not exist, so the whole observations surface is replaced by the dimension
 * list plus the request action.
 */
export function DetailCatalogOnly({ dataset, definition }: Props) {
  return (
    <section className="space-y-6" data-testid="catalog-only-body">
      {/* A catalog-only matrix is exactly the case where what it measures is
          all the page can say. */}
      {definition ? <DetailDefinition text={definition} /> : null}
      <Alert>
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>
          <Trans>Set de date fără observații încărcate</Trans>
        </AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            <Trans>
              Cunoaștem structura acestei matrice din catalogul INS, dar nu i-am
              încărcat încă datele. Poți cere prioritizarea ei.
            </Trans>
          </p>
          <RequestDatasetAction
            datasetCode={dataset.code}
            datasetName={dataset.name_ro ?? null}
          />
        </AlertDescription>
      </Alert>

      <div className={statisticsTheme.band}>
        <div className={statisticsTheme.bandHeader}>
          <h2 className={statisticsTheme.sectionLabel}>
            <Trans>Dimensiuni</Trans>
          </h2>
          <p className="text-xs tabular-nums text-muted-foreground">
            {plural(dataset.dimensions?.length ?? 0, {
              one: 'o axă',
              few: '# axe',
              other: '# de axe',
            })}
          </p>
        </div>
        <ul className="divide-y divide-border/70">
          {(dataset.dimensions ?? []).map((dimension) => (
            <li
              key={dimension.index}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            >
              <span className="min-w-0">
                {dimension.label_ro ?? `#${dimension.index}`}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {dimensionTypeLabel(dimension.type)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
