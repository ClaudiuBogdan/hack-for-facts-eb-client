/**
 * The address of a day square: the surface's own `/parlament` address with the
 * day added as `from`/`to`. The router serialises the surface's search once;
 * each square only appends its date, which serialises to itself (a calendar
 * date is not JSON, so the app's search serialiser leaves it as plain text).
 */
export function appendDayToHref(baseHref: string, isoDate: string): string {
  const separator = baseHref.includes('?') ? '&' : '?'
  return `${baseHref}${separator}from=${isoDate}&to=${isoDate}`
}
