import Decimal from "decimal.js";
import { ROMANIA_COUNTIES } from "@/lib/territory-counties";
import type { NativeInsObservation } from "@/schemas/ins";
import { sourceRowSelection } from "@/lib/ins/source-series";
import { projectNativeComparison } from "./native-comparison";
import type {
  NativeLandingIssue,
  NativeLandingSource,
  NativeLandingProvenance,
} from "./native-landing-types";

const countyCodes = new Set<string>(
  ROMANIA_COUNTIES.map((county) => county.code),
);
export const LANDING_EXAMPLE_TERRITORIES = [
  { code: "RO", level: "NATIONAL", name: "România" },
  { code: "CJ", level: "NUTS3", name: "Cluj" },
  { code: "54975", level: "LAU", name: "Cluj-Napoca" },
] as const;

/** The canonical catalog is independent of the observations being ranked. */
export function validateLandingCountyUniverse(
  territories: NativeLandingSource["territories"],
) {
  if (
    territories.length !== countyCodes.size ||
    new Set(territories.map((t) => t.code)).size !== countyCodes.size ||
    territories.some((t) => t.level !== "NUTS3" || !countyCodes.has(t.code))
  )
    throw new Error("Incomplete or unexpected canonical county universe");
  return territories;
}

function project(source: NativeLandingSource) {
  if (
    !/^[a-f0-9]{64}$/.test(
      String(source.descriptor.metadata.custody_sha256 ?? ""),
    )
  )
    throw new Error("Missing native landing custody identity");
  for (const row of source.observations)
    if (row.value_status !== null && typeof row.value_status !== "string")
      throw new Error("Missing native source value status");
  if (source.cadence !== "ANNUAL")
    throw new Error("Landing stories require annual observations");
  return projectNativeComparison({
    ...source,
    classificationPins: source.classificationPins.length
      ? source.classificationPins
      : undefined,
  });
}

function numeric(
  row: NativeInsObservation | undefined,
): row is NativeInsObservation & { value: string } {
  return (
    row !== undefined &&
    row.value !== null &&
    /^-?[0-9]+(?:\.[0-9]+)?$/.test(row.value)
  );
}

function decimalContext(source: NativeLandingSource) {
  // Cross-products use at most twice the input digits. Extra precision also
  // preserves small differences when deriving display percentages. No global config.
  const digits = source.observations.reduce(
    (max, row) => Math.max(max, row.value?.length ?? 0),
    1,
  );
  return Decimal.clone({ precision: digits * 4 + 32 });
}

function provenance(source: NativeLandingSource): NativeLandingProvenance {
  return {
    descriptor: source.descriptor,
    territories: source.territories,
    classificationPins: source.classificationPins,
    unitCode: source.unitCode,
    cadence: source.cadence,
  };
}

function endpoint(observations: readonly NativeInsObservation[], year: number) {
  // Whole-history identity and duplicate cells were already validated by project().
  return observations.find(
    (row) =>
      row.time_period.periodicity === "ANNUAL" && row.time_period.year === year,
  );
}

export interface NativeCountyChange {
  readonly code: string;
  readonly name: string | null;
  readonly start: NativeInsObservation & { value: string };
  readonly end: NativeInsObservation & { value: string };
  readonly selection: NonNullable<ReturnType<typeof sourceRowSelection>>;
  /** Display approximation only. Ordering is decided by exact cross-products. */
  readonly pctChange: string;
  readonly plotChange: number;
}

export function buildNativeCountyStory(
  source: NativeLandingSource,
  startYear: number,
  endYear: number,
) {
  if (
    source.descriptor.code !== "POP107D" ||
    !Number.isInteger(startYear) ||
    !Number.isInteger(endYear) ||
    startYear < 1900 ||
    endYear > 2100 ||
    startYear >= endYear
  )
    throw new Error("Invalid population story selection");
  validateLandingCountyUniverse(source.territories);
  const matrix = project(source);
  const issues: NativeLandingIssue[] = [];
  const candidates: NativeCountyChange[] = [];
  const D = decimalContext(source);
  for (const row of matrix.rows) {
    if (row.availability !== "SERIES") {
      issues.push({
        code: row.code,
        reason: row.availability === "EMPTY" ? "MISSING" : row.availability,
      });
      continue;
    }
    const start = endpoint(row.observations, startYear),
      end = endpoint(row.observations, endYear);
    if (!numeric(start) || !numeric(end)) {
      issues.push({ code: row.code, reason: "MISSING" });
      continue;
    }
    // A flagged endpoint remains inspectable but cannot silently support an
    // unqualified ranking. Status interpretation needs a separately justified rule.
    if (start.value_status !== null || end.value_status !== null) {
      issues.push({
        code: row.code,
        reason: "STATUS",
        observations: [start, end],
      });
      continue;
    }
    const a = new D(start.value),
      b = new D(end.value);
    if (a.lte(0) || b.lt(0)) {
      issues.push({ code: row.code, reason: "DENOMINATOR" });
      continue;
    }
    const change = b.minus(a).div(a).times(100).toNumber();
    if (!Number.isFinite(change))
      throw new Error("Population change cannot be displayed");
    const selection = row.sourceSelection;
    if (!selection) throw new Error("Missing validated source selection");
    candidates.push({
      code: row.code,
      name:
        source.territories.find((t) => t.code === row.code)?.name ?? row.name,
      start,
      end,
      selection,
      pctChange: b.minus(a).div(a).times(100).toFixed(1, Decimal.ROUND_HALF_UP),
      plotChange: change,
    });
  }
  const base = {
    source: provenance(source),
    startYear,
    endYear,
    expectedCount: countyCodes.size,
    eligibleCount: candidates.length,
    issues,
  };
  if (issues.length)
    return {
      ...base,
      status: "UNAVAILABLE" as const,
      declines: [],
      gains: [],
      unchangedCount: 0,
      maxAbsChange: 0,
    };
  const ordered = candidates.sort(
    (a, b) =>
      new D(a.end.value)
        .times(b.start.value)
        .cmp(new D(b.end.value).times(a.start.value)) ||
      a.code.localeCompare(b.code),
  );
  // Five entries are the explicit presentation size, after complete-universe validation.
  const declines = ordered
    .filter((row) => new D(row.end.value).lt(row.start.value))
    .slice(0, 5);
  const gains = [...ordered]
    .reverse()
    .filter((row) => new D(row.end.value).gt(row.start.value))
    .slice(0, 5);
  return {
    ...base,
    status: "AVAILABLE" as const,
    declines,
    gains,
    unchangedCount: candidates.filter((row) =>
      new D(row.start.value).eq(row.end.value),
    ).length,
    maxAbsChange: candidates.reduce(
      (max, row) => Math.max(max, Math.abs(row.plotChange)),
      0,
    ),
  };
}

export function buildNativeLandingExample(source: NativeLandingSource) {
  if (
    source.descriptor.code !== "FOM104D" ||
    source.territories.length !== LANDING_EXAMPLE_TERRITORIES.length ||
    LANDING_EXAMPLE_TERRITORIES.some(
      (expected) =>
        source.territories.filter(
          (t) => t.code === expected.code && t.level === expected.level,
        ).length !== 1,
    )
  )
    throw new Error("Unexpected worked-example universe");
  const matrix = project(source);
  const issues: NativeLandingIssue[] = matrix.rows.flatMap((row) =>
    row.availability === "SERIES"
      ? []
      : [
          {
            code: row.code,
            reason:
              row.availability === "EMPTY"
                ? ("MISSING" as const)
                : row.availability,
          },
        ],
  );
  const unavailable = (
    reason: "SERIES" | "PERIOD" | "STATUS",
    year: number | null = null,
  ) => ({
    year,
    status: "UNAVAILABLE" as const,
    reason,
    source: provenance(source),
    issues,
  });
  if (issues.length) return unavailable("SERIES");
  // Product policy: latest year with a numeric cell from all three fixed
  // territories. Source identity is checked over ALL history before this step.
  const annualYears = matrix.periods
    .map((period) => period.period.year)
    .sort((a, b) => b - a);
  const year = annualYears.find((candidate) =>
    matrix.rows.every((row) => numeric(endpoint(row.observations, candidate))),
  );
  if (year === undefined) return unavailable("PERIOD");
  const rows = LANDING_EXAMPLE_TERRITORIES.map((territory) => {
    const row = matrix.rows.find((r) => r.code === territory.code)!;
    const observation = endpoint(row.observations, year)!;
    return {
      ...territory,
      name:
        source.territories.find((t) => t.code === territory.code)?.name ??
        row.name,
      observation,
      selection: row.sourceSelection!,
    };
  });
  // Do not move to an older unflagged year to hide a flagged common-year cell.
  for (const row of rows)
    if (row.observation.value_status !== null)
      issues.push({
        code: row.code,
        reason: "STATUS",
        observations: [row.observation],
      });
  if (issues.length) return unavailable("STATUS", year);
  // Later coverage means a reported numeric cell, not merely a source-year slot.
  // Keep the original cell so any status remains visible alongside that claim.
  const latestYearByTerritory = matrix.rows.map((row) => {
    const observation = row.observations
      .filter((o) => o.time_period.periodicity === "ANNUAL" && numeric(o))
      .reduce(
        (latest, o) =>
          o.time_period.year > latest.time_period.year ? o : latest,
        endpoint(row.observations, year)!,
      );
    return { code: row.code, year: observation.time_period.year, observation };
  });
  // No cross-territory share is inferred here: that requires a separate
  // indicator-specific additivity and canonical containment proof.
  return {
    status: "AVAILABLE" as const,
    source: provenance(source),
    year,
    rows,
    latestYearByTerritory,
    issues,
  };
}
