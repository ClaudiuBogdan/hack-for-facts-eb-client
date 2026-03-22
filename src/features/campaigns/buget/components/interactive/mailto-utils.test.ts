import { describe, expect, it } from 'vitest'
import { buildContestationEmailBody, buildContestationMailto } from './mailto-utils'

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
})
