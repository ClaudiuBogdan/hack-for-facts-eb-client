import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { cpvKey } from '../lib/direct-purchase-model'
import { procedureSheetOf, type ProcedureRead, type ProcedureSheet } from '../lib/procedure-model'
import { PROCEDURE_PAGE_QUERY, procedurePageSchema, type RawProcedurePage } from './graphql/procurement-procedure-queries'
import { readNames } from './procurement-direct-purchase-api'

/**
 * One procedure's read: the notice's row with its contract rows and TED
 * notice (one request), then the names of everyone in them. The names fail
 * soft — the record's own stand, and the sheet is `partial`. A missing
 * record is `null`, never an error.
 *
 * The award notice as e-licitatie publishes it and the notices tied to this
 * one are not served yet (`design.md` §22.2): `source` is `null` and
 * `linked` empty, and the page shows those parts where they arrive.
 */

/** The API's answer, as the model reads it. */
export function procedureReadOf(raw: RawProcedurePage, names: ProcedureRead['names']): ProcedureRead {
  const { procedure } = raw
  return {
    procedure: {
      id: procedure.id,
      noticeNo: procedure.noticeNo,
      noticeKind: procedure.noticeKind,
      procedureType: procedure.procedureType,
      title: procedure.title,
      authority: procedure.authority,
      cpvCode: procedure.cpvCode,
      estimatedValueRon: procedure.estimatedValueRon,
      awardedValueRon: procedure.awardedValueRon,
      status: procedure.status,
      publicationDate: procedure.publicationDate,
      sourceSystem: procedure.sourceSystem,
      sourceUrl: procedure.sourceUrl,
      valueAccepted: procedure.value?.valueAccepted ?? false,
      valueComparable: procedure.value?.valueRonComparable ?? null,
    },
    contracts: raw.contracts.map((contract) => ({
      id: contract.id,
      contractNo: contract.contractNo,
      contractDate: contract.contractDate,
      authority: contract.authority,
      supplier: contract.supplier,
      valueRon: contract.valueRon,
      valueAccepted: contract.value?.valueAccepted ?? false,
      valueComparable: contract.value?.valueRonComparable ?? null,
      recordKind: contract.recordKind,
    })),
    ted: raw.ted,
    names,
    source: null,
    linked: [],
  }
}

/** The procedure, then everyone's names. `null` when SEAP has no such notice. */
export async function fetchProcedure(id: string, signal?: AbortSignal): Promise<ProcedureSheet | null> {
  const data = await graphqlQuery<unknown>(PROCEDURE_PAGE_QUERY, { id }, { operationName: 'ProcurementProcedurePage', signal })
  const raw = procedurePageSchema.parse(data).procurementProcedure
  if (!raw) return null
  const parties = [raw.procedure.authority, ...raw.contracts.flatMap((contract) => [contract.authority, contract.supplier])]
  const cuis = [...new Set(parties.map((party) => party.cui).filter((cui): cui is string => Boolean(cui)))]
  const code = cpvKey(raw.procedure.cpvCode)
  const names = await readNames(cuis, code ? [code] : [], raw.procedure.authority.cui, signal)
  return procedureSheetOf(procedureReadOf(raw, names))
}
