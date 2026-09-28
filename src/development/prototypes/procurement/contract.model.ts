import { namesOf } from '@/features/procurement/api/procurement-direct-purchase-api'
import { contractAroundOf, contractSheetOf, type ContractRead, type ContractSheet, type CtContext, type CtYear } from '@/features/procurement/lib/contract-model'
import { contextPeriodOf } from '@/features/procurement/lib/direct-purchase-model'
import { DIRECT_COMPARABLE_FROM, homeYear } from '@/features/procurement/lib/home-model'
import type { RawContractRecord } from './contract.types'

/** SEAP's contract cutoff when the fixtures were read (28 September 2026): the year in progress runs through May. */
const FIXTURES_THROUGH = '2026-05'
/** The rows the fixtures read either side of each contract's day. */
const FIXTURES_PER_SIDE = 4
/** The notice's rows the fixtures read, a page. */
const FIXTURES_NOTICE_PAGE = 60

/**
 * The prototype's records as the page reads them: the fixture answers the
 * way the adapted API would — the dev API's rows, the names, and the award
 * notice's own data (`source`), which the live API does not serve yet. The
 * page's rules are the feature's (`contract-model.ts`).
 */

/** The fixture as the page's read: its names mapped as the names read maps them. */
export function contractReadOfFixture(raw: RawContractRecord): ContractRead {
  const entity = raw.names.entity
  const names = namesOf(
    {
      labels: raw.names.labels.map(([cui, canonicalName]) => ({ cui, canonicalName, status: 'named' })),
      entity: entity ? { ...entity, organization: entity.organization, reference: entity.reference, budget: entity.budget } : null,
      cpv: raw.cpv.map((code) => ({ cpvCode: code.code, labelRo: code.ro, labelEn: code.en })),
    },
    raw.contract.authority.cui,
  )
  return {
    contract: raw.contract,
    procedure: raw.procedure,
    ted: raw.ted,
    duplicates: raw.duplicates,
    notice: { rows: raw.notice.rows, full: raw.notice.rows.length >= FIXTURES_NOTICE_PAGE, failed: false },
    names,
    source: raw.source,
  }
}

export function contractSheetOfFixture(raw: RawContractRecord): ContractSheet {
  return contractSheetOf(contractReadOfFixture(raw))
}

/** The context as the context read would answer it on the day the fixtures were read. */
export function contractContextOfFixture(raw: RawContractRecord, sheet: ContractSheet): CtContext | null {
  const context = raw.context
  if (!context || !sheet.date) return null
  const latest = homeYear()
  const last = latest + 1
  const at = (points: readonly { readonly year: number; readonly value: number | null }[], year: number) => points.find((point) => point.year === year)?.value ?? 0
  const years: CtYear[] = Array.from({ length: last - DIRECT_COMPARABLE_FROM + 1 }, (_, index) => {
    const year = DIRECT_COMPARABLE_FROM + index
    return { year, awards: at(context.awards, year), frameworks: at(context.frameworks, year), direct: at(context.direct, year), directLei: context.direct.find((point) => point.year === year)?.lei ?? null }
  })
  // The fixtures read the year whole; the page says it through the cutoff, as the live read counts it.
  const period = contextPeriodOf(sheet.date, latest, FIXTURES_THROUGH)
  const side = (rows: RawContractRecord['notice']['rows']) => ({ rows, full: rows.length >= FIXTURES_PER_SIDE })
  return {
    year: context.year,
    through: period.through,
    years,
    inProgress: { year: last, through: period.year === last && period.through ? period.through : FIXTURES_THROUGH },
    pair: { awards: context.pairYear?.count ?? 0, frameworks: at(context.frameworks, context.year) },
    buyer: { awards: context.buyer.awards?.count ?? 0, frameworks: context.buyer.frameworks?.count ?? 0 },
    seller: { awards: context.seller.awards?.count ?? 0 },
    records: context.records,
    around: contractAroundOf(sheet, side(context.newer), side(context.older)),
    partial: false,
  }
}
