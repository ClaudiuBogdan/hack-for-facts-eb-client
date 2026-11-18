import { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { assertServedUnder, disclosureVersion } from './procurement-da-release-status'
import { tidyTitle, type RecentRecord } from '../lib/home-model'
import { daSupplierOf, partyOf } from '../lib/home-party'

/**
 * The largest direct purchases of a scope (a month, a buyer's or a firm's
 * period), from the analysis's own records — the population its figures
 * count, ranked by the value they sum. With direct acquisitions release 1 on,
 * that is the release: each row's id is the release purchase's, its value the
 * counted value (none when not counted, and the row is left out), and its
 * title, while withheld, its CPV label. Off, the legacy analysis answers the
 * same read. A supplier is named only when the API serves it as a company.
 */

const party = z.object({ cui: z.string().nullable(), name: z.string().nullable(), displayName: z.string().nullable(), displayKind: z.string().nullable().optional() })

const recordsSchema = z.object({
  l: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        date: z.string().nullable(),
        title: z.string().nullable(),
        cpvLabel: z.string().nullable().optional(),
        authority: party,
        supplier: party,
        valueRon: z.string().nullable(),
      }),
    ),
    meta: z.object({ disclosureKey: z.string().nullable().optional() }).nullable().optional(),
  }),
})

/** The API pages a records list from 1 to 100 rows. */
const MAX_ROWS = 100

export async function readLargestDirect(
  scope: Readonly<Record<string, unknown>>,
  limit: number,
  operationName: string,
  signal?: AbortSignal,
): Promise<readonly RecentRecord[]> {
  const rows = Math.max(1, Math.min(MAX_ROWS, limit))
  // The publication first: the list is kept only when it was served under it (D6).
  const disclosure = await disclosureVersion()
  const raw = await graphqlQuery<unknown>(
    `query ${operationName}($s: ProcurementAnalysisScopeInput!) { l: procurementRecords(scope: $s, sort: value_desc, page: 1, pageSize: ${rows}) { items { id date title cpvLabel authority { cui name displayName displayKind } supplier { cui name displayName displayKind } valueRon } meta { disclosureKey } } }`,
    { s: { ...scope, grain: 'direct_acquisition' } },
    { operationName, signal },
  )
  const list = recordsSchema.parse(raw).l
  assertServedUnder(disclosure, list.meta?.disclosureKey)
  return list.items.flatMap((item): RecentRecord[] => {
    const value = item.valueRon === null ? null : Number(item.valueRon)
    // A purchase with no value the figures count is no row of the largest: it is not counted.
    if (value === null || !Number.isFinite(value)) return []
    return [
      {
        id: item.id,
        grain: 'direct',
        date: item.date,
        title: tidyTitle(item.title) ?? (item.cpvLabel?.trim() || null),
        cpvCode: null,
        buyer: partyOf(item.authority),
        winners: [daSupplierOf(item.supplier)],
        value,
      },
    ]
  })
}
