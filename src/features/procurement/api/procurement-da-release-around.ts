import { tidyTitle } from '../lib/home-model'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { DIRECT_COMPARABLE_FROM } from '../lib/home-model'
import { isPurchase, type DpOther } from '../lib/direct-purchase-model'
import { releaseOutcomeOf, releaseTitleOf, releaseValueOf } from '../lib/direct-purchase-release'
import { countedValueOf } from '../lib/direct-purchase-value'
import { PROCUREMENT_DA_AROUND_QUERY, procurementDaAroundSchema, type RawDaAround, type RawDaAroundItem } from './graphql/procurement-da-release-queries'

/**
 * The purchases between a release purchase's buyer and supplier, from the
 * release itself (direct acquisitions release 1): how many since 2019, and a
 * few either side of its day — by finalization, the day the release dates a
 * purchase by. A legacy list beside a release page would count and value
 * other rows.
 */

export interface ReleaseAround {
  /** Purchases between the two since 2019; `estimated` when the list stops counting (10,000). */
  readonly records: { readonly count: number; readonly estimated: boolean }
  readonly newer: readonly DpOther[]
  readonly older: readonly DpOther[]
}

/** A row as the band lists it: a purchase's counted value (none when not counted), an attempt's reported offer, struck. */
export function releaseOtherOf(item: RawDaAroundItem): DpOther {
  const outcome = releaseOutcomeOf(item.outcome)
  const done = isPurchase(outcome)
  const money = releaseValueOf(item)
  return {
    id: item.purchaseId,
    code: item.code,
    title: releaseTitleOf(item),
    titlePublic: !item.titleWithheld && tidyTitle(item.title) !== null,
    value: done ? countedValueOf(money) : money.reported,
    // An attempt's offer is the portal's, as reported: never said in lei.
    inLei: done,
    date: done ? (item.finalizationDay ?? item.publicationDay) : (item.publicationDay ?? item.finalizationDay),
    done,
  }
}

/** The three lists read in one snapshot: their `dataAsOf` agree (each field is its own snapshot). */
function oneSnapshot(raw: RawDaAround): boolean {
  return raw.all.dataAsOf === raw.newer.dataAsOf && raw.all.dataAsOf === raw.older.dataAsOf
}

export async function fetchReleaseAround(
  input: { readonly authorityCui: string; readonly supplierCui: string; readonly day: string },
  perSide: number,
  signal?: AbortSignal,
  /** D6: the newest disclosure key when the codes sent were read (`graphqlQuery`'s `disclosureSeen`). */
  disclosureSeen?: string | null,
): Promise<ReleaseAround> {
  const both = { buyerFiscalCode: input.authorityCui, supplierFiscalCode: input.supplierCui }
  const variables = {
    all: { ...both, outcomes: ['accepted'], finalizationFrom: `${DIRECT_COMPARABLE_FROM}-01-01` },
    newer: { ...both, finalizationFrom: input.day.slice(0, 10) },
    older: { ...both, finalizationTo: input.day.slice(0, 10) },
    perSide,
  }
  const read = async () => procurementDaAroundSchema.parse(await graphqlQuery<unknown>(PROCUREMENT_DA_AROUND_QUERY, variables, { operationName: 'ProcurementDaAround', signal, disclosureSeen }))
  let raw = await read()
  // A nightly publish between the fields: read once more; two mixed reads fail, never a mixed list.
  if (!oneSnapshot(raw)) raw = await read()
  if (!oneSnapshot(raw)) throw new Error('The release published while the purchases around were read.')
  return {
    records: { count: raw.all.total, estimated: raw.all.totalCapped },
    newer: raw.newer.items.map(releaseOtherOf),
    older: raw.older.items.map(releaseOtherOf),
  }
}
