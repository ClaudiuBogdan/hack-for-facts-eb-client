import type { InsDataset, NativeInsObservation } from "@/schemas/ins";
import {
  INS_ROOT_CONTEXTS,
  INS_PRIORITIZED_DATASET_CODES_BY_LEVEL,
} from "@/lib/ins/ins-metric-registry";
import {
  findMetadataText,
  formatDatasetPeriodicity,
} from "@/components/entities/views/ins-stats-view.formatters";
import type { DatasetExplorerGroup } from "@/components/entities/views/ins-stats-view.types";
import type { DatasetDetailsCardModel } from "@/components/entities/views/ins-stats-view.presentation";
import { computeDerivedIndicators } from "@/components/entities/views/ins-stats-view.derived";
// Native catalog paths contain human-readable breadcrumbs, not the legacy dotted codes.
function nativeContext(path: string | null | undefined) {
  const parts = (path ?? "")
    .split(">")
    .map((value) => value.trim())
    .filter(Boolean);
  const letter = /^([A-H])\./.exec(parts[0] ?? "")?.[1];
  const root = INS_ROOT_CONTEXTS.find((item) => item.shortLabel === letter);
  return { root, rootCode: root?.code ?? "other", section: parts[1] ?? null };
}
export function entityInsDatasetGroups(
  datasets: readonly InsDataset[],
  locale: "ro" | "en",
  level: "uat" | "county" = "uat",
): DatasetExplorerGroup[] {
  const groups = new Map<string, DatasetExplorerGroup>();
  const priority = INS_PRIORITIZED_DATASET_CODES_BY_LEVEL[level];
  const ordered = [...datasets].sort((a, b) => {
    const pa = priority.indexOf(a.code),
      pb = priority.indexOf(b.code);
    return (
      (pa < 0 ? Infinity : pa) - (pb < 0 ? Infinity : pb) ||
      a.code.localeCompare(b.code)
    );
  });
  for (const dataset of ordered) {
    const {
      root: meta,
      rootCode,
      section: sectionCode,
    } = nativeContext(dataset.context_path);
    const group = groups.get(rootCode) ?? {
      code: rootCode,
      shortLabel: meta?.shortLabel ?? rootCode,
      label: meta?.label ?? (locale === "ro" ? "Altele" : "Other"),
      totalCount: 0,
      sections: [],
      unsectionedDatasets: [],
    };
    if (sectionCode) {
      let section = group.sections.find((item) => item.code === sectionCode);
      if (!section) {
        section = {
          code: sectionCode,
          label: sectionCode,
          datasets: [],
        };
        group.sections.push(section);
      }
      section.datasets.push(dataset);
    } else group.unsectionedDatasets.push(dataset);
    group.totalCount++;
    groups.set(rootCode, group);
  }
  return [...groups.values()].sort((a, b) => a.code.localeCompare(b.code));
}
export function entityInsDetailModel(
  dataset: InsDataset,
  locale: "ro" | "en",
): DatasetDetailsCardModel {
  const { root, rootCode } = nativeContext(dataset.context_path);
  const title =
    (locale === "en" ? dataset.name_en : dataset.name_ro) ||
    dataset.name_ro ||
    dataset.code;
  const hierarchy: DatasetDetailsCardModel["hierarchy"] = [
    { code: "ins", label: "INS Tempo", kind: "home", rootCode },
  ];
  if (root)
    hierarchy.push({
      code: rootCode,
      label: root.label,
      kind: "context",
      rootCode,
    });
  hierarchy.push({
    code: dataset.code,
    label: dataset.code,
    kind: "dataset",
    rootCode,
  });
  return {
    code: dataset.code,
    title,
    hierarchy,
    rootContextCode: rootCode,
    rootContextBreadcrumbLabel: root?.label ?? null,
    contextLabel: dataset.context_name_ro ?? null,
    periodicityLabel: formatDatasetPeriodicity(dataset.periodicity),
    yearRange: dataset.year_range?.join(" – ") ?? null,
    dimensionCount: dataset.dimension_count?.toString() ?? null,
    definition:
      (locale === "en" ? dataset.definition_en : dataset.definition_ro) ??
      dataset.definition_ro ??
      null,
    methodology: findMetadataText(dataset.metadata ?? undefined, [
      "methodology",
      "methodology_ro",
      "metodologie",
    ]),
    source: findMetadataText(dataset.metadata ?? undefined, [
      "source",
      "sursa",
      "provider",
    ]),
    notes: findMetadataText(dataset.metadata ?? undefined, [
      "notes",
      "note",
      "observatii",
    ]),
  };
}
/** Ratios require one selected annual source period and a population measured in persons. Source units remain visible. */
export function entityInsDerivedIndicators(
  cells: readonly NativeInsObservation[],
) {
  const population = cells.find((cell) => cell.dataset_code === "POP107D");
  const unit = (population?.unit.name_ro ?? population?.unit.name_en ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (
    !population ||
    population.value_status?.trim() ||
    population.time_period.periodicity !== "ANNUAL" ||
    !["numar", "persoane", "numar persoane", "persons", "number"].includes(unit)
  )
    return [];
  const eligible = cells.filter(
    (cell) =>
      cell.time_period.iso_period === population.time_period.iso_period &&
      cell.time_period.periodicity === "ANNUAL" &&
      !cell.value_status?.trim() &&
      cell.value !== null &&
      Number.isFinite(Number(cell.value)) &&
      cell.unit.name_ro,
  );
  // Subtractions must use the same scale and unit on both sides.
  const mismatch = (a: string, b: string) => {
    const first = eligible.find((row) => row.dataset_code === a),
      second = eligible.find((row) => row.dataset_code === b);
    return first && second && first.unit.code !== second.unit.code;
  };
  return computeDerivedIndicators(
    eligible.map((observation) => ({
      datasetCode: observation.dataset_code,
      observation: {
        ...observation,
        unit: { ...observation.unit, symbol: null },
      },
    })),
  ).filter(
    (row) =>
      !(row.id === "natural-increase-rate" && mismatch("POP201D", "POP206D")) &&
      !(row.id === "net-migration-rate" && mismatch("POP309E", "POP310E")),
  );
}
