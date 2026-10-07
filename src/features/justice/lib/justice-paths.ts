/**
 * The justice pages' addresses. A case is addressed by its court and its
 * number — the API's durable key — and the number keeps its slashes in the
 * path: `/justice/cases/TribunalulBUCURESTI/33517/3/2021/a85`.
 */

/** A Portal Just institution code: letters, and the sector's digit for Bucharest's courts (`TribunalulCLUJ`, `JudecatoriaSECTORUL1BUCURESTI`). */
const COURT_CODE = /^[A-Za-z][A-Za-z0-9]{3,63}$/u

/**
 * What a case page's address may carry: a number (older ones carry a dot or a
 * comma, „340.1/832/2007", „17020,/245/2008") and a slash, then a digit, then
 * only the characters case numbers are written with — never a word first.
 */
const CASE_NUMBER_IN_PATH = /^\d{1,7}(?:[.,]\d{0,3}\.?)?\/\d[0-9A-Za-z/*.,-]{0,90}$/u

/**
 * What a reader may type to open a case: the portal's number formats — the
 * number, the court's, the year (or an old number and its year), the stars of
 * a version, an attached file (`/a85`, `/a1.2`): `1234/117/2024`,
 * `33517/3/2021/a85`, `1234/3/2024*`, `1234/2005`. Nothing with a word in it
 * matches, so a name typed by mistake never reaches an address.
 */
const TYPED_CASE_NUMBER = /^\d{1,7}(?:[.,]\d{0,3}\.?)?\/\d{1,5}(?:\/\d{4})?\*{0,2}(?:\/a\d{1,4}(?:\.\d{1,4})*\*{0,2})*$/u

/** A path segment that would move the address elsewhere (`.`, `..`). */
const hasDotSegment = (number: string) => number.split('/').some((segment) => segment === '.' || segment === '..')

export function isCourtCode(code: string): boolean {
  return COURT_CODE.test(code)
}

/** A case number a case page's address can hold (the API's own numbers, whatever their shape). */
export function isCaseNumber(number: string): boolean {
  return CASE_NUMBER_IN_PATH.test(number) && !number.includes('//') && !hasDotSegment(number)
}

/** A case number as a reader types it into the lookup. */
export function isTypedCaseNumber(number: string): boolean {
  return TYPED_CASE_NUMBER.test(number) && isCaseNumber(number)
}

export function courtPath(code: string): string {
  return `/justice/courts/${code}`
}

/** The case's path, its number's slashes kept and every other character escaped. */
export function casePath(code: string, number: string): string {
  return `/justice/cases/${code}/${number.split('/').map(encodeURIComponent).join('/')}`
}
