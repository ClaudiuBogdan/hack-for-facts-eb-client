import { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import type { InsEntitySelectorInput } from '@/schemas/ins'
import { inferCodTerritoryLevel } from '../../lib/dataset-selection'
import { insTerritoryLevelRawSchema } from './statistics-raw-schemas'

const contextSchema = z
  .object({
    territoryCode: z.string().min(1),
    territoryLevel: insTerritoryLevelRawSchema,
    territoryName: z.string().min(1),
    sirutaCode: z.string().nullable(),
    datasetCount: z.number().int().min(0).max(2147483647),
  })
  .superRefine((context, validation) => {
    const {
      territoryCode: code,
      territoryLevel: level,
      sirutaCode: siruta,
    } = context
    if (
      code !== code.trim().toUpperCase() ||
      inferCodTerritoryLevel(code) !== level ||
      (level === 'LAU' && (!/^[1-9][0-9]*$/.test(code) || siruta !== code)) ||
      (siruta !== null && !/^[1-9][0-9]*$/.test(siruta))
    ) {
      validation.addIssue({
        code: 'custom',
        message: 'INS entity context identity is inconsistent',
      })
    }
  })
export type NativeInsEntityContext = Readonly<z.infer<typeof contextSchema>>

/** Scope is owned by the canonical server bridge, never inferred from fiscal entity type. */
export function insEntityContextSelector(
  context: NativeInsEntityContext,
): InsEntitySelectorInput {
  return context.territoryLevel === 'LAU'
    ? { sirutaCode: context.territoryCode }
    : {
        territoryCode: context.territoryCode,
        territoryLevel: context.territoryLevel,
      }
}
export function insEntityContextPin(context: NativeInsEntityContext): string {
  return `${context.territoryLevel === 'LAU' ? 'siruta' : 'cod'}:${context.territoryCode}`
}

const QUERY = `query InsEntityContext($cui: CUI!) {
  entity(cui: $cui) {
    cui
    ins { territoryCode territoryLevel territoryName sirutaCode datasetCount }
  }
}`

/** Null is an unmapped area; zero coverage remains a context; read errors propagate. */
export async function fetchInsEntityContext(
  cui: string,
  signal?: AbortSignal,
): Promise<NativeInsEntityContext | null> {
  // Entity routes supply canonical CUI. Do not send malformed or withheld identifiers.
  if (!/^[0-9]{1,10}$/.test(cui)) throw new RangeError('Invalid entity CUI')
  signal?.throwIfAborted()
  const raw = await graphqlQuery<unknown>(
    QUERY,
    { cui },
    { auth: 'none', signal },
  )
  signal?.throwIfAborted()
  const response = z
    .object({
      entity: z
        .object({ cui: z.string(), ins: contextSchema.nullable() })
        .nullable(),
    })
    .parse(raw)
  if (response.entity !== null && response.entity.cui !== cui)
    throw new Error('INS entity identity mismatch')
  return response.entity?.ins ?? null
}
