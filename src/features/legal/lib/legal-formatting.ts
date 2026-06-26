export function formatLegalDate(value: string | null | undefined): string {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatShortSha(value: string | null | undefined): string {
  if (!value) {
    return '-'
  }

  if (value.length <= 16) {
    return value
  }

  return `${value.slice(0, 12)}...${value.slice(-6)}`
}
