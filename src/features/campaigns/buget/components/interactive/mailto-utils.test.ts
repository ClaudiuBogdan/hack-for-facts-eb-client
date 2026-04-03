import { describe, expect, it } from 'vitest'
import {
  buildContestationEmailBody,
  buildContestationMailto,
  buildPublicDebateEmailBody,
} from './mailto-utils'

describe('mailto-utils', () => {
  it('includes the sender identity in the generated contestation body', () => {
    const body = buildContestationEmailBody({
      contestedItem: 'Cheltuieli de personal',
      reasoning: 'Cresterea nu este justificata.',
      impact: 'Scad investitiile publice.',
      proposedChange: 'Realocati fonduri catre infrastructura scolara.',
      senderName: 'Asociatia Civica Exemplu',
    })

    expect(body).toContain('Cu stima,\nAsociatia Civica Exemplu')
  })

  it('keeps the sender identity in the generated contestation mailto payload', () => {
    const mailto = buildContestationMailto({
      primariaEmail: 'primaria@example.ro',
      contestedItem: 'Cheltuieli de personal',
      reasoning: 'Cresterea nu este justificata.',
      impact: 'Scad investitiile publice.',
      proposedChange: 'Realocati fonduri catre infrastructura scolara.',
      senderName: 'Asociatia Civica Exemplu',
      year: 2026,
    })

    expect(mailto).toContain(encodeURIComponent('Cu stima,\nAsociatia Civica Exemplu'))
  })

  it('uses the updated public debate request paragraph', () => {
    const body = buildPublicDebateEmailBody({
      organizationName: 'Asociatia Civica Exemplu',
      cityName: 'Cluj-Napoca',
      year: 2026,
    })

    expect(body).toContain(
      'Va solicitam organizarea unei dezbateri publice asupra proiectului de buget al Cluj-Napoca pentru anul 2026. Va rugam sa organizati dezbaterea inainte de expirarea termenului de 15 zile pentru depunerea contestatiilor, reglementat de art. 39, alin. (3) din Legea 273/2006.',
    )
    expect(body).not.toContain('Avand in vedere cele expuse anterior')
  })
})
