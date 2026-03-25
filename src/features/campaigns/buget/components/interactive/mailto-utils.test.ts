import { describe, expect, it } from 'vitest'
import {
  buildContestationEmailBody,
  buildContestationMailto,
  buildDebateRequestMailto,
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

  it('includes the contestation deadline request in the debate-request mailto payload', () => {
    const mailto = buildDebateRequestMailto({
      primariaEmail: 'primaria@example.ro',
      organizationName: 'Asociatia Civica Exemplu',
      year: 2026,
    })

    expect(mailto).toContain(
      encodeURIComponent(
        'Va rugam sa organizati dezbaterea inainte de expirarea termenului de 15 zile pentru depunerea contestatiilor, reglementat de art. 39 alin. (3) din Legea nr. 273/2006.',
      ),
    )
    expect(mailto).toContain(
      encodeURIComponent('art. 6 alin. (7) din Legea nr. 52/2003'),
    )
  })
})
