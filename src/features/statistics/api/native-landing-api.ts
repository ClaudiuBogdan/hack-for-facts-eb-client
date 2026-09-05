import { insSourceDescriptorSchema } from "@/lib/ins/source-contract";
import { sourcePinsFilter } from "@/lib/ins/source-pins";
import { inspectSourceSeries } from "@/lib/ins/source-series";
import { InsSourcePageError } from "@/lib/ins/source-pages";
import type { StatisticsLatestValue } from "@/schemas/statistics";
import type { NativeLandingSource } from "../lib/native-landing-types";
import {
  buildNativeCountyStory,
  buildNativeLandingExample,
  LANDING_EXAMPLE_TERRITORIES,
} from "../lib/native-landing";
import { comparisonPublicationKey } from "../lib/native-comparison";
// The 2016–2025 endpoints span nine intervals; UI copy must name the period.
import { DECADE_START_YEAR, DECADE_END_YEAR } from "../lib/landing-constants";
import { fetchLandingCountyUniverse } from "./graphql/ins-county-universe";
import { fetchInsSourceVector } from "./graphql/ins-source-fetcher";
import {
  prepareNativeComparison,
  fetchNativeComparisonVector,
} from "./native-comparisons-api";

/** Selection failure is distinct from transport/publication errors, which retain their types. */
export class NativeLandingSelectionError extends Error {
  readonly reason = "NO_SHARED_SELECTION";
  constructor(message: string) {
    super(message);
    this.name = "NativeLandingSelectionError";
  }
}

/** National identity proposes one source slice; county facts and the independent spine prove coverage. */
export async function fetchNativeCountyStory(
  seed: StatisticsLatestValue | undefined,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const source = seed?.source;
  if (
    !seed ||
    seed.datasetCode !== "POP107D" ||
    !seed.hasData ||
    !["PREFERRED_CLASSIFICATION", "TOTAL_FALLBACK"].includes(
      seed.matchStrategy,
    ) ||
    !source?.observation ||
    source.observation.dimensions.geography?.resolvedTerritory?.code !== "RO" ||
    source.observation.dimensions.geography.resolvedTerritory.level !==
      "NATIONAL"
  )
    throw new NativeLandingSelectionError(
      "Population story has no eligible national source selection",
    );
  const inspected = inspectSourceSeries({
    descriptor: source.descriptor,
    observations: [source.observation],
  });
  if (inspected.status !== "SERIES" || inspected.anyQualified)
    throw new NativeLandingSelectionError(
      "Population story seed is qualified or invalid",
    );
  const descriptor = insSourceDescriptorSchema.parse(source.descriptor);
  if (
    descriptor.code !== "POP107D" ||
    source.observation.time_period.periodicity !== "ANNUAL"
  )
    throw new NativeLandingSelectionError(
      "Population story source selection is incompatible",
    );
  const pins = new Map<string, string>();
  for (const dimension of descriptor.dimensions) {
    if (dimension.type !== "CLASSIFICATION") continue;
    const axis = `D${dimension.index}`;
    const member = source.observation.classifications.find(
      (c) => c.type_code === axis,
    );
    if (!member)
      throw new NativeLandingSelectionError(
        "Population story source selection is incomplete",
      );
    pins.set(axis, member.code);
  }
  const unit = source.observation.unit.code;
  const territories = await fetchLandingCountyUniverse(signal);
  signal?.throwIfAborted();
  const vector = await fetchInsSourceVector({
    datasetCode: descriptor.code,
    filter: {
      territoryCodes: territories.map((t) => t.code),
      sourcePins: sourcePinsFilter(pins),
      unitCodes: [unit],
    },
    signal,
  });
  signal?.throwIfAborted();
  if (
    comparisonPublicationKey(vector.descriptor) !==
    comparisonPublicationKey(descriptor)
  )
    throw new InsSourcePageError("PUBLICATION_CHANGED");
  const input: NativeLandingSource = {
    ...vector,
    territories,
    classificationPins: [...pins].map(([axis, member]) => `${axis}:${member}`),
    unitCode: unit,
    cadence: "ANNUAL",
  };
  return {
    nativeContract: "native-v2" as const,
    story: buildNativeCountyStory(input, DECADE_START_YEAR, DECADE_END_YEAR),
  };
}

export async function fetchNativeLandingExample(signal?: AbortSignal) {
  signal?.throwIfAborted();
  const prepared = await prepareNativeComparison(
    { code: "FOM104D", territories: ["cod:RO", "cod:CJ", "siruta:54975"] },
    signal,
  );
  signal?.throwIfAborted();
  const { resolved } = prepared;
  if (
    !resolved.ready ||
    resolved.representative ||
    resolved.unit === null ||
    resolved.cadence !== "ANNUAL"
  )
    throw new NativeLandingSelectionError(
      "Worked example requires a shared annual source selection",
    );
  const result = await fetchNativeComparisonVector(prepared, signal);
  signal?.throwIfAborted();
  const input: NativeLandingSource = {
    descriptor: result.descriptor,
    observations: result.observations,
    territories: LANDING_EXAMPLE_TERRITORIES,
    classificationPins: [...resolved.pins].map(
      ([axis, member]) => `${axis}:${member}`,
    ),
    unitCode: resolved.unit,
    cadence: resolved.cadence,
  };
  return {
    nativeContract: "native-v2" as const,
    example: buildNativeLandingExample(input),
  };
}
