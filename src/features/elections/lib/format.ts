export function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium' }).format(date)
}

export function formatNumber(value: number): string {
  return value.toLocaleString('ro-RO')
}

export function formatNullableNumber(value: number | null): string {
  return value === null ? '-' : formatNumber(value)
}

export function formatNullablePercent(value: number | null): string {
  if (value === null) return '-'
  return new Intl.NumberFormat('ro-RO', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value)
}

export function familyLabel(family: string): string {
  if (family === 'local') return 'Locale'
  if (family === 'parlamentare') return 'Parlamentare'
  if (family === 'prezidentiale') return 'Prezidentiale'
  if (family === 'europarlamentare') return 'Europarlamentare'
  if (family === 'referendum') return 'Referendum'
  return family
}
