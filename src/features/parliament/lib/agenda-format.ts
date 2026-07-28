/**
 * Presentation rules for the plenary agenda.
 *
 * The whole point of this module is to stop the UI overclaiming. An order of
 * business is a PLAN: it records what the Chamber intended to take, not what it
 * did. Every label here is chosen so a reader cannot come away believing a
 * scheduled point was reached, debated or voted.
 */

/** Where a sitting's date came from, in words a reader can act on. */
export function sittingDateSourceLabel(source: string): string | undefined {
  switch (source) {
    case 'stenogram_session':
      // The sitting's own printed transcript title. Nothing to caveat.
      return undefined
    case 'ordinezi_title':
      return 'Data este cea din titlul ordinii de zi.'
    case 'weekly_agenda':
      // The planned week disagreed with the transcript on 4 of the 5 sittings
      // it dated, so this one always carries a caveat.
      return 'Data provine din programul săptămânal (planificat), nu din stenogramă.'
    case 'none':
      return 'Sursa nu a publicat o dată de încredere pentru această ședință.'
    default:
      return undefined
  }
}

/** How firmly an agenda maps onto a sitting. */
export function agendaResolutionLabel(status: string | undefined): string | undefined {
  if (status === 'candidate') return 'Corespondență probabilă'
  return undefined
}

const ITEM_KIND_LABEL: Record<string, string> = {
  administrative: 'Punct administrativ',
  debate: 'Dezbatere',
  unknown: 'Neclasificat',
}

export function agendaItemKindLabel(kind: string): string {
  return ITEM_KIND_LABEL[kind] ?? 'Neclasificat'
}

/**
 * The chamber label. Deliberately explicit: the whole surface is the Chamber of
 * Deputies, and a reader must not extrapolate to Parliament as a whole.
 */
export function agendaChamberLabel(chamber: string): string {
  switch (chamber) {
    case 'camera_deputatilor':
      return 'Camera Deputaților'
    case 'senat':
      return 'Senat'
    case 'comun':
      return 'Ședință comună'
    default:
      return chamber
  }
}

/**
 * Groups an agenda's sittings into dated and undated.
 *
 * An undated sitting is NOT "sorts last" — it is a different statement, and it
 * gets its own visible bucket rather than a silent position at the bottom of a
 * chronology.
 */
export function partitionByDate<T extends { readonly date?: string }>(
  rows: readonly T[],
): { readonly dated: readonly T[]; readonly undated: readonly T[] } {
  const dated: T[] = []
  const undated: T[] = []
  for (const row of rows) {
    if (row.date === undefined) undated.push(row)
    else dated.push(row)
  }
  return {
    dated: [...dated].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')),
    undated,
  }
}
