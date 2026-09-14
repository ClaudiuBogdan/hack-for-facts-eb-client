import { beforeEach, describe, expect, it, vi } from 'vitest';
import { graphqlQuery } from '@/lib/graphql/graphql-client';
import { fetchRedesignEntityDetails } from './entities-redesign';
vi.mock('@/lib/graphql/graphql-client', () => ({ graphqlQuery: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
const territory = { id: 1138, level: 'locality', kind: 'sector', territoryKey: 'siruta:179141', parentId: 1, nutsCode: null, name: 'Sector 1', countyCode: 'B', countyName: 'Bucuresti', sirutaCode: '179141', population: 999999 };
const observed = { territoryId: 1138, year: 2021, population: '259084', metadata: { sourceYearMin: 2020, sourceYearMax: 2020, maxCarryAge: 1, carriedCount: 1, provisionalCount: 1, sourceUrl: 'https://example.org/ins.pdf' } };
describe('entity selected-year denominator', () => {
  it.each([observed, null])('uses annual population and never the static census value', async (annualPopulation) => {
    vi.mocked(graphqlQuery).mockResolvedValueOnce({entity:{cui:'4505359',organization:{name:'Sector 1'},territory,annualPopulation,reference:null,budget:null}});
    const result = await fetchRedesignEntityDetails({cui:'4505359',normalization:'total',reportPeriod:{type:'YEAR',selection:{interval:{start:'2020',end:'2021'}}},trendPeriod:{type:'YEAR',selection:{interval:{start:'2016',end:'2026'}}}});
    expect(vi.mocked(graphqlQuery).mock.calls[0]?.[1]).toEqual({cui:'4505359',populationYear:2021});
    expect(result?.uat?.population).toBe(annualPopulation ? 259084 : null);
    expect(result?.annualPopulation?.metadata?.maxCarryAge ?? null).toBe(annualPopulation ? 1 : null);
  });
});
