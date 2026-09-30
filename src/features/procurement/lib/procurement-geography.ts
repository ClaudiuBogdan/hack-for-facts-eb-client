
/** Reference county labels are uppercase; preserve Romanian diacritics. */
export function formatProcurementCountyName(value: string): string {
  return value
    .toLocaleLowerCase('ro-RO')
    .replace(/(^|[\s-])\p{L}/gu, (match) => match.toLocaleUpperCase('ro-RO'))
}
