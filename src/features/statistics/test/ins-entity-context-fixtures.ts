import type { NativeInsEntityContext } from '../api/graphql/ins-entity-context'

/** Synthetic canonical context; no real entity/source coverage claim. */
export function insEntityContextFixture(): NativeInsEntityContext {
  return {
    territoryCode: '54975',
    territoryLevel: 'LAU',
    territoryName: 'Cluj-Napoca',
    sirutaCode: '54975',
    datasetCount: 1,
  }
}
