import { entityInsDisplayedSelection } from "../lib/entity-ins-controls";
import { Trans, useLingui } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  // Classification axes are the series choice; the territorial axes are fixed by the
  // entity and only restate its area, so they read as a sentence and stay editable
  // under the advanced disclosure.
  const seriesAxes = dataset.dimensions.filter(
    (dimension) => dimension.type === "CLASSIFICATION",
  );
  const territorialAxes = dataset.dimensions.filter(
    (dimension) => dimension.type === "TERRITORIAL",
  );
  const unit = dataset.dimensions.find(
    (dimension) => dimension.type === "UNIT_OF_MEASURE",
  );

  const dimensionLabel = (dimension: (typeof dataset.dimensions)[number]) =>
    (i18n.locale === "en"
      ? (dimension.label_en ?? dimension.label_ro)
      : dimension.label_ro) ?? `D${dimension.index}`;

  const memberLabel = (axis: string) => {
    const code = resolved.scope.classifications.get(axis) ?? null;
    const member = rows
      .flatMap((row) => row.classifications)
      .find((value) => value.type_code === axis && value.code === code);
    return {
      code,
      label:
        (i18n.locale === "en"
          ? (member?.name_en ?? member?.name_ro)
          : member?.name_ro) ?? code,
    };
  };

  const unitLabel =
    rows.find((row) => row.unit.code === resolved.scope.unitCode)?.unit
      .name_ro ?? resolved.scope.unitCode;

  const criteriaParts = [
    ...[...seriesAxes, ...territorialAxes].flatMap((dimension) => {
      const { label } = memberLabel(`D${dimension.index}`);
      return label ? [`${dimensionLabel(dimension)}: ${label}`] : [];
    }),
    ...(unitLabel ? [`${t`Unit`}: ${unitLabel}`] : []),
    ...(resolved.scope.periodicity
      ? [`${t`Frequency`}: ${periodicityLabel(resolved.scope.periodicity)}`]
      : []),
  ];

  const renderAxis = (dimension: (typeof dataset.dimensions)[number]) => {
    const axis = `D${dimension.index}`;
    const { code, label } = memberLabel(axis);
    return (
      <div key={axis}>
        <DetailDimensionCombobox
          key={`${prepared.publicationKey}:${dimension.index}`}
          datasetCode={dataset.code}
          dimensionIndex={dimension.index}
          nativePublicationKey={prepared.publicationKey}
          onSourceRefresh={onSourceRefresh}
          label={dimensionLabel(dimension)}
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
              insSourcePins: editSourcePin(displayed.insSourcePins, axis, null),
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
  };

  return (
    <section className="space-y-3" aria-label={t`INS source selection`}>
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

      {seriesAxes.length > 0 ? (
        <div className="space-y-3 rounded-md border border-border bg-muted/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              <Trans>Series selector</Trans>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
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
              <Trans>Reset to default</Trans>
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {seriesAxes.map(renderAxis)}
          </div>
        </div>
      ) : null}

      {criteriaParts.length > 0 ? (
        <div className="text-[12px] leading-5 text-muted-foreground">
          <span className="font-semibold text-foreground/80">
            <Trans>Active series criteria:</Trans>
          </span>{" "}
          {criteriaParts.join(" • ")}
        </div>
      ) : null}

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            <Trans>Advanced: pin the source</Trans>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-3">
          <p className="text-xs text-muted-foreground">
            <Trans>
              The entity's area is fixed. Source dimensions describe how INS
              measured it; changing them does not change the entity.
            </Trans>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {territorialAxes.map(renderAxis)}
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
                selectedLabel={unitLabel}
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
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
