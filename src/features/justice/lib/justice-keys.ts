/** The justice pages' query keys: the route loaders seed them, the pages read them. */
export const justiceKeys = {
  court: (code: string, year: number) => ['justice', 'court', code, year] as const,
  courtCases: (code: string) => ['justice', 'court-cases', code] as const,
  case: (code: string, number: string) => ['justice', 'case', code, number] as const,
  /** One `judicialCaseload` read of the analysis page, by its grouping and its filter. */
  caseload: (groupBy: string, filter: unknown) => ['justice', 'caseload', groupBy, filter] as const,
} as const
