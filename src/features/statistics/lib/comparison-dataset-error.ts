/** Dataset availability is distinct from transport or source-validation failure. */
export class ComparisonDatasetError extends Error {
  constructor(readonly reason: 'UNKNOWN' | 'CATALOG_ONLY') {
    super(`INS comparison dataset: ${reason}`)
    this.name = 'ComparisonDatasetError'
  }
}
