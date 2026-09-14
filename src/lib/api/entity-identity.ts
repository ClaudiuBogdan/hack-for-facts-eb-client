import { AnnualPopulationSchema } from './annual-population';
import { z } from "zod";
import { graphqlQuery } from "@/lib/graphql/graphql-client";
import type { EntityDetailsData } from "./entities";

export const EntityTerritorySchema = z.object({
  id: z.number().int(),
  level: z.string().nullable(),
  kind: z.string().nullable(),
  territoryKey: z.string().nullable(),
  parentId: z.number().int().nullable(),
  nutsCode: z.string().nullable(),
  name: z.string(),
  countyCode: z.string().nullable(),
  countyName: z.string().nullable(),
  sirutaCode: z.string().nullable(),
  population: z.number().int().nullable(),
});

export function mapEntityTerritory(
  territory: z.infer<typeof EntityTerritorySchema> | null,
): EntityDetailsData["uat"] {
  return territory === null
    ? null
    : {
        id: territory.id,
        level: territory.level,
        kind: territory.kind,
        territory_key: territory.territoryKey,
        parent_id: territory.parentId,
        nuts_code: territory.nutsCode,
        county_name: territory.countyName,
        county_code: territory.countyCode,
        name: territory.name,
        siruta_code:
          territory.sirutaCode === null ? null : Number(territory.sirutaCode),
        population: territory.population,
        county_entity: null,
      };
}
const QUERY = `query EntityIdentity($cui: CUI!, $populationYear: Int! = 1, $includePopulation: Boolean! = false) {
  entity(cui: $cui) {
    cui organization { name }
    annualPopulation(year: $populationYear) @include(if: $includePopulation) {
      territoryId year population
      metadata { sourceYearMin sourceYearMax maxCarryAge carriedCount provisionalCount sourceUrl }
    }
    territory { id level kind territoryKey parentId nutsCode name countyCode countyName sirutaCode population }
  }
}`;
const responseSchema = z.object({
  entity: z
    .object({
      cui: z.string(),
      annualPopulation: AnnualPopulationSchema.nullable().optional(),
      organization: z.object({ name: z.string() }).nullable(),
      territory: EntityTerritorySchema.nullable(),
    })
    .nullable(),
});

/** Canonical identity only: statistical pages do not depend on budget availability. */
export async function fetchEntityIdentity(
  cui: string,
  signal?: AbortSignal,
  populationYear?: number,
): Promise<Pick<EntityDetailsData, "cui" | "name" | "uat" | "annualPopulation" | "is_territorial_executive"> | null> {
  if (!/^[0-9]{1,10}$/.test(cui)) throw new RangeError("Invalid entity CUI");
  signal?.throwIfAborted();
  const raw = await graphqlQuery<unknown>(
    QUERY,
    { cui, ...(populationYear === undefined ? {} : { populationYear, includePopulation: true }) },
    { auth: "none", signal },
  );
  signal?.throwIfAborted();
  const { entity } = responseSchema.parse(raw);
  if (!entity) return null;
  if (entity.cui !== cui) throw new Error("Entity identity mismatch");
  const territory = mapEntityTerritory(entity.territory);
  const annual = entity.annualPopulation ?? null;
  return {
    ...(populationYear === undefined ? {} : { annualPopulation: annual, is_territorial_executive: annual !== null }),
    cui,
    name: entity.organization?.name ?? cui,
    uat: territory === null || populationYear === undefined ? territory : { ...territory, population: annual?.population ?? null },
  };
}
