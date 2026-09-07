import { z } from "zod";
import { graphqlQuery } from "@/lib/graphql/graphql-client";

// Native reference browse is capped at 100; opaque cursors retain later pages.
const PAGE_SIZE = 100;
const countySchema = z.object({
  countyCode: z.string(),
  countyName: z.string(),
});
const territorySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  countyCode: z.string().nullable(),
  countyName: z.string().nullable(),
});
const entitySchema = z.object({
  cui: z.string(),
  name: z.string(),
  territory: z
    .object({
      name: z.string(),
      countyCode: z.string().nullable(),
      countyName: z.string().nullable(),
    })
    .nullable(),
});
const pageInfoSchema = z.object({
  hasNextPage: z.boolean(),
  endCursor: z.string().nullable(),
});
const TERRITORIES_QUERY = `query BudgetTerritoryOptions($filter: ReferenceTerritoryFilter, $first: Int!, $after: String) {
  referenceTerritories(filter: $filter, first: $first, after: $after) {
    edges { node { id name countyCode countyName } }
    totalCount pageInfo { hasNextPage endCursor }
  }
}`;
const ENTITIES_QUERY = `query BudgetEntityOptions($filter: ReferencePublicEntityFilter, $first: Int!, $after: String) {
  referencePublicEntities(filter: $filter, first: $first, after: $after) {
    edges { node { cui name territory { name countyCode countyName } } }
    totalCount pageInfo { hasNextPage endCursor }
  }
}`;

type LookupOptions = {
  search?: string;
  after?: string;
  limit?: number;
  signal?: AbortSignal;
};

async function referencePage<T>(
  field: "referenceTerritories" | "referencePublicEntities",
  query: string,
  schema: z.ZodType<T>,
  filter: Record<string, unknown>,
  options: LookupOptions,
) {
  const { after = "", signal } = options;
  const raw = await graphqlQuery<Record<string, unknown>>(
    query,
    {
      filter,
      first: Math.min(options.limit ?? PAGE_SIZE, PAGE_SIZE),
      after: after || undefined,
    },
    { auth: "none", signal },
  );
  const page = z
    .object({
      edges: z.array(z.object({ node: schema })),
      totalCount: z.number().int().nonnegative(),
      pageInfo: pageInfoSchema,
    })
    .parse(raw[field]);
  if (
    page.pageInfo.hasNextPage &&
    (!page.edges.length ||
      !page.pageInfo.endCursor ||
      page.pageInfo.endCursor === after)
  ) {
    throw new Error("Reference lookup pagination did not advance");
  }
  return {
    nodes: page.edges.map((edge) => edge.node),
    pageInfo: {
      totalCount: page.totalCount,
      hasNextPage: page.pageInfo.hasNextPage,
      hasPreviousPage: after !== "",
    },
    nextOffset: page.pageInfo.endCursor ?? "",
  };
}

export async function fetchCountyOptions(options: {
  search: string;
  offset: number;
  limit: number;
  signal?: AbortSignal;
}) {
  const raw = await graphqlQuery<unknown>(
    "query BudgetCountyOptions { referenceCounties { countyCode countyName } }",
    {},
    { auth: "none", signal: options.signal },
  );
  const { referenceCounties } = z
    .object({ referenceCounties: z.array(countySchema) })
    .parse(raw);
  const fold = (value: string) =>
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  const search = fold(options.search.trim());
  const counties = referenceCounties.filter((county) =>
    fold(`${county.countyName} ${county.countyCode}`).includes(search),
  );
  const nodes = counties
    .slice(options.offset, options.offset + options.limit)
    .map((county) => ({
      county_code: county.countyCode,
      county_name: county.countyName,
    }));
  const nextOffset = options.offset + nodes.length;
  return {
    nodes,
    nextOffset,
    pageInfo: {
      totalCount: counties.length,
      hasNextPage: nextOffset < counties.length,
      hasPreviousPage: options.offset > 0,
    },
  };
}

export async function fetchUatOptions(options: LookupOptions = {}) {
  const search = options.search?.trim();
  const page = await referencePage(
    "referenceTerritories",
    TERRITORIES_QUERY,
    territorySchema,
    { isUat: { eq: true }, ...(search ? { name: { contains: search } } : {}) },
    options,
  );
  return {
    ...page,
    nodes: page.nodes.map((node) => ({
      id: String(node.id),
      name: node.name,
      county_code: node.countyCode ?? "",
      county_name: node.countyName ?? "",
    })),
  };
}

export async function fetchEntityOptions(options: LookupOptions = {}) {
  const search = options.search?.trim();
  const filter = !search
    ? {}
    : /^\d+$/.test(search)
      ? { cui: { eq: search } }
      : { name: { contains: search } };
  const page = await referencePage(
    "referencePublicEntities",
    ENTITIES_QUERY,
    entitySchema,
    filter,
    options,
  );
  return {
    ...page,
    nodes: page.nodes.map((node) => ({
      cui: node.cui,
      name: node.name,
      uat: node.territory
        ? {
            name: node.territory.name,
            county_code: node.territory.countyCode ?? "",
          }
        : undefined,
    })),
  };
}

async function collectLabels<T>(
  ids: readonly string[],
  read: (
    batch: string[],
    after: string,
  ) => Promise<{
    nodes: T[];
    pageInfo: { hasNextPage: boolean };
    nextOffset: string;
  }>,
  identity: (node: T) => string,
) {
  const uniqueIds = [...new Set(ids)];
  const nodes: T[] = [];
  for (let offset = 0; offset < uniqueIds.length; offset += PAGE_SIZE) {
    const batch = uniqueIds.slice(offset, offset + PAGE_SIZE);
    const requested = new Set(batch);
    const seen = new Set<string>();
    let after = "";
    for (;;) {
      const page = await read(batch, after);
      for (const node of page.nodes) {
        const id = identity(node);
        if (!requested.has(id) || seen.has(id))
          throw new Error("Reference label identity mismatch");
        seen.add(id);
        nodes.push(node);
      }
      if (!page.pageInfo.hasNextPage) break;
      after = page.nextOffset;
    }
  }
  return nodes;
}

export async function fetchEntityLabels(ids: (string | number)[]) {
  const nodes = await collectLabels(
    ids.map(String),
    (batch, after) =>
      referencePage(
        "referencePublicEntities",
        ENTITIES_QUERY,
        entitySchema,
        { cui: { in: batch } },
        { after },
      ),
    (node) => node.cui,
  );
  return nodes.map((node) => ({
    id: node.cui,
    label: node.name,
    countyName: node.territory?.countyName ?? null,
  }));
}

export async function fetchUatLabels(ids: (string | number)[]) {
  const keys = ids.map(String);
  if (
    keys.some(
      (id) => !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)),
    )
  )
    throw new Error("Invalid canonical territory ID");
  const nodes = await collectLabels(
    keys,
    (batch, after) =>
      referencePage(
        "referenceTerritories",
        TERRITORIES_QUERY,
        territorySchema,
        { id: { in: batch.map(Number) } },
        { after },
      ),
    (node) => String(node.id),
  );
  return nodes.map((node) => ({ id: String(node.id), label: node.name }));
}
