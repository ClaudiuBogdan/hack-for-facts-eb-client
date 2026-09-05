import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EntityDetailsData } from "@/lib/api/entities";
import { entityInsSourceSearchSchema, type EntityInsSelectionInput } from "@/lib/ins/entity-source-search";
import {
  fetchInsEntityContext,
  type NativeInsEntityContext,
} from "../api/graphql/ins-entity-context";
import {
  fetchEntityInsHistory,
  prepareEntityInsSource,
  type PreparedEntityInsSource,
} from "../api/native-entity-ins-api";
import { resolveEntityInsSelection } from "../lib/entity-ins-selection";

const STALE_TIME = 5 * 60 * 1000;
export interface EntityInsSourceInput {
  readonly cui: string;
  readonly enabled: boolean;
  readonly metadata: Pick<EntityDetailsData, "cui" | "uat"> | null | undefined;
  /** Successful current metadata, never a previous entity's placeholder. */
  readonly metadataReady: boolean;
  readonly search: EntityInsSelectionInput;
}

export function entityInsContextOptions(input: EntityInsSourceInput) {
  const current = input.metadataReady && input.metadata?.cui === input.cui;
  const area = current ? input.metadata?.uat : null;
  return queryOptions({
    queryKey: [
      "statistics",
      "native-entity-ins-v1",
      input.cui,
      "context",
      area
        ? [
            area.id ?? null,
            area.territory_key ?? null,
            area.level ?? null,
            area.kind ?? null,
          ]
        : null,
    ],
    queryFn: ({ signal }) => fetchInsEntityContext(input.cui, signal),
    enabled:
      input.enabled &&
      /^[0-9]{1,10}$/.test(input.cui) &&
      current &&
      area !== null &&
      area !== undefined,
    placeholderData: () => undefined,
    retry: false,
    staleTime: STALE_TIME,
  });
}
export function entityInsPreparationOptions(
  cui: string,
  context: NativeInsEntityContext | null,
  search: EntityInsSelectionInput,
) {
  const sourceSearch = entityInsSourceSearchSchema.parse(search);
  return queryOptions({
    queryKey: [
      "statistics",
      "native-entity-ins-v1",
      cui,
      "prepare",
      context,
      sourceSearch,
    ],
    queryFn: ({ signal }) => {
      if (context === null) throw new Error("Missing INS entity context");
      return prepareEntityInsSource(context, sourceSearch, signal);
    },
    enabled:
      context !== null &&
      resolveEntityInsSelection(sourceSearch).datasetCode !== null,
    placeholderData: () => undefined,
    retry: false,
    staleTime: STALE_TIME,
  });
}
export function entityInsHistoryOptions(
  cui: string,
  prepared: PreparedEntityInsSource | null,
) {
  return queryOptions({
    queryKey: [
      "statistics",
      "native-entity-ins-v1",
      cui,
      "history",
      prepared?.context ?? null,
      prepared?.publicationKey ?? null,
      prepared?.resolved.filter ?? null,
      prepared?.resolved.canDerive ? "complete" : "inspection",
    ],
    queryFn: ({ signal }) => {
      if (prepared === null)
        throw new Error("Missing INS entity source preparation");
      return fetchEntityInsHistory(prepared, signal);
    },
    enabled:
      prepared !== null &&
      prepared.selection.issues.length === 0 &&
      prepared.resolved.filter !== null,
    placeholderData: () => undefined,
    retry: false,
    staleTime: STALE_TIME,
  });
}

/** Failed upstream reads never expose stale downstream history as current. */
export function useEntityInsSource(input: EntityInsSourceInput) {
  const client = useQueryClient();
  const contextOptions = entityInsContextOptions(input);
  const contextQuery = useQuery(contextOptions);
  const context =
    contextOptions.enabled && contextQuery.isSuccess ? contextQuery.data : null;
  const preparationOptions = entityInsPreparationOptions(
    input.cui,
    context,
    input.search,
  );
  const preparationQuery = useQuery(preparationOptions);
  const prepared =
    preparationOptions.enabled && preparationQuery.isSuccess
      ? preparationQuery.data
      : null;
  const historyOptions = entityInsHistoryOptions(input.cui, prepared);
  const historyQuery = useQuery(historyOptions);
  const history =
    historyOptions.enabled && historyQuery.isSuccess ? historyQuery.data : null;

  /** Retry starts from fresh context/defaults, then uses that exact publication for history. */
  const refresh = async () => {
    if (!contextOptions.enabled) return;
    const freshContext = await client.fetchQuery({
      ...contextOptions,
      staleTime: 0,
    });
    if (freshContext === null) return;
    const freshOptions = entityInsPreparationOptions(
      input.cui,
      freshContext,
      input.search,
    );
    if (!freshOptions.enabled) return;
    const fresh = await client.fetchQuery({ ...freshOptions, staleTime: 0 });
    const freshHistory = entityInsHistoryOptions(input.cui, fresh);
    if (freshHistory.enabled)
      await client.fetchQuery({ ...freshHistory, staleTime: 0 });
  };
  return {
    context,
    prepared,
    history,
    contextQuery,
    preparationQuery,
    historyQuery,
    refresh,
  };
}
