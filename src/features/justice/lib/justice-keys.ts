/** The justice pages' query keys: the route loaders seed them, the pages read them. */
export const justiceKeys = {
  court: (code: string, year: number) => ['justice', 'court', code, year] as const,
  courtCases: (code: string) => ['justice', 'court-cases', code] as const,
  case: (code: string, number: string) => ['justice', 'case', code, number] as const,
} as const
