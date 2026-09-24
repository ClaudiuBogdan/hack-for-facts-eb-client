import { detailBootstrapEntity, resolveDetailSelection } from '../lib/source-selection'
import { useEffect, useMemo } from 'react'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { createLogger } from '@/lib/logger'
import type {
  StatisticsDatasetDetailSearch,
  StatisticsDatasetTier0,
} from '@/schemas/statistics'
import { DetailBody } from '../components/detail/detail-body'
import { DetailCatalogOnly } from '../components/detail/detail-catalog-only'
import { DetailHeader } from '../components/detail/detail-header'
import { DetailMetadataSection } from '../components/detail/detail-metadata-section'
import { DetailBandSkeleton, DetailHeaderSkeleton } from '../components/detail/detail-skeletons'
import { StatisticsBackLink } from '../components/statistics-back-link'
import {
  useDatasetSeries,
  useDatasetTier0,
  useRelatedDatasets,
} from '../hooks/use-dataset-detail'
import type { DetailSearchPatch } from '../lib/dataset-selection'
import { datasetDisplayName } from '../lib/dataset-names'
import { getDatasetDataStatus } from '../lib/dataset-status'
import type { ResolvedDatasetSeries } from '../lib/detail-series-resolution'

const logger = createLogger('ins-dataset-detail')

type Props = {
  readonly code: string
  readonly search: StatisticsDatasetDetailSearch
  readonly onSearchChange: (patch: DetailSearchPatch) => void
  readonly initialTier0?: StatisticsDatasetTier0
  readonly initialSeries?: ResolvedDatasetSeries
}

/**
 * The dataset detail — a disclosure ladder:
 *
 * - Tier 0 needs ZERO interactions: header + the resolved latest value
 *   LARGE, the trend chart under it, and a rail naming the defaults.
 * - Tier 1: the rail is the control surface.
 * - Tiers 2–3: one closed accordion (table with count, axes, coverage,
 *   provenance, related sets). Tier 4 (compare) is a link out.
 *
 * Two reads decide the page: the dataset with its server-resolved cell
 * (POST A), and the series that address resolves to — the same
 * `resolveDatasetSeries` the route loader runs on the server, so the HTML
 * already shows the series where the browser used to discover it in three
 * reads after hydration. The cell that resolution chose travels with the
 * series, so the rail marks it as a default rather than as the reader's.
 *
 * The app shell owns the <main> landmark.
 */
export function StatisticsDatasetDetailPage({
  code: rawCode,
  search,
  onSearchChange,
  initialTier0,
  initialSeries,
}: Props) {
  const { i18n } = useLingui()
  const code = rawCode.trim().toUpperCase()

  const entity = detailBootstrapEntity(search)
  const tier0Query = useDatasetTier0({
    code,
    entity,
    ...(initialTier0 ? { initialData: initialTier0 } : {}),
  })
  const tier0 = tier0Query.data
  const dataset = tier0?.dataset ?? null
  // A placeholder is the previous entity's read: its dataset is this one,
  // its resolved cell is not — and a stale national cell would seed a
  // complete read of the wrong cell under the new scope's key.
  const latest = tier0Query.isPlaceholderData ? null : (tier0?.latest ?? null)
  const isCatalogOnly = dataset ? getDatasetDataStatus(dataset) === 'catalog-only' : false

  const seriesQuery = useDatasetSeries({
    code,
    search,
    dataset,
    latest,
    enabled: dataset !== null && !isCatalogOnly && !tier0Query.isPlaceholderData,
    ...(initialSeries ? { initialData: initialSeries } : {}),
  })
  const representative = seriesQuery.data?.representative ?? null

  const selection = useMemo(
    () => resolveDetailSelection({ search, dataset, latest, representative }),
    [search, dataset, latest, representative],
  )
  const { scope, unresolvedDimensions } = selection
  const relatedQuery = useRelatedDatasets(dataset?.context_code ?? null)


  // A client-side navigation lands with the route's placeholder title; the
  // server render already carries the full one, so this is a no-op there.
  useClientDocumentTitle(
    dataset
      ? `${datasetDisplayName({ code: dataset.code, nameRo: dataset.name_ro ?? null, nameEn: dataset.name_en ?? null }, i18n.locale)} (${dataset.code}) — Transparenta.eu`
      : null,
  )

  // The published description in the reader's language, Romanian otherwise.
  const english = i18n.locale.toLowerCase().startsWith('en')
  const definition = (english ? dataset?.definition_en : null) ?? dataset?.definition_ro ?? null

  // A matrix whose published structure fails the source layout is not a bad
  // address: the reader can do nothing about it, and the server should hear.
  const descriptorIssue = dataset !== null && selection.issues.includes('descriptor')
  useEffect(() => {
    if (descriptorIssue) logger.warn('INS dataset fails the source layout schema', { code })
  }, [descriptorIssue, code])
  const addressIssues = selection.issues.filter((issue) => issue !== 'descriptor')

  return (
    <div className="min-h-screen bg-background">
      {/* The same column as the catalog this page opens from
          (`max-w-6xl`): at 5xl, clicking a row and coming back shifted the
          page 64px sideways and changed the measure by 128px. */}
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-6">
        {/* The way out and the identity of the dataset, one block closed by a
            rule — the same header shape the catalog page opens with. It is
            rendered once here rather than inside each branch, so the title
            does not move when the body swaps between states. */}
        <div>
          <StatisticsBackLink to="/ins/seturi">
            <Trans>Înapoi la seturi de date</Trans>
          </StatisticsBackLink>
          {dataset ? <DetailHeader dataset={dataset} /> : null}
          {tier0Query.isPending ? <DetailHeaderSkeleton /> : null}
        </div>

        {tier0Query.isPending ? <DetailBandSkeleton /> : null}

        {tier0Query.isError ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>
              <Trans>Nu am putut încărca setul de date</Trans>
            </AlertTitle>
            <AlertDescription className="space-y-3">
              <p>
                <Trans>Adresa rămâne neschimbată. Poți încerca din nou.</Trans>
              </p>
              <Button variant="outline" size="sm" onClick={() => void tier0Query.refetch()}>
                <Trans>Reîncearcă</Trans>
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {tier0Query.isSuccess && !dataset ? (
          <EmptyState
            title={t`Set de date negăsit`}
            description={t`Nu am găsit o matrice INS cu acest cod.`}
          />
        ) : null}

        {dataset && isCatalogOnly ? (
          <>
            <DetailCatalogOnly dataset={dataset} definition={definition} />
            <DetailMetadataSection dataset={dataset} />
          </>
        ) : null}

        {descriptorIssue ? (
          <Alert variant="destructive">
            <AlertTitle>
              <Trans>Structura acestei matrice nu poate fi verificată</Trans>
            </AlertTitle>
            <AlertDescription>
              <Trans>
                Descrierea publicată de INS pentru această matrice nu are forma
                așteptată, așa că seria nu poate fi citită în siguranță. Am
                înregistrat problema.
              </Trans>
            </AlertDescription>
          </Alert>
        ) : null}

        {dataset && addressIssues.length > 0 ? (
          <Alert variant="destructive">
            <AlertTitle>
              <Trans>Selecția din adresă nu poate fi aplicată</Trans>
            </AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                <Trans>
                  Corectează selecția sau șterge filtrul invalid. Nu am folosit
                  date implicite în locul lui.
                </Trans>
              </p>
              {addressIssues.includes('territory') ? (
                <Button onClick={() => onSearchChange({ teritoriu: undefined })}>
                  <Trans>Șterge teritoriul invalid</Trans>
                </Button>
              ) : null}
              {addressIssues.includes('classifications') ? (
                <Button onClick={() => onSearchChange({ clasificari: undefined })}>
                  <Trans>Șterge clasificările invalide</Trans>
                </Button>
              ) : null}
              {addressIssues.includes('unit') ? (
                <Button onClick={() => onSearchChange({ unitate: undefined })}>
                  <Trans>Șterge unitatea invalidă</Trans>
                </Button>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        {dataset && !isCatalogOnly ? (
          <DetailBody
            dataset={dataset}
            definition={definition}
            search={search}
            scope={scope}
            latest={latest}
            seriesQuery={seriesQuery}
            canDerive={selection.canDerive}
            unresolvedDimensions={unresolvedDimensions}
            related={(relatedQuery.data?.datasets ?? []).filter((entry) => entry.code !== dataset.code)}
            relatedTotalCount={relatedQuery.data?.totalCount ?? null}
            onSearchChange={onSearchChange}
          />
        ) : null}
      </div>
    </div>
  )
}
