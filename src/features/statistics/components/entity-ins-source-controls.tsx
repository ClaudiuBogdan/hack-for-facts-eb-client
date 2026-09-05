import { entityInsDisplayedSelection } from "../lib/entity-ins-controls";
import { Trans, useLingui } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EntityInsSelectionInput } from "@/lib/ins/entity-source-search";
import type { PreparedEntityInsSource } from "../api/native-entity-ins-api";
import { entityInsSourcePatch } from "../lib/entity-ins-selection";
import { editSourcePin } from "../lib/source-selection";
import { periodicityLabel } from "../lib/periodicity-labels";
import { DetailDimensionCombobox } from "./detail-dimension-combobox";

export function EntityInsSourceControls({
  prepared,
  observations = [],
  onChange,
  onSourceRefresh,
}: {
  readonly observations?: readonly import("@/schemas/ins").NativeInsObservation[];
  readonly prepared: PreparedEntityInsSource;
  readonly onSourceRefresh: () => void;
  readonly onChange: (patch: EntityInsSelectionInput) => void;
}) {
  const { i18n } = useLingui();
  const { dataset, resolved, selection, latest } = prepared;
  const displayed = entityInsDisplayedSelection(prepared);
  const change = (patch: EntityInsSelectionInput) =>
    onChange(entityInsSourcePatch({ ...displayed, ...patch }));
  const rows = observations.length
    ? observations
    : latest?.source?.observation
      ? [latest.source.observation]
      : [];
  const axes = dataset.dimensions.filter(
    (dimension) =>
      dimension.type === "CLASSIFICATION" || dimension.type === "TERRITORIAL",
  );
  const unit = dataset.dimensions.find(
    (dimension) => dimension.type === "UNIT_OF_MEASURE",
  );
  return (
    <section className="space-y-4" aria-label={t`INS source selection`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          <Trans>Source selection</Trans>
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange(
              entityInsSourcePatch({
                insSourcePins: undefined,
                insSourceUnit: undefined,
                insSourceCadence: undefined,
              }),
            )
          }
        >
          <Trans>Use source defaults</Trans>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        <Trans>
          The entity's area is fixed. Source dimensions describe how INS
          measured it; changing them does not change the entity.
        </Trans>
      </p>
      {selection.issues.length > 0 || resolved.issues.length > 0 ? (
        <p role="alert">
          <Trans>
            The link contains an invalid source selection. Correct its fields or
            reset the selection.
          </Trans>
        </p>
      ) : null}
      {selection.issues.includes("classifications") ||
      resolved.issues.includes("classifications") ? (
        <Button
          variant="outline"
          onClick={() => change({ insSourcePins: undefined })}
        >
          <Trans>Clear invalid source dimensions</Trans>
        </Button>
      ) : null}
      {selection.issues.length > 0 || resolved.issues.length > 0 ? (
        <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all text-xs">
          {JSON.stringify({
            dimensions: selection.classifications,
            unit: selection.unit,
            frequency: selection.rawCadence,
          })}
        </pre>
      ) : null}
      {selection.issues.includes("unit") || resolved.issues.includes("unit") ? (
        <Button
          variant="outline"
          onClick={() => change({ insSourceUnit: undefined })}
        >
          <Trans>Clear invalid unit</Trans>
        </Button>
      ) : null}
      {selection.issues.includes("cadence") ? (
        <Button
          variant="outline"
          onClick={() => change({ insSourceCadence: undefined })}
        >
          <Trans>Clear invalid frequency</Trans>
        </Button>
      ) : null}
      {resolved.filter === null && resolved.issues.length === 0 ? (
        <p role="status">
          <Trans>
            Choose values for all geographic source dimensions to inspect this
            selection.
          </Trans>
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {axes.map((dimension) => {
          const axis = `D${dimension.index}`;
          const code = resolved.scope.classifications.get(axis) ?? null;
          const member = rows
            .flatMap((row) => row.classifications)
            .find((value) => value.type_code === axis && value.code === code);
          const label =
            (i18n.locale === "en"
              ? (member?.name_en ?? member?.name_ro)
              : member?.name_ro) ?? code;
          return (
            <div key={axis}>
              <DetailDimensionCombobox
                key={`${prepared.publicationKey}:${dimension.index}`}
                datasetCode={dataset.code}
                dimensionIndex={dimension.index}
                nativePublicationKey={prepared.publicationKey}
                onSourceRefresh={onSourceRefresh}
                label={
                  (i18n.locale === "en"
                    ? (dimension.label_en ?? dimension.label_ro)
                    : dimension.label_ro) ?? axis
                }
                placeholder={t`Choose a source value`}
                selectedKey={code}
                selectedLabel={label}
                optionKey={(value) => value.classification_value?.code ?? null}
                onSelect={(value) => {
                  if (value.classification_value?.code != null)
                    change({
                      insSourcePins: editSourcePin(
                        displayed.insSourcePins,
                        axis,
                        value.classification_value.code,
                      ),
                    });
                }}
                onClear={() =>
                  change({
                    insSourcePins: editSourcePin(
                      displayed.insSourcePins,
                      axis,
                      null,
                    ),
                  })
                }
              />
              {resolved.scope.defaultedTypes.has(axis) ? (
                <p className="text-xs text-muted-foreground">
                  <Trans>Source default</Trans>
                </p>
              ) : null}
            </div>
          );
        })}
        {unit ? (
          <DetailDimensionCombobox
            key={`${prepared.publicationKey}:${unit.index}`}
            datasetCode={dataset.code}
            dimensionIndex={unit.index}
            nativePublicationKey={prepared.publicationKey}
            onSourceRefresh={onSourceRefresh}
            label={t`Unit`}
            placeholder={t`Choose a unit`}
            selectedKey={resolved.scope.unitCode}
            selectedLabel={
              rows.find((row) => row.unit.code === resolved.scope.unitCode)
                ?.unit.name_ro ?? resolved.scope.unitCode
            }
            optionKey={(value) => value.unit?.code ?? null}
            onSelect={(value) => {
              if (value.unit) change({ insSourceUnit: value.unit.code });
            }}
            onClear={() => change({ insSourceUnit: undefined })}
          />
        ) : null}
        <div className="space-y-1.5">
          <Label>
            <Trans>Frequency</Trans>
          </Label>
          <Select
            value={resolved.scope.periodicity ?? ""}
            onValueChange={(value) => change({ insSourceCadence: value })}
          >
            <SelectTrigger aria-label={t`INS frequency`}>
              <SelectValue placeholder={t`Choose a frequency`} />
            </SelectTrigger>
            <SelectContent>
              {dataset.periodicity.map((cadence) => (
                <SelectItem key={cadence} value={cadence}>
                  {periodicityLabel(cadence)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
