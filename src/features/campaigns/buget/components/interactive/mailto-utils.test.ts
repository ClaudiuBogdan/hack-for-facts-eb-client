import { describe, expect, it } from 'vitest'
import {
  buildContestationEmailBody,
  buildContestationMailto,
  buildPublicDebateEmailBody,
  parsePlatformCcEmails,
} from './mailto-utils'

describe('mailto-utils', () => {
  it('parses multiple CC recipients from a comma-separated env value', () => {
    expect(
      parsePlatformCcEmails(' first@example.com,second@example.com , , third@example.com '),
    ).toEqual([
      'first@example.com',
      'second@example.com',
      'third@example.com',
    ])
  })

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
      organizationLegalAddress: 'Str. Memorandumului nr. 10, Cluj-Napoca',
      organizationRegistrationNumber: '12/A/2020',
      organizationFiscalCode: '12345678',
      legalRepresentativeName: 'Ana Pop',
      legalRepresentativeRole: 'Presedinte',
      cityName: 'Cluj-Napoca',
      year: 2026,
    })

    expect(body.startsWith('Domnule/ Doamna Primar,')).toBe(true)
    expect(body).not.toContain('Cerere dezbatere buget local - asociatii')
    expect(body).toContain(
      'Subscrisa, Asociatia Civica Exemplu, avand sediul in Str. Memorandumului nr. 10, Cluj-Napoca, inregistrata in Registrul Asociatiilor si Fundatiilor cu nr. 12/A/2020, cu CIF 12345678, prin Ana Pop, in calitate de Presedinte.',
    )
    expect(body).toContain('CERERE DE ORGANIZARE A UNEI DEZBATERI')
    expect(body).toContain(
      'Va solicitam organizarea unei dezbateri publice asupra proiectului de buget al Cluj-Napoca pentru anul 2026. Va rugam sa organizati dezbaterea inainte de expirarea termenului de 15 zile pentru depunerea contestatiilor, reglementat de art. 39, alin. (3) din Legea 273/2006.',
    )
    expect(body).toContain('Consideram ca accesibilitatea este o prioritate')
  })
})
