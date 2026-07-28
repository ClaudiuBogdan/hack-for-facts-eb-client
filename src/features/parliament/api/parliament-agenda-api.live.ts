/**
 * Live adapter for the plenary agenda (ordinea de zi).
 *
 * `fetchParliamentAgendaLive` resolves `null` for an unknown key, matching the
 * server, so a caller can render "not found" rather than an error page.
 */
import type {
  ParliamentAgendaDetail,
  ParliamentAgendaList,
  ParliamentBillScheduling,
} from '@/schemas/parliament'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  PARLIAMENT_AGENDA_QUERY,
  PARLIAMENT_AGENDAS_QUERY,
  PARLIAMENT_BILL_SCHEDULING_QUERY,
  parliamentAgendaResponseSchema,
  parliamentAgendasResponseSchema,
  parliamentBillSchedulingResponseSchema,
} from './graphql/parliament-agenda-queries'
import {
  mapAgendaDetail,
  mapAgendaList,
  mapBillScheduling,
} from './graphql/parliament-agenda-mappers'

/**
 * Orders of business per page.
 *
 * Twenty, because the list is a browse surface with a date filter rather than
 * an infinite feed: a year holds ~40 agendas, so two pages cover a legislative
 * year and the pager stays meaningful.
 */
export const AGENDAS_PAGE_SIZE = 20

export interface ParliamentAgendaFilterInput {
  readonly chamber?: string
  /**
   * Bounds on the APPROVAL date. Deliberately unused by the list page: 391 of
   * 1,297 agendas carry no approval date, and the gap is 8%-54% in every year
   * from 2001 to 2026, so `year: 2011` returns 21 of that year's 46 agendas.
   */
  readonly dateFrom?: string
  readonly dateTo?: string
  readonly year?: number
  /** Bounds on the SITTING days — the axis a reader means, and complete. */
  readonly sittingFrom?: string
  readonly sittingTo?: string
  readonly sittingYear?: number
  readonly q?: string
}

export async function fetchParliamentAgendasLive(
  page = 1,
  filter?: ParliamentAgendaFilterInput,
): Promise<ParliamentAgendaList> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_AGENDAS_QUERY,
    {
      offset: Math.max(page - 1, 0) * AGENDAS_PAGE_SIZE,
      limit: AGENDAS_PAGE_SIZE,
      ...(filter && Object.keys(filter).length > 0 ? { filter } : {}),
    },
    { operationName: 'ParliamentAgendas' },
  )
  const parsed = parliamentAgendasResponseSchema.parse(data)
  if (!parsed.parliamentAgendas) {
    throw new Error('parliamentAgendas resolved null')
  }
  return mapAgendaList(parsed.parliamentAgendas.total, parsed.parliamentAgendas.nodes)
}

export async function fetchParliamentAgendaLive(
  agendaKey: string,
): Promise<ParliamentAgendaDetail | null> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_AGENDA_QUERY,
    { agendaKey },
    { operationName: 'ParliamentAgenda' },
  )
  const parsed = parliamentAgendaResponseSchema.parse(data)
  if (!parsed.parliamentAgenda) return null
  return mapAgendaDetail(parsed.parliamentAgenda.agenda, parsed.parliamentAgenda.items)
}

export async function fetchParliamentBillSchedulingLive(
  billKey: string,
): Promise<ParliamentBillScheduling[]> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_BILL_SCHEDULING_QUERY,
    { billKey },
    { operationName: 'ParliamentBillScheduling' },
  )
  const parsed = parliamentBillSchedulingResponseSchema.parse(data)
  return mapBillScheduling(parsed.parliamentBillScheduling)
}
