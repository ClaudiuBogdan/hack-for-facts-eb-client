import { Trans } from "@lingui/react/macro";
import { Button } from "@/components/ui/button";
import { createLogger } from "@/lib/logger";
import type { EntityDetailsData } from "@/lib/api/entities";
import type { EntityInsSelectionInput } from "@/lib/ins/entity-source-search";
import type { ReportPeriodInput } from "@/schemas/reporting";
import { useEntityInsSource } from "../hooks/use-entity-ins-source";
import { resolveEntityInsSelection } from "../lib/entity-ins-selection";
import { ComparisonDatasetError } from "../lib/comparison-dataset-error";
import { EntityInsDatasetPicker } from "./entity-ins-dataset-picker";
import { EntityInsSourceControls } from "./entity-ins-source-controls";
import { EntityInsSourceHistory } from "./entity-ins-source-history";

const logger = createLogger("native-entity-ins");

/** Entity source reads use canonical geographic metadata, independently of fiscal authority. */
export function NativeEntityInsView({
  cui,
  metadata,
  metadataReady,
  search,
  reportPeriod,
  onChange,
}: {
  readonly cui: string;
  readonly metadata: Pick<EntityDetailsData, "cui" | "uat"> | null | undefined;
  readonly metadataReady: boolean;
  readonly search: EntityInsSelectionInput;
  readonly reportPeriod: ReportPeriodInput;
  readonly onChange: (patch: EntityInsSelectionInput) => void;
}) {
  const source = useEntityInsSource({
    cui,
    metadata,
    metadataReady,
    search,
    enabled: true,
  });
  const selection = resolveEntityInsSelection(search);
  const busy =
    source.contextQuery.isFetching ||
    source.preparationQuery.isFetching ||
    source.historyQuery.isFetching;
  const error =
    source.contextQuery.error ??
    source.preparationQuery.error ??
    source.historyQuery.error;
  const refresh = () => {
    void source
      .refresh()
      .catch((error: unknown) =>
        logger.error("INS source refresh failed", { cui, error }),
      );
  };
  if (!metadataReady || metadata?.cui !== cui)
    return (
      <p role="status">
        <Trans>Loading the entity's geographic context…</Trans>
      </p>
    );
  if (!metadata.uat)
    return (
      <p role="status">
        <Trans>
          This entity has no canonical geographic area linked to INS.
        </Trans>
      </p>
    );
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">
            <Trans>INS statistics</Trans>
          </h2>
          {source.context ? (
            <p className="text-sm text-muted-foreground">
              {source.context.territoryName} · {source.context.territoryCode}
            </p>
          ) : null}
        </div>
        <Button variant="outline" disabled={busy} onClick={refresh}>
          <Trans>Refresh source</Trans>
        </Button>
      </div>
      {busy ? (
        <p role="status">
          <Trans>Loading INS source data…</Trans>
        </p>
      ) : null}
      {error ? (
        <p role="alert">
          {error instanceof ComparisonDatasetError ? (
            error.reason === "CATALOG_ONLY" ? (
              <Trans>
                This dataset is in the catalog, but its observations are not
                published.
              </Trans>
            ) : (
              <Trans>
                This dataset was not found. Choose another dataset below.
              </Trans>
            )
          ) : (
            <Trans>
              INS source data could not be loaded or verified. Refresh the
              source to retry.
            </Trans>
          )}
        </p>
      ) : null}
      {!busy && source.contextQuery.isSuccess && !source.context ? (
        <p>
          <Trans>The entity's area is not mapped to an INS territory.</Trans>
        </p>
      ) : null}
      {source.context ? (
        <>
          {source.context.datasetCount === 0 ? (
            <p role="status">
              <Trans>
                No published datasets currently cover this area. You can still
                search the general catalog.
              </Trans>
            </p>
          ) : null}
          <details
            open={
              selection.datasetCode === null || !!source.preparationQuery.error
            }
            className="space-y-3 rounded-md border p-4"
          >
            <summary className="cursor-pointer text-sm font-semibold">
              <Trans>Dataset</Trans>
              {selection.datasetCode ? ` · ${selection.datasetCode}` : ""}
            </summary>
            <EntityInsDatasetPicker
              selectedCode={selection.datasetCode}
              onSelect={(code) =>
                onChange({
                  insDataset: code,
                  insSeries: undefined,
                  insUnit: undefined,
                  insTemporal: undefined,
                  insSourcePins: undefined,
                  insSourceUnit: undefined,
                  insSourceCadence: undefined,
                })
              }
            />
          </details>
          {selection.issues.includes("dataset") ? (
            <p role="alert">
              <Trans>
                The dataset in this link is invalid. Select a dataset from the
                catalog.
              </Trans>
            </p>
          ) : null}
          {source.prepared ? (
            <>
              <div className="space-y-1">
                <h3 className="text-base font-semibold">
                  {source.prepared.dataset.name_ro ??
                    source.prepared.dataset.code}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {source.prepared.dataset.code} ·{" "}
                  <Trans>Source: INS TEMPO</Trans>
                </p>
              </div>
              <EntityInsSourceControls
                prepared={source.prepared}
                observations={source.history?.observations}
                onChange={onChange}
                onSourceRefresh={refresh}
              />
              {source.history ? (
                <EntityInsSourceHistory
                  key={JSON.stringify([
                    source.prepared.publicationKey,
                    source.prepared.resolved.filter,
                    source.prepared.resolved.scope.periodicity,
                    reportPeriod,
                  ])}
                  prepared={source.prepared}
                  history={source.history}
                  reportPeriod={reportPeriod}
                  onChange={onChange}
                />
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
