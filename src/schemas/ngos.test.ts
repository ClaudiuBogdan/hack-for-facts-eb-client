import {
  ngoProfileSchema,
  parseNgoLandingSearch,
  parseNgoProfileSearch,
  parseNgoServicesSearch,
  parseNgoSnapshotSearch,
  publicUtilityStatusSchema,
  legalRegistryRecordSchema,
} from './ngos'

describe('parseNgoLandingSearch', () => {
  it('returns empty state for no params', () => {
    expect(parseNgoLandingSearch({})).toEqual({})
  })

  it('keeps valid q and lang', () => {
    expect(parseNgoLandingSearch({ q: 'asociatia', lang: 'en' })).toEqual({
      q: 'asociatia',
      lang: 'en',
    })
  })

  it('drops garbage non-string q', () => {
    expect(parseNgoLandingSearch({ q: 123, lang: { x: 1 } })).toEqual({})
  })
})

describe('parseNgoProfileSearch', () => {
  it('defaults to empty state', () => {
    expect(parseNgoProfileSearch({})).toEqual({})
  })

  it('keeps a valid tab', () => {
    expect(parseNgoProfileSearch({ tab: 'financiar' })).toEqual({
      tab: 'financiar',
    })
  })

  it('drops unknown tab values (fails safe)', () => {
    expect(parseNgoProfileSearch({ tab: 'bogus' })).toEqual({})
  })

  it('parses evidence=1 as true', () => {
    expect(parseNgoProfileSearch({ evidence: '1' })).toEqual({ evidence: true })
    expect(parseNgoProfileSearch({ evidence: 1 })).toEqual({ evidence: true })
    expect(parseNgoProfileSearch({ evidence: 'true' })).toEqual({
      evidence: true,
    })
  })

  it('parses evidence=bogus as absent', () => {
    expect(parseNgoProfileSearch({ evidence: 'nope' })).toEqual({})
  })

  it('keeps from + lang', () => {
    expect(parseNgoProfileSearch({ from: 'servicii', lang: 'ro' })).toEqual({
      from: 'servicii',
      lang: 'ro',
    })
  })
})

describe('parseNgoServicesSearch', () => {
  it('applies documented defaults for empty input', () => {
    expect(parseNgoServicesSearch({})).toEqual({
      valid: 'active',
      view: 'lista',
      unit: 'servicii',
      sort: 'nume',
      page: 1,
      pageSize: 25,
      capacity_min: 0,
    })
  })

  it('coerces numeric page/pageSize from strings', () => {
    expect(
      parseNgoServicesSearch({ page: '3', pageSize: '50' }),
    ).toMatchObject({ page: 3, pageSize: 50 })
  })

  it('does not throw on garbage page/pageSize/capacity_min', () => {
    expect(parseNgoServicesSearch({ page: 'abc', pageSize: 'xyz' })).toEqual({
      valid: 'active',
      view: 'lista',
      unit: 'servicii',
      sort: 'nume',
      page: 1,
      pageSize: 25,
      capacity_min: 0,
    })
    expect(
      parseNgoServicesSearch({ capacity_min: 'abc' }),
    ).toMatchObject({ capacity_min: 0 })
  })

  it('clamps page below 1 and pageSize above 200', () => {
    expect(parseNgoServicesSearch({ page: '-2' })).toMatchObject({ page: 1 })
    expect(parseNgoServicesSearch({ pageSize: '99999' })).toMatchObject({
      pageSize: 200,
    })
  })

  it('normalizes invalid enum-like values to defaults', () => {
    expect(
      parseNgoServicesSearch({ valid: 'bogus', view: 'x', unit: 'y', sort: 'z' }),
    ).toMatchObject({ valid: 'active', view: 'lista', unit: 'servicii', sort: 'nume' })
  })

  it('keeps valid filter values', () => {
    expect(
      parseNgoServicesSearch({
        q: 'batrani',
        county: 'CJ',
        locality: 'Cluj-Napoca',
        service_type: 'elderly,disability',
        provider_type: 'ong',
        valid: 'expired',
        capacity_min: 10,
        view: 'harta',
        unit: 'furnizori',
        selected: 'CJ',
        sort: 'capacitate',
        page: 2,
        pageSize: 50,
      }),
    ).toMatchObject({
      q: 'batrani',
      county: 'CJ',
      locality: 'Cluj-Napoca',
      service_type: 'elderly,disability',
      provider_type: 'ong',
      valid: 'expired',
      capacity_min: 10,
      view: 'harta',
      unit: 'furnizori',
      selected: 'CJ',
      sort: 'capacitate',
      page: 2,
      pageSize: 50,
    })
  })
})

describe('parseNgoSnapshotSearch', () => {
  it('returns empty state for no params', () => {
    expect(parseNgoSnapshotSearch({})).toEqual({})
  })

  it('keeps from + lang', () => {
    expect(parseNgoSnapshotSearch({ from: '12345678', lang: 'en' })).toEqual({
      from: '12345678',
      lang: 'en',
    })
  })

  it('drops garbage', () => {
    expect(parseNgoSnapshotSearch({ from: 42 })).toEqual({})
  })
})

describe('MJ / SGG dead-field preservation', () => {
  it('legalRegistryRecord omits dead MJ document_date/document_number fields', () => {
    const parsed = legalRegistryRecordSchema.parse({
      entityKind: 'ong',
      registryNumber: 'J40/123/2020',
      courtName: 'Tribunalul București',
      organizationName: 'Asociația Exemplu',
      legalForm: 'Asociație',
      registryStatus: 'înregistrat',
      county: 'București',
      locality: 'București',
      address: 'Str. Exemplu nr. 1',
      linkStatus: 'review_pending',
      sourceSnapshotId: 'mj-2024-06',
    })
    expect(parsed).not.toHaveProperty('documentDate')
    expect(parsed).not.toHaveProperty('documentNumber')
    expect(parsed.organizationName).toBe('Asociația Exemplu')
  })

  it('publicUtilityStatus keeps SGG decree fields nullable (hg_date/order_number/recognition_year)', () => {
    // Real-world: hgNumber populated, the rest near-empty → must stay null.
    const parsed = publicUtilityStatusSchema.parse({
      organizationName: 'Asociația Exemplu',
      recognizingAuthority: 'SGG',
      hgNumber: 'HG 1/2020',
      hgDate: null,
      orderNumber: null,
      recognitionYear: null,
      status: 'recunoscut',
      linkStatus: 'review_pending',
      sourceSnapshotId: 'sgg-2024-06',
    })
    expect(parsed.hgNumber).toBe('HG 1/2020')
    expect(parsed.hgDate).toBeNull()
    expect(parsed.orderNumber).toBeNull()
    expect(parsed.recognitionYear).toBeNull()
  })
})

describe('ngoProfileSchema', () => {
  it('defaults all collection fields to empty when omitted', () => {
    const parsed = ngoProfileSchema.parse({
      header: {
        cui: '12345678',
        name: 'Asociația Exemplu',
        kind: 'ngo',
        alsoKinds: [],
        county: null,
        locality: null,
        identityBasis: 'direct_cui',
      },
      snapshotsById: {},
    })
    expect(parsed.sectorMemberships).toEqual([])
    expect(parsed.financials).toEqual([])
    expect(parsed.evidence).toEqual([])
    expect(parsed.candidateMatches).toEqual([])
  })
})
