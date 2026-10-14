/**
 * What makes a registry row a repeat of another: the same value in all 14 of
 * these fields. The registry page judges a live read by the same list
 * (`distinctRows` in `src/features/ngos/registry/model.ts`), so the summary,
 * the counts and a read count alike. The purpose is not captured; the special
 * number, the row id and the admitted CUI are not compared.
 */
export const REPEAT_FIELDS = [
  'registryNumber',
  'name',
  'nameWithheld',
  'category',
  'legalForm',
  'court',
  'sourceRegistryStatus',
  'sourceRegistrationDate',
  'county',
  'locality',
  'sourceCui',
  'linkedOrganizationCui',
  'isBranch',
  'sourceReportsPublicUtility',
]

/** The row's key for spotting repeats. */
export const repeatKey = (row) => JSON.stringify(REPEAT_FIELDS.map((field) => row[field] ?? null))
