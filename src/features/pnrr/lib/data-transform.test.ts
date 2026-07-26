import { describe, it, expect } from 'vitest'
import {
  parseProgress,
  classifyStatus,
  normalizeTitle,
  transformProject,
  deduplicateProjects,
  computeAggregates,
  filterProjects,
  groupPnrrProjects,
  hasPnrrComponentMeasureConflict,
  processPnrrBeneficiaryPayments,
  processPnrrData,
  processPnrrOfficialIndicators,
} from './data-transform'
import type { RawPnrrProject } from '@/schemas/pnrr'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeRaw(overrides: Partial<RawPnrrProject> = {}): RawPnrrProject {
  const listedFundingRon =
    overrides.valoare_fe ?? overrides['Valoare (EUR)'] ?? 100_000
  return {
    'Titlu Proiect': 'Test Project',
    'Nume Beneficiar': 'Test Beneficiar',
    'CUI': '12345678',
    'County': 'București',
    'Sursă Finanțare': 'grant',
    'Valoare (EUR)': 100_000,
    valoare_fe: listedFundingRon,
    'Progres Tehnic': '50%',
    'Progres Financiar': '40%',
    'Cod Componentă': 'C4',
    'Cod Măsură': 'I3',
    'Localitate': 'București',
    'CRI': 'MTI',
    ...overrides,
  }
}

function makeOfficialRaw(
  overrides: Partial<RawPnrrProject> = {},
): RawPnrrProject {
  return {
    id_angajament: 3114346815,
    cod_componenta: 'C4',
    cod_masura: 'I3',
    cod_submasura: null,
    cri: 'MTI',
    sursa_finantare: 'grant',
    titlu_contract: 'Autostrada A7',
    denumire_beneficiar:
      'COMPANIA NAȚIONALĂ DE ADMINISTRARE A INFRASTRUCTURII RUTIERE S.A.',
    cui: '16054368',
    valoare_fe: 1_000,
    judet_implementare: 'Bacău',
    localitate_implementare: 'Bacău',
    stadiu: 'ÎN IMPLEMENTARE',
    progres_fizic: 0.8969,
    progres_financiar: 0.6169,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// parseProgress
// ---------------------------------------------------------------------------

describe('parseProgress', () => {
  it('parses percentage strings', () => {
    expect(parseProgress('100%')).toBe(100)
    expect(parseProgress('50%')).toBe(50)
    expect(parseProgress('0%')).toBe(0)
  })

  it('keeps distinct reported progress categories', () => {
    expect(parseProgress('ÎN IMPLEMENTARE (sub 30%)')).toBe(
      'under-30-reported',
    )
    expect(parseProgress('ÎN IMPLEMENTARE')).toBe('in-implementation')
  })

  it('parses explicit finalized status as complete progress', () => {
    expect(parseProgress('FINALIZAT')).toBe(100)
  })

  it('returns null for empty/undefined', () => {
    expect(parseProgress('')).toBeNull()
    expect(parseProgress(undefined)).toBeNull()
  })

  it('parses bare numbers', () => {
    expect(parseProgress('75')).toBe(75)
  })
})

// ---------------------------------------------------------------------------
// classifyStatus
// ---------------------------------------------------------------------------

describe('classifyStatus', () => {
  it('classifies correctly', () => {
    expect(classifyStatus(100)).toBe('completed')
    expect(classifyStatus(0)).toBe('not-started')
    expect(classifyStatus(15)).toBe('under-30')
    expect(classifyStatus(50)).toBe('mid-progress')
    expect(classifyStatus(85)).toBe('advanced')
    expect(classifyStatus('under-30-reported')).toBe('under-30')
    expect(classifyStatus('in-implementation')).toBe('in-implementation')
  })
})

// ---------------------------------------------------------------------------
// normalizeTitle
// ---------------------------------------------------------------------------

describe('normalizeTitle', () => {
  it('normalizes diacritics and case', () => {
    expect(normalizeTitle('Autostrada A7 — Bacău–Pașcani')).toBe(
      'autostrada a7 — bacau–pascani'
    )
  })

  it('collapses whitespace', () => {
    expect(normalizeTitle('  Modernizare   CFR  ')).toBe('modernizare cfr')
  })
})

// ---------------------------------------------------------------------------
// Anomaly detection
// ---------------------------------------------------------------------------

describe('anomaly detection', () => {
  it('flags financial-overrun when fin > 100%', () => {
    const raw = makeRaw({ 'Progres Financiar': '150%' })
    const p = transformProject(raw)
    expect(p.anomalies).toContain('financial-overrun')
  })

  it('does not flag financial-overrun when fin = 100%', () => {
    const raw = makeRaw({ 'Progres Financiar': '100%', 'Progres Tehnic': '100%' })
    const p = transformProject(raw)
    expect(p.anomalies).not.toContain('financial-overrun')
  })

  it('flags payment-ahead-delivery when tech=0 and fin>0', () => {
    const raw = makeRaw({ 'Progres Tehnic': '0%', 'Progres Financiar': '10%' })
    const p = transformProject(raw)
    expect(p.anomalies).toContain('payment-ahead-delivery')
  })

  it('does not flag payment-ahead-delivery when tech=0 and fin=0', () => {
    const raw = makeRaw({ 'Progres Tehnic': '0%', 'Progres Financiar': '0%' })
    const p = transformProject(raw)
    expect(p.anomalies).not.toContain('payment-ahead-delivery')
  })

  it('flags stalled-completion when tech=100 and fin<80', () => {
    const raw = makeRaw({ 'Progres Tehnic': '100%', 'Progres Financiar': '50%' })
    const p = transformProject(raw)
    expect(p.anomalies).toContain('stalled-completion')
    expect(p.anomalies).not.toContain('payment-ahead-delivery')
  })

  it('does not flag stalled-completion when tech=100 and fin>=80', () => {
    const raw = makeRaw({ 'Progres Tehnic': '100%', 'Progres Financiar': '85%' })
    const p = transformProject(raw)
    expect(p.anomalies).not.toContain('stalled-completion')
  })

  it('does not flag normal payment pending when tech=100 and fin 80-99%', () => {
    const raw = makeRaw({ 'Progres Tehnic': '100%', 'Progres Financiar': '85%' })
    const p = transformProject(raw)
    expect(p.anomalies).toHaveLength(0)
    expect(p.anomalies).not.toContain('stalled-completion')
  })

  it('does not flag completed and fully paid projects', () => {
    const raw = makeRaw({ 'Progres Tehnic': '100%', 'Progres Financiar': '100%' })
    const p = transformProject(raw)
    expect(p.anomalies).toHaveLength(0)
    expect(p.anomalies).not.toContain('stalled-completion')
  })

  it('flags payment-ahead-delivery when financial progress is far ahead', () => {
    const raw = makeRaw({ 'Progres Tehnic': '30%', 'Progres Financiar': '86%' })
    const p = transformProject(raw)
    expect(p.anomalies).toContain('payment-ahead-delivery')
  })

  it('does not flag payment-ahead-delivery when technical progress is far ahead', () => {
    const raw = makeRaw({ 'Progres Tehnic': '80%', 'Progres Financiar': '10%' })
    const p = transformProject(raw)
    expect(p.anomalies).not.toContain('payment-ahead-delivery')
  })

  it('flags large-low-progress when value>=10M and tech<30', () => {
    const raw = makeRaw({ 'Valoare (EUR)': 15_000_000, 'Progres Tehnic': '0%' })
    const p = transformProject(raw)
    expect(p.anomalies).toContain('large-low-progress')
  })

  it('flags large-low-progress for the explicit under-30 category', () => {
    const raw = makeRaw({
      'Valoare (EUR)': 15_000_000,
      'Progres Tehnic': 'ÎN IMPLEMENTARE (sub 30%)',
    })
    const p = transformProject(raw)
    expect(p.anomalies).toContain('large-low-progress')
  })

  it('does not invent low progress for a generic in-implementation status', () => {
    const raw = makeRaw({
      'Valoare (EUR)': 15_000_000,
      'Progres Tehnic': 'ÎN IMPLEMENTARE',
    })
    const p = transformProject(raw)
    expect(p.anomalies).not.toContain('large-low-progress')
  })

  it('does not flag large-low-progress when value<10M', () => {
    const raw = makeRaw({ 'Valoare (EUR)': 9_999_999, 'Progres Tehnic': '0%' })
    const p = transformProject(raw)
    expect(p.anomalies).not.toContain('large-low-progress')
  })

  it('does not flag loans to private beneficiaries as anomalies', () => {
    const raw = makeRaw({
      'Sursă Finanțare': 'loan',
      'Nume Beneficiar': 'ACME CORPORATION S.R.L.',
    })
    const p = transformProject(raw)
    expect(p.anomalies).toHaveLength(0)
    expect(p.entityType).toBe('private')
  })

  it('flags large-missing-financial-progress as data quality', () => {
    const raw = makeRaw({
      'Valoare (EUR)': 10_000_000,
      'Progres Financiar': undefined,
    })
    const p = transformProject(raw)
    expect(p.anomalies).toHaveLength(0)
    expect(p.dataQualitySignals).toContain('large-missing-financial-progress')
  })

  it('flags completed-missing-financial-progress as data quality', () => {
    const raw = makeRaw({
      'Valoare (EUR)': 1_000_000,
      'Progres Tehnic': '100%',
      'Progres Financiar': undefined,
    })
    const p = transformProject(raw)
    expect(p.anomalies).toHaveLength(0)
    expect(p.dataQualitySignals).toContain('completed-missing-financial-progress')
  })
})

// ---------------------------------------------------------------------------
// Entity classification — expanded keywords
// ---------------------------------------------------------------------------

describe('entity type classification', () => {
  it('classifies municipalities without diacritics as public', () => {
    const raw = makeRaw({ 'Nume Beneficiar': 'ORASUL NUCET' })
    const p = transformProject(raw)
    expect(p.entityType).toBe('public')
  })

  it('classifies ORAS (without suffix) as public', () => {
    const raw = makeRaw({ 'Nume Beneficiar': 'ORAS ZLATNA' })
    const p = transformProject(raw)
    expect(p.entityType).toBe('public')
  })

  it('classifies MUNICIPIU (without suffix) as public', () => {
    const raw = makeRaw({ 'Nume Beneficiar': 'MUNICIPIU RM. VÂLCEA' })
    const p = transformProject(raw)
    expect(p.entityType).toBe('public')
  })

  it('classifies schools (LICEUL, COLEGIUL) as public', () => {
    const raw1 = makeRaw({ 'Nume Beneficiar': 'LICEUL TEORETIC ION CREANGĂ' })
    expect(transformProject(raw1).entityType).toBe('public')

    const raw2 = makeRaw({ 'Nume Beneficiar': 'COLEGIUL NATIONAL DE INFORMATICA' })
    expect(transformProject(raw2).entityType).toBe('public')
  })

  it('classifies national companies as public institutions', () => {
    const raw = makeRaw({
      'Nume Beneficiar': 'SOCIETATEA NATIONALA DE TRANSPORT FEROVIAR CFR',
    })
    const p = transformProject(raw)
    expect(p.entityType).toBe('public')
  })

  it('classifies ADMINISTRATIA as public', () => {
    const raw = makeRaw({
      'Nume Beneficiar': 'ADMINISTRATIA NATIONALA APELE ROMANE',
    })
    const p = transformProject(raw)
    expect(p.entityType).toBe('public')
  })

  it('classifies ACADEMIA as public', () => {
    const raw = makeRaw({ 'Nume Beneficiar': 'ACADEMIA DE STUDII ECONOMICE' })
    const p = transformProject(raw)
    expect(p.entityType).toBe('public')
  })

  it('classifies REGIA AUTONOMA as public', () => {
    const raw = makeRaw({ 'Nume Beneficiar': 'REGIA AUTONOMA DE APĂ' })
    const p = transformProject(raw)
    expect(p.entityType).toBe('public')
  })

  it('classifies POLIȚIA as public', () => {
    const raw = makeRaw({ 'Nume Beneficiar': 'POLIȚIA ROMÂNĂ - INSPECTORAT' })
    const p = transformProject(raw)
    expect(p.entityType).toBe('public')
  })

  it('classifies PAROHIA as private / non-public religious beneficiary', () => {
    const raw = makeRaw({ 'Nume Beneficiar': 'PAROHIA ORTODOXĂ SF. NICOLAE' })
    const p = transformProject(raw)
    expect(p.entityType).toBe('private')
    expect(p.beneficiaryType).toBe('religious')
  })

  it('classifies national public institutions as public sector with national detailed type', () => {
    const raw = makeRaw({
      'Nume Beneficiar': 'CENTRUL NATIONAL DE COORDONARE PNRR',
      'County': 'Național',
      Localitate: 'NAȚIONAL',
    })
    const p = transformProject(raw)
    expect(p.entityType).toBe('public')
    expect(p.beneficiaryType).toBe('national')
  })

  it('classifies national-row companies with legal markers as private', () => {
    const raw = makeRaw({
      'Nume Beneficiar': 'EXEMPLU DIGITAL SOLUTIONS SRL',
      'County': 'Național',
      Localitate: 'NAȚIONAL',
    })
    const p = transformProject(raw)
    expect(p.entityType).toBe('private')
  })

  it('classifies official public companies as public-company beneficiaries', () => {
    const raw = makeRaw({
      'Nume Beneficiar': 'COMPANIA NATIONALA DE CAI FERATE CFR SA',
      CUI: '11054529',
      'County': 'Național',
      Localitate: 'NAȚIONAL',
    })
    const p = transformProject(raw)
    expect(p.entityType).toBe('public')
    expect(p.beneficiaryType).toBe('public-company')
  })

  it('keeps official public companies with SRL markers in the public sector', () => {
    const p = transformProject(makeRaw({
      'Nume Beneficiar': 'EUROBAC SRL',
      CUI: '17670528',
    }))

    expect(p.entityType).toBe('public')
    expect(p.beneficiaryType).toBe('public-company')
  })

  it('classifies genuine private companies as private', () => {
    const raw = makeRaw({ 'Nume Beneficiar': 'NXP SEMICONDUCTORS ROMANIA SRL' })
    const p = transformProject(raw)
    expect(p.entityType).toBe('private')
  })

  it('keeps generic national-row companies with legal markers private', () => {
    const raw = makeRaw({
      'Nume Beneficiar': 'EXEMPLU DIGITAL SOLUTIONS SRL',
      'County': 'Național',
      Localitate: 'NAȚIONAL',
    })
    const p = transformProject(raw)
    expect(p.entityType).toBe('private')
    expect(p.beneficiaryType).toBe('company')
  })

  it('classifies central government services missing from the directory as public', () => {
    expect(
      transformProject(makeRaw({ 'Nume Beneficiar': 'SECRETARIATUL GENERAL AL GUVERNULUI' })).entityType
    ).toBe('public')

    expect(
      transformProject(makeRaw({ 'Nume Beneficiar': 'SERVICIUL DE TELECOMUNICATII SPECIALE' })).entityType
    ).toBe('public')
  })

  it('classifies associations and foundations as private / non-public', () => {
    expect(
      transformProject(makeRaw({ 'Nume Beneficiar': 'ASOCIATIA EXEMPLU CIVIC' })).entityType
    ).toBe('private')

    expect(
      transformProject(makeRaw({ 'Nume Beneficiar': 'FUNDATIA PENTRU EDUCATIE' })).entityType
    ).toBe('private')
  })

  it('falls back unknown beneficiaries to private / non-public', () => {
    const p = transformProject(makeRaw({ 'Nume Beneficiar': 'BENEFICIAR NECUNOSCUT' }))
    expect(p.entityType).toBe('private')
    expect(p.beneficiaryType).toBe('other-private')
  })

  it('does not classify county name context as county council', () => {
    const chamber = transformProject(makeRaw({
      'Nume Beneficiar': 'CAMERA DE COMERT SI INDUSTRIE A JUDETULUI HUNEDOARA',
      CUI: '4371311',
      'County': 'Hunedoara',
      Localitate: 'Hunedoara',
    }))
    const school = transformProject(makeRaw({
      'Nume Beneficiar': 'SCOALA GIMNAZIALA , Comuna TRIFESTI, Judetul NEAMT',
      CUI: '17641395',
      'County': 'Neamț',
      Localitate: 'TRIFEȘTI',
    }))
    const health = transformProject(makeRaw({
      'Nume Beneficiar': 'DIRECTIA DE SANATATE PUBLICA A JUDETULUI BIHOR',
      CUI: '4230398',
      'County': 'Bihor',
      Localitate: 'Oradea',
    }))
    const countyCouncil = transformProject(makeRaw({
      'Nume Beneficiar': 'JUDEȚUL HUNEDOARA',
      CUI: '4374474',
      'County': 'Hunedoara',
      Localitate: 'JUDEȚUL HUNEDOARA',
    }))

    expect(chamber.entityType).toBe('private')
    expect(chamber.beneficiaryType).toBe('other-private')
    expect(school.beneficiaryType).toBe('education')
    expect(health.beneficiaryType).toBe('health')
    expect(countyCouncil.beneficiaryType).toBe('county-council')
    const filtered = filterProjects([chamber, school, health, countyCouncil], {
      beneficiaryTypes: ['county-council'],
    })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].beneficiary).toBe(countyCouncil.beneficiary)
    expect(filtered[0].beneficiaryType).toBe(countyCouncil.beneficiaryType)
    expect(filtered[0].county).toBe(countyCouncil.county)
  })

  it('does not assign public detailed groups to private / non-public beneficiaries', () => {
    const p = transformProject(makeRaw({ 'Nume Beneficiar': 'CLINICA PRIVATA EXEMPLU' }))
    expect(p.entityType).toBe('private')
    expect(p.beneficiaryType).toBe('other-private')
  })

  it('classifies detailed beneficiary types from the entity directory and name', () => {
    expect(
      transformProject(makeRaw({
        'Nume Beneficiar': 'MUNICIPIUL SIBIU',
        CUI: '4270740',
        'County': 'Sibiu',
        Localitate: 'Sibiu',
      })).beneficiaryType
    ).toBe('uat')

    expect(
      transformProject(makeRaw({
        'Nume Beneficiar': 'MINISTERUL APARARII NATIONALE',
        CUI: '11424532',
        'County': 'Sibiu',
        Localitate: 'Sibiu',
      })).beneficiaryType
    ).toBe('ministry')

    expect(
      transformProject(makeRaw({
        'Nume Beneficiar': 'UNIVERSITATEA ,, LUCIAN BLAGA  DIN SIBIU',
        CUI: '4480173',
      })).beneficiaryType
    ).toBe('education')

    expect(
      transformProject(makeRaw({
        'Nume Beneficiar': 'INTEGRATED ENGINEERING SOLUTIONS SRL',
        CUI: '31233421',
      })).beneficiaryType
    ).toBe('company')
  })
})

// ---------------------------------------------------------------------------
// transformProject
// ---------------------------------------------------------------------------

describe('transformProject', () => {
  it('transforms a raw project', () => {
    const raw = makeRaw()
    const p = transformProject(raw)

    expect(p.title).toBe('Test Project')
    expect(p.beneficiary).toBe('Test Beneficiar')
    expect(p.cui).toBe('12345678')
    expect(p.county).toBe('București')
    expect(p.fundingSource).toBe('grant')
    expect(p.listedFundingRon).toBe(100_000)
    expect(p.techProgress).toBe(50)
    expect(p.finProgress).toBe(40)
    expect(p.componentCode).toBe('C4')
    expect(p.measureCode).toBe('I3')
    expect(p.measureFullCode).toBe('C4-I3')
    expect(p.cri).toBe('MTI')
    expect(p.status).toBe('mid-progress')
    expect(p.isReform).toBe(false)
  })

  it('preserves the published MIPE contract, dates, RON values, and labels', () => {
    const p = transformProject(
      makeRaw({
        id_angajament: '3114346815',
        nr_contract: 'OMF. Nr. 1403',
        data_angajament: '2022-06-09T21:00:00Z',
        data_inceput: '2022-06-09T21:00:00Z',
        data_finalizare: '2026-12-30T22:00:00Z',
        valoare_total: 113_133_054.56,
        valoare_fe: 100_000_000,
        valoare_fpn: 5_000_000,
        valoare_tva: 8_000_000,
        valoare_neeligibil: 133_054.56,
        tip_beneficiar: 'ADMINISTRAȚIE PUBLICĂ CENTRALĂ',
        impact: 'URBAN',
        cri_denumire: 'Ministerul Finanțelor',
      }),
    )

    expect(p).toMatchObject({
      engagementId: '3114346815',
      contractNumber: 'OMF. Nr. 1403',
      commitmentDate: '2022-06-09T21:00:00Z',
      startDate: '2022-06-09T21:00:00Z',
      endDate: '2026-12-30T22:00:00Z',
      totalValueRon: 113_133_054.56,
      sourceValueRon: 100_000_000,
      nationalContributionRon: 5_000_000,
      vatValueRon: 8_000_000,
      ineligibleValueRon: 133_054.56,
      sourceBeneficiaryType: 'ADMINISTRAȚIE PUBLICĂ CENTRALĂ',
      impact: 'URBAN',
      criName: 'Ministerul Finanțelor',
      sourceUrl: 'https://mfe.gov.ro/pnrr-dashboard',
    })
  })

  it('preserves an explicit under-30 MIPE status when no numeric progress exists', () => {
    const p = transformProject(
      makeRaw({
        id_angajament: 'status-under-30',
        valoare_fe: 100,
        progres_fizic: null,
        stadiu: 'ÎN IMPLEMENTARE (sub 30%)',
      }),
    )

    expect(p.techProgress).toBe('under-30-reported')
    expect(p.status).toBe('under-30')
  })

  it('marks explicit finalized projects as completed', () => {
    const p = transformProject(makeRaw({ 'Progres Tehnic': 'FINALIZAT' }))
    expect(p.techProgress).toBe(100)
    expect(p.status).toBe('completed')
  })

  it('flags financial overrun', () => {
    const raw = makeRaw({ 'Progres Financiar': '150%' })
    const p = transformProject(raw)
    expect(p.anomalies).toContain('financial-overrun')
  })

  it('flags payment ahead of delivery', () => {
    const raw = makeRaw({ 'Progres Tehnic': '0%', 'Progres Financiar': '10%' })
    const p = transformProject(raw)
    expect(p.anomalies).toContain('payment-ahead-delivery')
  })

  it('flags large low progress', () => {
    const raw = makeRaw({ 'Valoare (EUR)': 15_000_000, 'Progres Tehnic': '0%' })
    const p = transformProject(raw)
    expect(p.anomalies).toContain('large-low-progress')
  })

  it('assigns UAT from direct local authority CUI', () => {
    const p = transformProject(
      makeRaw({
        'Nume Beneficiar': 'MUNICIPIUL SIBIU',
        CUI: '4270740',
        'County': 'Sibiu',
        Localitate: 'MUNICIPIUL SIBIU',
      })
    )

    expect(p.sirutaCode).toBe('143450')
  })

  it('keeps county councils at county level instead of their registry address', () => {
    const p = transformProject(
      makeRaw({
        'Titlu Proiect': 'Microbuze electrice pentru elevii din județul Ilfov',
        'Nume Beneficiar': 'JUDETUL ILFOV',
        CUI: '4192545',
        'County': 'Ilfov',
        Localitate: 'JUDEȚUL ILFOV',
      })
    )

    expect(p.sirutaCode).toBeNull()
    expect(p.county).toBe('Ilfov')
    expect(p.locality).toBe('Județul Ilfov')
  })

  it('assigns UAT from a local institution registry address', () => {
    const p = transformProject(
      makeRaw({
        'Nume Beneficiar': 'UNIVERSITATEA ,, LUCIAN BLAGA  DIN SIBIU',
        CUI: '4480173',
        'County': 'București',
        Localitate: 'București',
      })
    )

    expect(p.sirutaCode).toBe('143450')
    expect(p.county).toBe('Sibiu')
    expect(p.locality).toBe('Municipiul Sibiu')
  })

  it('does not assign central ministries to project-row localities', () => {
    const p = transformProject(
      makeRaw({
        'Nume Beneficiar': 'MINISTERUL APARARII NATIONALE',
        CUI: '11424532',
        'County': 'Sibiu',
        Localitate: 'MUNICIPIUL SIBIU',
      })
    )

    expect(p.sirutaCode).toBeNull()
    expect(p.county).toBe('Național')
    expect(p.locality).toBe('Național')
  })

  it('does not assign unknown private entities from locality alone', () => {
    const p = transformProject(
      makeRaw({
        'Nume Beneficiar': 'INTEGRATED ENGINEERING SOLUTIONS SRL',
        CUI: '31233421',
        'County': 'Sibiu',
        Localitate: 'MUNICIPIUL SIBIU',
      })
    )

    expect(p.sirutaCode).toBeNull()
  })

  it('does not assign national agencies to Bucharest sectors', () => {
    const p = transformProject(
      makeRaw({
        'Nume Beneficiar': 'AGENTIA NATIONALA DE ADMINISTRARE FISCALA',
        CUI: '16031712',
        'County': 'București',
        Localitate: 'SECTORUL 5 AL MUNICIPIULUI BUCUREȘTI',
      })
    )

    expect(p.sirutaCode).toBeNull()
  })

  it('assigns Bucharest local institutions to the registry-address sector', () => {
    const p = transformProject(
      makeRaw({
        'Nume Beneficiar': 'ADMINISTRATIA SPITALELOR SI SERVICIILOR MEDICALE BUCURESTI',
        CUI: '25502860',
        'County': 'București',
        Localitate: 'București',
      })
    )

    expect(p.sirutaCode).toBe('179178')
  })

  it('assigns Municipiul București as a UAT instead of a sector', () => {
    const p = transformProject(
      makeRaw({
        'Nume Beneficiar': 'MUNICIPIUL BUCURESTI',
        CUI: '4267117',
        'County': 'București',
        Localitate: 'București',
      })
    )

    expect(p.sirutaCode).toBe('179132')
    expect(p.county).toBe('București')
    expect(p.locality).toBe('Municipiul București')
  })
})

// ---------------------------------------------------------------------------
// deduplicateProjects
// ---------------------------------------------------------------------------

describe('deduplicateProjects', () => {
  it('removes exact duplicates', () => {
    const raw = makeRaw()
    const p1 = transformProject(raw)
    const p2 = transformProject(raw)
    const deduped = deduplicateProjects([p1, p2])
    expect(deduped).toHaveLength(1)
  })

  it('keeps different projects', () => {
    const p1 = transformProject(makeRaw({ 'Titlu Proiect': 'Project A' }))
    const p2 = transformProject(makeRaw({ 'Titlu Proiect': 'Project B' }))
    const deduped = deduplicateProjects([p1, p2])
    expect(deduped).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// computeAggregates
// ---------------------------------------------------------------------------

describe('computeAggregates', () => {
  it('computes totals', () => {
    const projects = [
      transformProject(makeRaw({ 'Valoare (EUR)': 100 })),
      transformProject(makeRaw({ 'Valoare (EUR)': 200, 'Titlu Proiect': 'Other' })),
    ]
    const agg = computeAggregates(projects)

    expect(agg.rawTotalValue).toBe(300)
    expect(agg.projectCount).toBe(2)
    expect(agg.projectRecordCount).toBe(2)
    expect(agg.rawProjectCount).toBe(2)
    expect(agg.deduplicatedProjectCount).toBe(2)
  })

  it('counts duplicate official engagement rows as one project but sums both values', () => {
    const { projects } = processPnrrData([
      makeOfficialRaw({ id_angajament: 123, valoare_fe: 1_000 }),
      makeOfficialRaw({ id_angajament: 123, valoare_fe: 2_000 }),
    ])
    const agg = computeAggregates(projects)

    expect(agg.projectCount).toBe(1)
    expect(agg.projectRecordCount).toBe(2)
    expect(agg.rawProjectCount).toBe(2)
    expect(agg.rawTotalValue).toBe(3000)
    expect(agg.topBeneficiaries[0].count).toBe(1)
  })

  it('computes funding source totals', () => {
    const projects = [
      transformProject(makeRaw({ 'Sursă Finanțare': 'grant', 'Valoare (EUR)': 100 })),
      transformProject(
        makeRaw({ 'Sursă Finanțare': 'loan', 'Valoare (EUR)': 200, 'Titlu Proiect': 'Loan' })
      ),
    ]
    const agg = computeAggregates(projects)

    expect(agg.grantTotal).toBe(100)
    expect(agg.loanTotal).toBe(200)
  })

  it('counts risk and data-quality signals separately', () => {
    const projects = [
      transformProject(makeRaw({ 'Progres Tehnic': '100%', 'Progres Financiar': '50%', 'Titlu Proiect': 'Stalled' })),
      transformProject(makeRaw({
        'Valoare (EUR)': 10_000_000,
        'Progres Financiar': undefined,
        'Titlu Proiect': 'Missing',
      })),
    ]
    const agg = computeAggregates(projects)
    expect(agg.anomalyCounts['stalled-completion'].count).toBe(1)
    expect(agg.dataQualitySignalCounts['large-missing-financial-progress'].count).toBe(1)
  })

  it('tracks missing financial progress', () => {
    const projects = [
      transformProject(makeRaw({ 'Progres Financiar': undefined })),
      transformProject(makeRaw({ 'Progres Financiar': '50%', 'Titlu Proiect': 'Other' })),
    ]
    const agg = computeAggregates(projects)
    expect(agg.missingFinProgressCount).toBe(1)
    expect(agg.missingFinProgressPercent).toBe(50)
  })
})

// ---------------------------------------------------------------------------
// filterProjects
// ---------------------------------------------------------------------------

describe('filterProjects', () => {
  const projects = [
    transformProject(
      makeRaw({ 'Titlu Proiect': 'Alpha', 'Cod Componentă': 'C4', 'Nume Beneficiar': 'Alpha SRL' })
    ),
    transformProject(
      makeRaw({ 'Titlu Proiect': 'Beta', 'Cod Componentă': 'C15', 'County': 'Cluj', 'Nume Beneficiar': 'Beta SA' })
    ),
  ]

  it('filters by search', () => {
    const result = filterProjects(projects, { search: 'Alpha' })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Alpha')
  })

  it('searches by MIPE engagement ID and contract number', () => {
    const indexed = transformProject(
      makeRaw({
        id_angajament: '3114346815',
        nr_contract: 'OMF. Nr. 1403',
        valoare_fe: 500,
      }),
    )

    expect(filterProjects([indexed], { search: '3114346815' })).toHaveLength(1)
    expect(filterProjects([indexed], { search: 'OMF' })).toHaveLength(1)
  })

  it('filters by beneficiary search (name substring)', () => {
    const result = filterProjects(projects, { beneficiarySearch: 'Beta' })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Beta')
  })

  it('filters by beneficiary search (CUI prefix)', () => {
    const withCui = [
      transformProject(makeRaw({ 'Titlu Proiect': 'Alpha', 'Cod Componentă': 'C4', 'Nume Beneficiar': 'Alpha SRL', 'CUI': '11111111' })),
      transformProject(makeRaw({ 'Titlu Proiect': 'Beta', 'Cod Componentă': 'C15', 'County': 'Cluj', 'Nume Beneficiar': 'Beta SA', 'CUI': '22222222' })),
      transformProject(makeRaw({ 'Titlu Proiect': 'Gamma', 'Nume Beneficiar': 'Gamma SRL', 'CUI': '98765432' })),
    ]
    const result = filterProjects(withCui, { beneficiarySearch: '98765' })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Gamma')
  })

  it('filters by beneficiary search (CUI exact)', () => {
    const withCui = [
      transformProject(makeRaw({ 'Titlu Proiect': 'Alpha', 'Cod Componentă': 'C4', 'Nume Beneficiar': 'Alpha SRL', 'CUI': '11111111' })),
      transformProject(makeRaw({ 'Titlu Proiect': 'Beta', 'Cod Componentă': 'C15', 'County': 'Cluj', 'Nume Beneficiar': 'Beta SA', 'CUI': '22222222' })),
      transformProject(makeRaw({ 'Titlu Proiect': 'Gamma', 'Nume Beneficiar': 'Gamma SRL', 'CUI': '98765432' })),
    ]
    const result = filterProjects(withCui, { beneficiarySearch: '98765432' })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Gamma')
  })

  it('filters by exact beneficiary CUI', () => {
    const withCui = [
      transformProject(makeRaw({ 'Titlu Proiect': 'Alpha', 'Cod Componentă': 'C4', 'Nume Beneficiar': 'Shared Name', 'CUI': '11111111' })),
      transformProject(makeRaw({ 'Titlu Proiect': 'Beta', 'Cod Componentă': 'C15', 'County': 'Cluj', 'Nume Beneficiar': 'Shared Name', 'CUI': '22222222' })),
      transformProject(makeRaw({ 'Titlu Proiect': 'Gamma', 'Nume Beneficiar': 'No CUI', 'CUI': null })),
    ]
    const result = filterProjects(withCui, { beneficiaryCui: '22222222' })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Beta')
  })

  it('normalizes beneficiary CUI filter prefixes and whitespace', () => {
    const withCui = [
      transformProject(makeRaw({ 'Titlu Proiect': 'Alpha', 'Cod Componentă': 'C4', 'Nume Beneficiar': 'Alpha SRL', 'CUI': '11111111' })),
      transformProject(makeRaw({ 'Titlu Proiect': 'Beta', 'Cod Componentă': 'C15', 'County': 'Cluj', 'Nume Beneficiar': 'Beta SA', 'CUI': '22222222' })),
    ]
    const result = filterProjects(withCui, { beneficiaryCui: ' RO 22222222 ' })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Beta')
  })

  it('filters by exact UAT SIRUTA code', () => {
    const withSiruta = [
      { ...transformProject(makeRaw({ 'Titlu Proiect': 'Alpha', 'Localitate': 'A' })), sirutaCode: '1001' },
      { ...transformProject(makeRaw({ 'Titlu Proiect': 'Beta', 'Localitate': 'B' })), sirutaCode: '2002' },
      { ...transformProject(makeRaw({ 'Titlu Proiect': 'Gamma', 'Localitate': 'C' })), sirutaCode: null },
    ]
    const result = filterProjects(withSiruta, { uatSiruta: '2002' })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Beta')
  })

  it('keeps UAT and county filters on the same resolved local geography', () => {
    const sibiuBeneficiaryWithRawBucharestRow = transformProject(
      makeRaw({
        'Titlu Proiect': 'NETSIM',
        'Nume Beneficiar': 'UNIVERSITATEA ,, LUCIAN BLAGA  DIN SIBIU',
        CUI: '4480173',
        'County': 'București',
        Localitate: 'București',
      })
    )

    expect(
      filterProjects([sibiuBeneficiaryWithRawBucharestRow], {
        uatSiruta: '143450',
        counties: ['București'],
      })
    ).toHaveLength(0)

    expect(
      filterProjects([sibiuBeneficiaryWithRawBucharestRow], {
        uatSiruta: '143450',
        counties: ['Sibiu'],
      })
    ).toHaveLength(1)
  })

  it('keeps Ilfov county council out of the Bucharest county filter', () => {
    const ilfovCouncilProject = transformProject(
      makeRaw({
        'Titlu Proiect': 'Microbuze electrice pentru elevii din județul Ilfov',
        'Nume Beneficiar': 'JUDETUL ILFOV',
        CUI: '4192545',
        'County': 'Ilfov',
        Localitate: 'JUDEȚUL ILFOV',
      })
    )

    expect(filterProjects([ilfovCouncilProject], { counties: ['București'] })).toHaveLength(0)
    expect(filterProjects([ilfovCouncilProject], { counties: ['Ilfov'] })).toHaveLength(1)
    expect(filterProjects([ilfovCouncilProject], { uatSirutas: ['IF'] })).toHaveLength(0)
  })

  it('filters by component', () => {
    const result = filterProjects(projects, { components: ['C4'] })
    expect(result).toHaveLength(1)
    expect(result[0].componentCode).toBe('C4')
  })

  it('filters by county', () => {
    const result = filterProjects(projects, { counties: ['Cluj'] })
    expect(result).toHaveLength(1)
    expect(result[0].county).toBe('Cluj')
  })

  it('filters by progress category', () => {
    const result = filterProjects(projects, { progressCategories: ['mid-progress'] })
    expect(result).toHaveLength(2)
  })

  it('filters by anomaly', () => {
    const anomalyProjects = [
      transformProject(makeRaw({ 'Progres Financiar': '150%' })),
      transformProject(makeRaw({ 'Titlu Proiect': 'Normal' })),
    ]
    const result = filterProjects(anomalyProjects, { onlyAnomalies: true })
    expect(result).toHaveLength(1)
    expect(result[0].anomalies).toContain('financial-overrun')
  })

  it('filters by anomaly type', () => {
    const anomalyProjects = [
      transformProject(makeRaw({ 'Progres Financiar': '150%', 'Titlu Proiect': 'A' })),
      transformProject(makeRaw({ 'Progres Tehnic': '0%', 'Progres Financiar': '10%', 'Titlu Proiect': 'B' })),
    ]
    const result = filterProjects(anomalyProjects, { anomalyTypes: ['payment-ahead-delivery'] })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('B')
  })

  it('preserves every matching project slice for project-level risk filters', () => {
    const riskRecord = {
      ...transformProject(
        makeRaw({
          'Titlu Proiect': 'Shared project',
          'Valoare (EUR)': 10_000,
          'Progres Financiar': '150%',
        }),
      ),
      id: 'risk-record',
      engagementId: 'shared-engagement',
    }
    const normalRecord = {
      ...transformProject(
        makeRaw({
          'Titlu Proiect': 'Shared project',
          'Valoare (EUR)': 20_000,
          'Cod Componentă': 'C5',
        }),
      ),
      id: 'normal-record',
      engagementId: 'shared-engagement',
    }
    const grouped = groupPnrrProjects([riskRecord, normalRecord])

    const [result] = filterProjects(grouped, { onlyAnomalies: true })

    expect(result.recordCount).toBe(2)
    expect(result.records).toHaveLength(2)
    expect(result.listedFundingTotalRon).toBe(30_000)
  })

  it('treats selected risk and data-quality signal types as an OR filter', () => {
    const risk = transformProject(
      makeRaw({
        'Titlu Proiect': 'Risk',
        'Progres Financiar': '150%',
      }),
    )
    const dataQuality = transformProject(
      makeRaw({
        'Titlu Proiect': 'Data quality',
        'Valoare (EUR)': 10_000_000,
        'Progres Financiar': undefined,
      }),
    )

    const result = filterProjects([risk, dataQuality], {
      anomalyTypes: ['financial-overrun'],
      dataQualitySignalTypes: ['large-missing-financial-progress'],
    })

    expect(result.map((project) => project.title).sort()).toEqual([
      'Data quality',
      'Risk',
    ])
  })

  it('filters by data-quality signal type', () => {
    const projectsWithDataQuality = [
      transformProject(makeRaw({
        'Valoare (EUR)': 10_000_000,
        'Progres Financiar': undefined,
        'Titlu Proiect': 'Missing',
      })),
      transformProject(makeRaw({ 'Titlu Proiect': 'Normal' })),
    ]
    const result = filterProjects(projectsWithDataQuality, {
      dataQualitySignalTypes: ['large-missing-financial-progress'],
    })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Missing')
  })

  it('onlyAnomalies ignores projects with only data-quality signals', () => {
    const projectsWithDataQuality = [
      transformProject(makeRaw({
        'Valoare (EUR)': 10_000_000,
        'Progres Financiar': undefined,
        'Titlu Proiect': 'Missing',
      })),
      transformProject(makeRaw({ 'Progres Financiar': '150%', 'Titlu Proiect': 'Overrun' })),
    ]
    const result = filterProjects(projectsWithDataQuality, { onlyAnomalies: true })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Overrun')
  })

  it('filters by entity type', () => {
    const result = filterProjects(projects, { entityTypes: ['private'] })
    expect(result).toHaveLength(2) // Test Beneficiar is private
  })

  it('filters by detailed beneficiary type', () => {
    const typedProjects = [
      transformProject(makeRaw({
        'Titlu Proiect': 'Sibiu',
        'Nume Beneficiar': 'MUNICIPIUL SIBIU',
        CUI: '4270740',
        'County': 'Sibiu',
        Localitate: 'Sibiu',
      })),
      transformProject(makeRaw({
        'Titlu Proiect': 'Ministry',
        'Nume Beneficiar': 'MINISTERUL APARARII NATIONALE',
        CUI: '11424532',
      })),
      transformProject(makeRaw({
        'Titlu Proiect': 'Company',
        'Nume Beneficiar': 'ACME SRL',
        CUI: '99999999',
      })),
      transformProject(makeRaw({
        'Titlu Proiect': 'National',
        'Nume Beneficiar': 'CENTRUL NATIONAL DE COORDONARE PNRR',
        CUI: null,
        'County': 'Național',
        Localitate: 'NAȚIONAL',
      })),
    ]

    expect(filterProjects(typedProjects, { beneficiaryTypes: ['uat'] })).toHaveLength(1)
    expect(filterProjects(typedProjects, { beneficiaryTypes: ['company'] })).toHaveLength(1)
    expect(filterProjects(typedProjects, { beneficiaryTypes: ['public'] })).toHaveLength(3)
    expect(filterProjects(typedProjects, { beneficiaryTypes: ['national'] })).toHaveLength(1)
    expect(filterProjects(typedProjects, { beneficiaryTypes: ['ministry'] })).toHaveLength(1)

    const officialPublicCompany = transformProject(makeRaw({
      'Titlu Proiect': 'Public company',
      'Nume Beneficiar': 'COMPANIA NATIONALA DE CAI FERATE CFR SA',
      CUI: '11054529',
      'County': 'Național',
      Localitate: 'NAȚIONAL',
    }))
    expect(filterProjects([officialPublicCompany], { beneficiaryTypes: ['public-company'] })).toHaveLength(1)
  })

  it('keeps public and private entity filters exhaustive', () => {
    const mixedProjects = [
      transformProject(makeRaw({
        'Titlu Proiect': 'Local public',
        'Nume Beneficiar': 'MUNICIPIUL SIBIU',
        'Valoare (EUR)': 100,
      })),
      transformProject(makeRaw({
        'Titlu Proiect': 'National public',
        'Nume Beneficiar': 'CENTRUL NATIONAL DE COORDONARE PNRR',
        'County': 'Național',
        Localitate: 'NAȚIONAL',
        'Valoare (EUR)': 200,
      })),
      transformProject(makeRaw({
        'Titlu Proiect': 'Company',
        'Nume Beneficiar': 'ACME SRL',
        'Valoare (EUR)': 300,
      })),
      transformProject(makeRaw({
        'Titlu Proiect': 'NGO',
        'Nume Beneficiar': 'ASOCIATIA EXEMPLU',
        'Valoare (EUR)': 400,
      })),
    ]

    const allTotal = computeAggregates(mixedProjects).rawTotalValue
    const publicTotal = computeAggregates(
      filterProjects(mixedProjects, { entityTypes: ['public'] }),
    ).rawTotalValue
    const privateTotal = computeAggregates(
      filterProjects(mixedProjects, { entityTypes: ['private'] }),
    ).rawTotalValue

    expect(publicTotal).toBe(300)
    expect(privateTotal).toBe(700)
    expect(publicTotal + privateTotal).toBe(allTotal)
  })

  it('filters national records through the detailed beneficiary type', () => {
    const nationalDetailed = transformProject(makeRaw({
      'Titlu Proiect': 'National detailed',
      'Nume Beneficiar': 'CENTRUL NATIONAL DE COORDONARE PNRR',
      CUI: null,
      'County': 'Național',
      Localitate: 'NAȚIONAL',
    }))
    const nationalPublicCompany = transformProject(makeRaw({
      'Titlu Proiect': 'National public company',
      'Nume Beneficiar': 'COMPANIA NATIONALA DE CAI FERATE CFR SA',
      CUI: '11054529',
      'County': 'Național',
      Localitate: 'NAȚIONAL',
    }))
    const privateProject = transformProject(makeRaw({ 'Titlu Proiect': 'Private', 'Nume Beneficiar': 'ACME SRL' }))

    expect(nationalDetailed.entityType).toBe('public')
    expect(nationalDetailed.beneficiaryType).toBe('national')

    const result = filterProjects(
      [nationalDetailed, nationalPublicCompany, privateProject],
      { beneficiaryTypes: ['national'] },
    )
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('National detailed')
  })

  it('includes national projects by default', () => {
    const national = transformProject(makeRaw({ 'County': 'Național' }))
    const result = filterProjects([national, ...projects], {})
    expect(result).toHaveLength(3)
  })

  it('excludes national projects when flag is false', () => {
    const national = transformProject(makeRaw({ 'County': 'Național' }))
    const result = filterProjects([national, ...projects], { includeNational: false })
    expect(result).toHaveLength(2)
  })

  it('includes national projects when flag is set', () => {
    const national = transformProject(makeRaw({ 'County': 'Național' }))
    const result = filterProjects([national, ...projects], { includeNational: true })
    expect(result).toHaveLength(3)
  })

  it('excludes micro projects when flag is set', () => {
    const micro = transformProject(makeRaw({ 'Valoare (EUR)': 3000, 'Titlu Proiect': 'Micro' }))
    const result = filterProjects([...projects, micro], { excludeMicro: true })
    expect(result).toHaveLength(2) // Micro excluded
  })

  it('applies the micro threshold to the grouped project total', () => {
    const first = {
      ...transformProject(
        makeRaw({ 'Titlu Proiect': 'Grouped micro', 'Valoare (EUR)': 3_000 }),
      ),
      id: 'micro-a',
      engagementId: 'grouped-micro',
    }
    const second = {
      ...transformProject(
        makeRaw({ 'Titlu Proiect': 'Grouped micro', 'Valoare (EUR)': 3_000 }),
      ),
      id: 'micro-b',
      engagementId: 'grouped-micro',
    }
    const grouped = groupPnrrProjects([first, second])

    expect(filterProjects(grouped, { excludeMicro: true })).toHaveLength(1)
  })
})

describe('hasPnrrComponentMeasureConflict', () => {
  it('detects direct URLs whose selected measures belong to another component', () => {
    expect(
      hasPnrrComponentMeasureConflict({
        components: ['C15'],
        measures: ['C16.I4.grant'],
      }),
    ).toBe(true)
    expect(
      hasPnrrComponentMeasureConflict({
        components: ['C15', 'C16'],
        measures: ['C16.I4.grant'],
      }),
    ).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// processPnrrData (contract test)
// ---------------------------------------------------------------------------

describe('processPnrrData', () => {
  it('keeps legacy EUR observations out of RON aggregates', () => {
    const legacy = {
      ...makeRaw({ 'Valoare (EUR)': 125_000 }),
      valoare_fe: undefined,
    }
    const project = transformProject(legacy)

    expect(project.listedFundingRon).toBe(0)
    expect(project.sourceValueRon).toBeNull()
    expect(project.sourceValueEur).toBe(125_000)
  })

  it('processes raw array', () => {
    const raw = [
      makeRaw({ 'Valoare (EUR)': 100 }),
      makeRaw({ 'Titlu Proiect': 'Second', 'Valoare (EUR)': 200 }),
    ]
    const { projects } = processPnrrData(raw)
    const aggregates = computeAggregates(projects)

    expect(projects).toHaveLength(2)
    expect(aggregates.projectCount).toBe(2)
    expect(aggregates.projectRecordCount).toBe(2)
    expect(aggregates.rawProjectCount).toBe(2)
    expect(aggregates.rawTotalValue).toBe(300)
  })

  it('maps official raw fields and unit conversions', () => {
    const { projects } = processPnrrData([makeOfficialRaw()])
    const [project] = projects

    expect(project.engagementId).toBe('3114346815')
    expect(project.title).toBe('Autostrada A7')
    expect(project.beneficiary).toBe(
      'COMPANIA NAȚIONALĂ DE ADMINISTRARE A INFRASTRUCTURII RUTIERE S.A.',
    )
    expect(project.cui).toBe('16054368')
    expect(project.componentCode).toBe('C4')
    expect(project.measureCode).toBe('I3')
    expect(project.listedFundingRon).toBe(1000)
    expect(project.techProgress).toBeCloseTo(89.69)
    expect(project.finProgress).toBeCloseTo(61.69)
  })

  it('canonicalizes national location variants before grouping and aggregates', () => {
    const { projects } = processPnrrData([
      makeOfficialRaw({
        id_angajament: 1,
        denumire_beneficiar: 'ACME SRL',
        cui: '90000001',
        judet_implementare: 'NAȚIONAL',
        localitate_implementare: 'NAȚIONAL',
      }),
      makeOfficialRaw({
        id_angajament: 2,
        denumire_beneficiar: 'ACME SRL',
        cui: '90000001',
        judet_implementare: 'Național',
        localitate_implementare: 'Național',
      }),
    ])
    const aggregates = computeAggregates(projects)

    expect(projects.map((project) => project.county)).toEqual([
      'Național',
      'Național',
    ])
    expect(projects.map((project) => project.locality)).toEqual([
      'Național',
      'Național',
    ])
    expect(Object.keys(aggregates.countyStats)).toEqual(['Național'])
    expect(aggregates.countyStats['Național']?.count).toBe(2)
  })

  it('groups official rows by id_angajament and keeps record-level values', () => {
    const { projects, projectRecords, meta } = processPnrrData([
      makeOfficialRaw({
        id_angajament: 123,
        cod_componenta: 'C4',
        cod_masura: 'I3',
        valoare_fe: 1_000,
        sursa_finantare: 'grant',
      }),
      makeOfficialRaw({
        id_angajament: 123,
        cod_componenta: 'C5',
        cod_masura: 'I1',
        valoare_fe: 2_000,
        sursa_finantare: 'loan',
      }),
    ])

    expect(projectRecords).toHaveLength(2)
    expect(projects).toHaveLength(1)
    expect(meta.projectCount).toBe(1)
    expect(meta.projectRecordCount).toBe(2)
    expect(projects[0].records).toHaveLength(2)
    expect(projects[0].componentCode).toBe('C5')
    expect(projects[0].listedFundingTotalRon).toBe(3000)
    expect(projects[0].variantCounts?.components).toBe(1)
    expect(projects[0].variantCounts?.fundingSources).toBe(1)
  })

  it('detects duplicate-conflict data-quality signals', () => {
    const raw = [
      makeRaw({ 'Titlu Proiect': 'Same Project', 'Progres Tehnic': '50%' }),
      makeRaw({ 'Titlu Proiect': 'Same Project', 'Progres Tehnic': '60%' }),
    ]
    const { projects, projectRecords } = processPnrrData(raw)

    expect(projects).toHaveLength(1)
    expect(projects[0].records).toHaveLength(2)
    expect(projectRecords[0].dataQualitySignals).toContain('duplicate-conflict')
    expect(projectRecords[1].dataQualitySignals).toContain('duplicate-conflict')
    expect(projects[0].dataQualitySignals).toContain('duplicate-conflict')
    expect(projects[0].anomalies).not.toContain('financial-overrun')
  })

  it('does not flag exact duplicate rows as duplicate conflicts', () => {
    const raw = [
      makeRaw({ 'Titlu Proiect': 'Same Project' }),
      makeRaw({ 'Titlu Proiect': 'Same Project' }),
    ]
    const { projects, projectRecords } = processPnrrData(raw)
    expect(projects).toHaveLength(1)
    expect(projectRecords[0].dataQualitySignals).not.toContain('duplicate-conflict')
    expect(projectRecords[1].dataQualitySignals).not.toContain('duplicate-conflict')
    expect(projects[0].dataQualitySignals).not.toContain('duplicate-conflict')
  })

  it('includes data-quality signals in aggregate counts', () => {
    const raw = [
      makeRaw({
        'Valoare (EUR)': 10_000_000,
        'Progres Financiar': undefined,
        'Titlu Proiect': 'P1',
      }),
    ]
    const { projects } = processPnrrData(raw)
    const aggregates = computeAggregates(projects)
    expect(aggregates.dataQualitySignalCounts['large-missing-financial-progress'].count).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Official dedicated payment files
// ---------------------------------------------------------------------------

describe('official dedicated payment files', () => {
  it('normalizes official persons payment rows', () => {
    const payments = processPnrrBeneficiaryPayments([
      {
        'unique identifier': 16054368,
        'full legal name':
          'COMPANIA NAŢIONALĂ DE ADMINISTRARE A INFRASTRUCTURII RUTIERE S.A.',
        'tax identification number': 16054368,
        'received amount in lei': 6_199_754_237.01,
        'last date funding received': '2026.04.27',
      },
    ])

    expect(payments).toEqual([
      {
        id: 'payment:16054368',
        beneficiary:
          'COMPANIA NAŢIONALĂ DE ADMINISTRARE A INFRASTRUCTURII RUTIERE S.A.',
        cui: '16054368',
        valueRon: 6_199_754_237.01,
        lastPaymentDate: '2026-04-27',
      },
    ])
  })

  it('normalizes official total indicators', () => {
    const indicators = processPnrrOfficialIndicators({
      items: [
        {
          alocat_eur: 21_410_527_592.99,
          platit_eur: 10_447_582_333.31,
          nr_beneficiari_plati: 5_822,
          nr_proiecte: 21_786,
        },
      ],
    })

    expect(indicators?.allocatedTotalEur).toBe(21_410_527_592.99)
    expect(indicators?.paidTotalEur).toBe(10_447_582_333.31)
    expect(indicators?.paidBeneficiaryCount).toBe(5_822)
    expect(indicators?.projectCount).toBe(21_786)
  })
})

// ---------------------------------------------------------------------------
// Search query parser
// ---------------------------------------------------------------------------

describe('search query parser', () => {
  const makeProjects = () => [
    transformProject(makeRaw({ 'Titlu Proiect': 'Modernizare Scoala Gimnaziala', 'Nume Beneficiar': 'Primaria Alba Iulia' })),
    transformProject(makeRaw({ 'Titlu Proiect': 'Reabilitare Spital Municipal', 'Nume Beneficiar': 'Consiliul Local Cluj' })),
    transformProject(makeRaw({ 'Titlu Proiect': 'Constructie Solar Farm', 'Nume Beneficiar': 'Solar Energy SRL' })),
    transformProject(makeRaw({ 'Titlu Proiect': 'Modernizare Drum National', 'Nume Beneficiar': 'CN Administreaza Drumuri SA' })),
  ]

  it('matches single term', () => {
    const result = filterProjects(makeProjects(), { search: 'modernizare' })
    expect(result).toHaveLength(2)
    expect(result.map((p) => p.title)).toContain('Modernizare Scoala Gimnaziala')
    expect(result.map((p) => p.title)).toContain('Modernizare Drum National')
  })

  it('supports implicit AND for multiple terms', () => {
    const result = filterProjects(makeProjects(), { search: 'modernizare scoala' })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Modernizare Scoala Gimnaziala')
  })

  it('supports explicit AND operator', () => {
    const result = filterProjects(makeProjects(), { search: 'modernizare AND scoala' })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Modernizare Scoala Gimnaziala')
  })

  it('supports OR operator', () => {
    const result = filterProjects(makeProjects(), { search: 'spital OR solar' })
    expect(result).toHaveLength(2)
    expect(result.map((p) => p.title)).toContain('Reabilitare Spital Municipal')
    expect(result.map((p) => p.title)).toContain('Constructie Solar Farm')
  })

  it('AND has higher precedence than OR', () => {
    const result = filterProjects(makeProjects(), { search: 'modernizare AND scoala OR spital' })
    // (modernizare AND scoala) OR spital = "Modernizare Scoala" OR "Spital"
    expect(result).toHaveLength(2)
    expect(result.map((p) => p.title)).toContain('Modernizare Scoala Gimnaziala')
    expect(result.map((p) => p.title)).toContain('Reabilitare Spital Municipal')
  })

  it('supports exact phrase matching with double quotes', () => {
    const result = filterProjects(makeProjects(), { search: '"Modernizare Scoala"' })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Modernizare Scoala Gimnaziala')
  })

  it('exact phrase does not match non-contiguous words', () => {
    // "scoala spital" should NOT match "scoala ... spital" because they're not contiguous in the title
    const result = filterProjects(makeProjects(), { search: '"scoala spital"' })
    expect(result).toHaveLength(0)
  })

  it('combines exact phrases with AND', () => {
    const result = filterProjects(makeProjects(), { search: '"modernizare" AND "scoala"' })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Modernizare Scoala Gimnaziala')
  })

  it('combines exact phrases with OR', () => {
    const result = filterProjects(makeProjects(), { search: '"spital" OR "solar"' })
    expect(result).toHaveLength(2)
    expect(result.map((p) => p.title)).toContain('Reabilitare Spital Municipal')
    expect(result.map((p) => p.title)).toContain('Constructie Solar Farm')
  })

  it('lowercase and is treated as a search term, not operator', () => {
    // "and" in lowercase is just a word
    const result = filterProjects(makeProjects(), { search: 'modernizare and scoala' })
    // Implicit AND: modernizare AND and AND scoala → must contain all three words
    expect(result).toHaveLength(0)
  })

  it('lowercase or is treated as a search term, not operator', () => {
    const result = filterProjects(makeProjects(), { search: 'modernizare or scoala' })
    // Implicit AND: modernizare AND or AND scoala
    expect(result).toHaveLength(0)
  })

  it('empty query matches all', () => {
    const result = filterProjects(makeProjects(), { search: '' })
    expect(result).toHaveLength(4)
  })

  it('complex query: exact + AND + OR', () => {
    const result = filterProjects(
      makeProjects(),
      { search: '"modernizare" AND "scoala" OR "solar" AND "farm"' }
    )
    // (modernizare AND scoala) OR (solar AND farm)
    expect(result).toHaveLength(2)
    expect(result.map((p) => p.title)).toContain('Modernizare Scoala Gimnaziala')
    expect(result.map((p) => p.title)).toContain('Constructie Solar Farm')
  })

  // --- NOT operator (-prefix) ---

  it('excludes single term with minus prefix', () => {
    // -spital: exclude everything matching "spital"
    const result = filterProjects(makeProjects(), { search: '-spital' })
    expect(result).toHaveLength(3)
    expect(result.map((p) => p.title)).not.toContain('Reabilitare Spital Municipal')
  })

  it('excludes exact phrase with minus prefix', () => {
    // -"Solar Farm": exclude the exact phrase "Solar Farm"
    const result = filterProjects(makeProjects(), { search: '-"Solar Farm"' })
    expect(result).toHaveLength(3)
    expect(result.map((p) => p.title)).not.toContain('Constructie Solar Farm')
  })

  it('combines positive term with exclusion', () => {
    // modernizare -scoala: match "modernizare" but NOT "scoala"
    const result = filterProjects(makeProjects(), { search: 'modernizare -scoala' })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Modernizare Drum National')
  })

  it('combines positive term with exact phrase exclusion', () => {
    // modernizare -"Drum National": match "modernizare" but NOT "Drum National"
    const result = filterProjects(makeProjects(), { search: 'modernizare -"Drum National"' })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Modernizare Scoala Gimnaziala')
  })

  it('works with OR: term OR -exclusion', () => {
    // spital OR -solar: match "spital" OR NOT matching "solar"
    const result = filterProjects(makeProjects(), { search: 'spital OR -solar' })
    // "Modernizare Scoala": no spital, no solar → NOT solar = true → included
    // "Reabilitare Spital": has spital → included
    // "Constructie Solar": no spital, has solar → NOT solar = false → excluded
    // "Modernizare Drum": no spital, no solar → NOT solar = true → included
    expect(result).toHaveLength(3)
    expect(result.map((p) => p.title)).toContain('Reabilitare Spital Municipal')
    expect(result.map((p) => p.title)).not.toContain('Constructie Solar Farm')
  })

  it('multiple exclusions with implicit AND', () => {
    // -spital -solar: exclude both "spital" and "solar"
    const result = filterProjects(makeProjects(), { search: '-spital -solar' })
    expect(result).toHaveLength(2)
    expect(result.map((p) => p.title)).toContain('Modernizare Scoala Gimnaziala')
    expect(result.map((p) => p.title)).toContain('Modernizare Drum National')
  })

  it('exclusion with explicit AND', () => {
    // modernizare AND -scoala
    const result = filterProjects(makeProjects(), { search: 'modernizare AND -scoala' })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Modernizare Drum National')
  })

  // --- Parentheses grouping ---

  it('group with OR overrides precedence', () => {
    // (modernizare OR scoala) AND gimnaziala
    const result = filterProjects(makeProjects(), { search: '(modernizare OR scoala) gimnaziala' })
    // Only "Modernizare Scoala Gimnaziala" matches: has (modernizare OR scoala) AND gimnaziala
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Modernizare Scoala Gimnaziala')
  })

  it('group with exclusion', () => {
    // (spital OR solar) -municipal
    const result = filterProjects(makeProjects(), { search: '(spital OR solar) -municipal' })
    // "Reabilitare Spital Municipal": has spital, but has municipal → excluded
    // "Constructie Solar Farm": has solar, no municipal → included
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Constructie Solar Farm')
  })

  it('negated group: -(a OR b)', () => {
    const result = filterProjects(makeProjects(), { search: '-(spital OR solar)' })
    // Exclude anything with spital or solar
    expect(result).toHaveLength(2)
    expect(result.map((p) => p.title)).toContain('Modernizare Scoala Gimnaziala')
    expect(result.map((p) => p.title)).toContain('Modernizare Drum National')
  })

  it('trivial group: (term)', () => {
    const result = filterProjects(makeProjects(), { search: '(spital)' })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Reabilitare Spital Municipal')
  })

  it('group with explicit AND inside', () => {
    // (modernizare AND scoala) OR spital
    const result = filterProjects(makeProjects(), { search: '(modernizare AND scoala) OR spital' })
    expect(result).toHaveLength(2)
    expect(result.map((p) => p.title)).toContain('Modernizare Scoala Gimnaziala')
    expect(result.map((p) => p.title)).toContain('Reabilitare Spital Municipal')
  })

  it('unclosed parenthesis is treated as literal', () => {
    const result = filterProjects(makeProjects(), { search: '(spital OR solar' })
    // No matching ')' — inner tokens parsed flat: OR(spital, solar)
    expect(result).toHaveLength(2)
    expect(result.map((p) => p.title)).toContain('Reabilitare Spital Municipal')
    expect(result.map((p) => p.title)).toContain('Constructie Solar Farm')
  })

  it('group combined with AND outside', () => {
    // (spital OR solar) AND farm
    const result = filterProjects(makeProjects(), { search: '(spital OR solar) AND farm' })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Constructie Solar Farm')
  })

  // --- Prefix matching (default behavior) ---

  it('prefix match: term matches words starting with it', () => {
    // "gimna" should match "Gimnaziala" (word starts with "gimna")
    const result = filterProjects(makeProjects(), { search: 'gimna' })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Modernizare Scoala Gimnaziala')
  })

  it('prefix match: term does not match mid-word', () => {
    // "olar" should NOT match "Solar" because "olar" is not at the start of a word
    const result = filterProjects(makeProjects(), { search: 'olar' })
    expect(result).toHaveLength(0)
  })

  it('prefix match: short prefix matches inflected forms', () => {
    // "spit" should match "Spital" (prefix)
    const result = filterProjects(makeProjects(), { search: 'spit' })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Reabilitare Spital Municipal')
  })

  it('prefix match: exact quotes still require full word', () => {
    // "gimna" with quotes should NOT match "Gimnaziala" — exact requires \b on both sides
    const result = filterProjects(makeProjects(), { search: '"gimna"' })
    expect(result).toHaveLength(0)
  })

  it('trailing * is stripped and treated as prefix match', () => {
    // "modern*" is equivalent to "modern" — prefix match on "modernizare"
    const result = filterProjects(makeProjects(), { search: 'modern*' })
    expect(result).toHaveLength(2)
  })

  it('complex real-world query with prefix terms', () => {
    // (digital OR informatic OR ciber) AND -(mobilier OR dotar*) AND -transport
    const projects = [
      ...makeProjects(),
      transformProject(makeRaw({ 'Titlu Proiect': 'Digitalizare Sistem Informatic', 'Nume Beneficiar': 'IT Solutions SRL' })),
      transformProject(makeRaw({ 'Titlu Proiect': 'Transport Echipamente Digitale', 'Nume Beneficiar': 'Logistic SA' })),
    ]
    const result = filterProjects(projects, {
      search: '(digital OR informatic OR ciber) AND -(mobilier OR dotar*) AND -transport',
    })
    // "Digitalizare Sistem Informatic" matches: has "digital" prefix + "informatic" prefix, not excluded
    // "Transport Echipamente Digitale": has "digital" prefix but excluded by -transport
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Digitalizare Sistem Informatic')
  })
})
