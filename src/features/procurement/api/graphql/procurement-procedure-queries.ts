/**
 * GraphQL document + raw-response Zod schema for one procedure's page
 * (`/procurement/procedures/$id`): the notice's row, the contract rows SEAP
 * links to it (at most 50, no total) and its TED notice. The names are the
 * direct-purchase page's read (`readNames`).
 */
import { z } from 'zod'

export const PROCEDURE_PAGE_QUERY = /* GraphQL */ `
  query ProcurementProcedurePage($id: ID!) {
    procurementProcedure(id: $id) {
      procedure {
        id noticeNo noticeKind procedureType title
        authority { cui name }
        cpvCode estimatedValueRon awardedValueRon status publicationDate
        sourceSystem sourceUrl
        value { valueAccepted valueRonComparable }
      }
      contracts {
        id contractNo contractDate recordKind valueRon
        authority { cui name }
        supplier { cui name }
        value { valueAccepted valueRonComparable }
      }
      ted { tedNoticeNo }
    }
  }
`

const partySchema = z.object({ cui: z.string().nullable(), name: z.string().nullable() })
/** Whether the value engine accepts the row's value, and the amount it resolved (a duplicate's rescue included). */
const valueSchema = z.object({ valueAccepted: z.boolean(), valueRonComparable: z.string().nullable() })

export const procedurePageSchema = z.object({
  procurementProcedure: z
    .object({
      procedure: z.object({
        id: z.string(),
        noticeNo: z.string().nullable(),
        noticeKind: z.string().nullable(),
        procedureType: z.string().nullable(),
        title: z.string().nullable(),
        authority: partySchema,
        cpvCode: z.string().nullable(),
        estimatedValueRon: z.string().nullable(),
        awardedValueRon: z.string().nullable(),
        status: z.string(),
        publicationDate: z.string().nullable(),
        sourceSystem: z.string(),
        sourceUrl: z.string().nullable(),
        value: valueSchema.nullable(),
      }),
      contracts: z.array(
        z.object({
          id: z.string(),
          contractNo: z.string().nullable(),
          contractDate: z.string().nullable(),
          recordKind: z.string().nullable(),
          valueRon: z.string().nullable(),
          authority: partySchema,
          supplier: partySchema,
          value: valueSchema.nullable(),
        }),
      ),
      ted: z.object({ tedNoticeNo: z.string() }).nullable(),
    })
    .nullable(),
})

export type RawProcedurePage = NonNullable<z.infer<typeof procedurePageSchema>['procurementProcedure']>
