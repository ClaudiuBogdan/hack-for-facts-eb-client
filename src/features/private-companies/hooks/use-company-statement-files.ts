import { useQuery, type QueryClient } from '@tanstack/react-query'
import { fetchCompanyStatementFiles } from '../api/private-company-api'

/**
 * A company's Ministry statements' file lines (CQA-14), read when a reader opens a Ministry year and kept for the
 * visit: trim step 2a (owner, 28 November 2026). One read per company answers every year; nothing is read on a page
 * nobody opens a Ministry year on, and never on the server (an opened year is the reader's own state).
 */

const FILES_ROOT = 'company-statement-files'

export function companyStatementFilesKey(cui: string) {
  return [FILES_ROOT, cui] as const
}

export function useCompanyStatementFiles(cui: string, enabled: boolean) {
  return useQuery({
    queryKey: companyStatementFilesKey(cui),
    queryFn: ({ signal }) => fetchCompanyStatementFiles(cui, signal),
    enabled,
    staleTime: 5 * 60_000,
    retry: 1,
  })
}

/**
 * Drop the company's files NOW and cancel a read in flight, so its late answer never lands: the company was
 * withdrawn from the directory, and the page that shows its years is unmounted by that withdrawal.
 */
export function removeCompanyStatementFiles(client: QueryClient, cui: string): void {
  void client.cancelQueries({ queryKey: companyStatementFilesKey(cui) })
  client.removeQueries({ queryKey: companyStatementFilesKey(cui) })
}
