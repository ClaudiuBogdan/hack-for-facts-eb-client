import { z } from 'zod';
import { graphqlQuery } from '@/lib/graphql/graphql-client';
import { AnnualPopulationSchema } from './annual-population';

const CellSchema = AnnualPopulationSchema.extend({
  territoryCode: z.string().min(1),
});
const ResponseSchema = z.object({ mapAnnualPopulation: z.array(CellSchema) });
export type MapPopulationCell = z.infer<typeof CellSchema>;

export async function fetchMapPopulation(
  year: number,
  granularity: 'UAT' | 'County',
  signal?: AbortSignal,
) {
  const raw = await graphqlQuery<unknown>(
    `query MapPopulation($year: Int!, $granularity: AnnualPopulationMapLevel!) {
    mapAnnualPopulation(year: $year, granularity: $granularity) {
      territoryCode territoryId year population
      metadata { sourceYearMin sourceYearMax maxCarryAge carriedCount provisionalCount sourceUrl }
    }
  }`,
    { year, granularity },
    { auth: 'none', signal },
  );
  const cells = ResponseSchema.parse(raw).mapAnnualPopulation;
  if (
    cells.some((cell) => cell.year !== year) ||
    new Set(cells.map((cell) => cell.territoryCode)).size !== cells.length
  )
    throw new Error('Invalid annual map population response');
  return cells;
}
