/** GraphQL chamber token ('camera_deputatilor' | 'senat') → display label. */
export function committeeChamberLabel(chamber: string | undefined): string {
  switch (chamber) {
    case 'camera_deputatilor':
      return 'Camera Deputaților'
    case 'senat':
      return 'Senatul României'
    default:
      return chamber ?? 'Parlament'
  }
}

const ROLE_LABELS: Record<string, string> = {
  presedinte: 'Președinte',
  vicepresedinte: 'Vicepreședinte',
  secretar: 'Secretar',
  membru: 'Membru',
}

/** Map a source committee-role token to its Romanian label (unknown → raw). */
export function committeeRoleLabel(role: string | undefined): string {
  if (!role) return 'Membru'
  return ROLE_LABELS[role.toLowerCase()] ?? role
}

export function formatCommitteeDate(value: string | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}
