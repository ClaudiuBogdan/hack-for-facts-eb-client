import type { LegalResolveHit } from '@/schemas/legal'
import { legalActDetailById } from '../mocks/fixtures/legal-act-detail'

/**
 * Mock resolver over the two fixture acts. 'codul fiscal' answers the REAL
 * ambiguity shape (two candidates) so the lookup UI's candidate list is
 * exercised, not papered over.
 */
export async function resolveLegalActsMock(q: string): Promise<LegalResolveHit[]> {
  const needle = q.trim().toLowerCase()
  if (needle.length === 0) return []

  if (needle.includes('codul fiscal') || needle.includes('cod fiscal')) {
    return [
      {
        kind: 'act',
        value: '66150',
        label: 'Legea nr. 227/2015 (Codul fiscal)',
        score: 0.98,
        hint: 'abrogat-partial',
      },
      {
        kind: 'act',
        value: '187041',
        label: 'Codul fiscal din 2003 (abrogat)',
        score: 0.61,
        hint: 'abrogat',
      },
    ]
  }

  const hits: LegalResolveHit[] = []
  for (const actId of ['424242', '66150']) {
    const act = legalActDetailById(actId)
    if (act !== null && act.displayCitation.toLowerCase().includes(needle)) {
      hits.push({
        kind: 'act',
        value: act.actId,
        label: act.displayCitation,
        score: 0.9,
        hint: act.status,
      })
    }
  }
  return hits
}
