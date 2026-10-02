import { NO_NAMES } from '@/features/procurement/lib/direct-purchase-model'
import type { ProcedureRead } from '@/features/procurement/lib/procedure-model'
import type { RawProcedureRecord } from './procedure.types'

/**
 * The prototype's records as the page reads them (`lib/procedure-model.ts`).
 * `target` answers the way the fixed API must (§22.2): the award notice as
 * e-licitatie publishes it, the notices tied to this one, the notice's rows
 * past the API's 50. `today` answers as the dev API does now: the notice's
 * row and its contract rows, nothing more.
 */
export function procedureReadOfFixture(raw: RawProcedureRecord, read: 'target' | 'today'): ProcedureRead {
  const names = {
    ...NO_NAMES,
    labels: new Map(raw.names.labels),
    cpv: new Map(raw.names.cpv.map((code) => [code.code, { ro: code.ro, en: code.en }])),
  }
  const ted = raw.ted ? { tedNoticeNo: raw.ted } : null
  if (read === 'today') return { procedure: raw.procedure, contracts: raw.contracts, ted, names, source: null, linked: [] }
  // The notice's rows past the API's 50 are the fixed API's too: every contract on the notice opens its page.
  const seen = new Set(raw.contracts.map((contract) => contract.id))
  const contracts = [...raw.contracts, ...(raw.notice ?? []).filter((row) => !seen.has(row.id))]
  return { procedure: raw.procedure, contracts, ted, names, source: raw.source, linked: raw.linked, reason: raw.reason ?? null }
}
