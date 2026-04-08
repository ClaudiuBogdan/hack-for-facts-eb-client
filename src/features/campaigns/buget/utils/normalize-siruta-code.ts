export function normalizeSirutaCode(value: string | number | null | undefined): string {
  const normalizedValue = value == null ? '' : String(value).trim()
  if (normalizedValue === '') {
    return ''
  }

  if (/^\d+$/.test(normalizedValue)) {
    return normalizedValue.replace(/^0+(?=\d)/, '')
  }

  return normalizedValue
}
