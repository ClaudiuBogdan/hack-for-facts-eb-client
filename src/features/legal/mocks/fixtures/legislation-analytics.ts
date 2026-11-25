/**
 * Legislation analytics answers for the mock lane and the schema tests: real answers of the server's
 * usecase over a LOCAL rehearsal copy of the insights layer (layer of bundle-v7 over analytics release 6;
 * 227,202 acts), trimmed (head: 40 lineages; links: 24 targets). The copy's release has text for 9,521 acts
 * only, so the text, version and date figures here are not production's. Generated, do not edit by hand.
 */
export const legislationAnalyticsFixture = {
 "head": {
  "data": {
   "layer": {
    "layerId": "4",
    "releaseId": "6",
    "builtAt": "2026-11-24T22:38:54Z",
    "publishedAt": "2026-11-24T22:39:00Z",
    "releaseBuiltAt": "2026-11-21T17:19:17Z",
    "releasePublishedAt": "2026-11-21T17:22:11Z"
   },
   "rules": {
    "felul": "felul-v6-2026-11-24",
    "links": "links-v2-2026-11-24",
    "stock": "stock-firm-2026-11-24",
    "issuers": "issuers-v2-2026-11-24"
   },
   "total": 227202,
   "population": 227202,
   "values": {
    "felulGroups": [
     "rule-making",
     "individual",
     "budget-property-organisation",
     "procedure",
     "court",
     "reports-notices",
     "unplaced"
    ],
    "felulKinds": {
     "court": "court",
     "budget": "budget-property-organisation",
     "repeal": "rule-making",
     "pardons": "individual",
     "property": "budget-property-organisation",
     "unplaced": "unplaced",
     "amendment": "rule-making",
     "new_rules": "rule-making",
     "sanctions": "individual",
     "correction": "procedure",
     "citizenship": "individual",
     "decorations": "individual",
     "appointments": "individual",
     "organisation": "budget-property-organisation",
     "promulgation": "procedure",
     "ratification": "procedure",
     "authorisation": "individual",
     "reports_notices": "reports-notices",
     "application_rules": "rule-making",
     "chamber_procedure": "procedure",
     "ordinance_approval": "procedure",
     "periodic_parameters": "rule-making",
     "plans_and_programmes": "rule-making",
     "international_agreement": "rule-making",
     "administrative_territorial_and_electoral": "budget-property-organisation"
    },
    "stockKinds": [
     "application_rules",
     "international_agreement",
     "new_rules",
     "organisation",
     "periodic_parameters"
    ],
    "weakBases": [
     "fallback",
     "instrument_default"
    ],
    "issuerFamilies": [
     "administratie_locala",
     "agentii_centrale",
     "altele",
     "autoritati_autonome",
     "fara_emitent",
     "guvern",
     "instante",
     "ministere",
     "parlament",
     "presedinte"
    ],
    "linkKinds": [
     "amends",
     "approves_ordinance",
     "rejects_ordinance",
     "promulgates",
     "court_names"
    ],
    "linkNotes": [
     "resolved",
     "code",
     "outside_corpus",
     "ambiguous",
     "no_target_in_title"
    ]
   },
   "totals": {
    "acts": 227202,
    "actsWithText": 9521,
    "inStock": 46535,
    "uncertain": 18661,
    "unplaced": 6307
   },
   "types": [
    {
     "key": "hotarare",
     "acts": 52553
    },
    {
     "key": "ordin",
     "acts": 47813
    },
    {
     "key": "decizie",
     "acts": 38380
    },
    {
     "key": "decret",
     "acts": 33470
    },
    {
     "key": "unknown",
     "acts": 33005
    },
    {
     "key": "lege",
     "acts": 10671
    },
    {
     "key": "ordonanta-urgenta",
     "acts": 3851
    },
    {
     "key": "rectificare",
     "acts": 2492
    },
    {
     "key": "ordonanta",
     "acts": 1570
    },
    {
     "key": "circulara",
     "acts": 1127
    },
    {
     "key": "norma",
     "acts": 890
    },
    {
     "key": "regulament",
     "acts": 778
    },
    {
     "key": "instructiuni",
     "acts": 277
    },
    {
     "key": "decret-lege",
     "acts": 126
    },
    {
     "key": "protocol",
     "acts": 95
    },
    {
     "key": "sentinta",
     "acts": 91
    },
    {
     "key": "metodologie",
     "acts": 8
    },
    {
     "key": "procedura",
     "acts": 3
    },
    {
     "key": "cod",
     "acts": 2
    }
   ],
   "issuerCount": 884,
   "issuers": [
    {
     "lineage": "Guvernul",
     "families": [
      "guvern"
     ],
     "acts": 49188
    },
    {
     "lineage": "Președintele României",
     "families": [
      "presedinte"
     ],
     "acts": 33338
    },
    {
     "lineage": "Curtea Constituțională",
     "families": [
      "instante"
     ],
     "acts": 23536
    },
    {
     "lineage": "Parlamentul",
     "families": [
      "parlament"
     ],
     "acts": 12436
    },
    {
     "lineage": "Prim-ministrul",
     "families": [
      "guvern"
     ],
     "acts": 8790
    },
    {
     "lineage": "Ministerul Educației (linia)",
     "families": [
      "ministere"
     ],
     "acts": 6442
    },
    {
     "lineage": "Ministerul Sănătății (linia)",
     "families": [
      "ministere"
     ],
     "acts": 5307
    },
    {
     "lineage": "Autoritatea Electorală Permanentă",
     "families": [
      "autoritati_autonome"
     ],
     "acts": 4967
    },
    {
     "lineage": "Ministerul Finanțelor (linia)",
     "families": [
      "ministere"
     ],
     "acts": 4420
    },
    {
     "lineage": "Ministerul Agriculturii (linia)",
     "families": [
      "ministere"
     ],
     "acts": 4029
    },
    {
     "lineage": "Ministerul Transporturilor (linia)",
     "families": [
      "ministere"
     ],
     "acts": 3530
    },
    {
     "lineage": "ASF",
     "families": [
      "autoritati_autonome"
     ],
     "acts": 3130
    },
    {
     "lineage": "Senatul",
     "families": [
      "parlament"
     ],
     "acts": 3028
    },
    {
     "lineage": "ANRE",
     "families": [
      "autoritati_autonome"
     ],
     "acts": 2925
    },
    {
     "lineage": "Ministerul Economiei (linia)",
     "families": [
      "ministere"
     ],
     "acts": 2697
    },
    {
     "lineage": "Banca Națională a României",
     "families": [
      "autoritati_autonome"
     ],
     "acts": 2608
    },
    {
     "lineage": "Ministerul Mediului (linia)",
     "families": [
      "ministere"
     ],
     "acts": 2378
    },
    {
     "lineage": "Camera Deputaților",
     "families": [
      "parlament"
     ],
     "acts": 2331
    },
    {
     "lineage": "Înalta Curte de Casație și Justiție",
     "families": [
      "instante"
     ],
     "acts": 1911
    },
    {
     "lineage": "Ministerul Afacerilor Interne (linia)",
     "families": [
      "ministere"
     ],
     "acts": 1514
    },
    {
     "lineage": "Ministerul Dezvoltării (linia)",
     "families": [
      "ministere"
     ],
     "acts": 1361
    },
    {
     "lineage": "Ministerul Muncii (linia)",
     "families": [
      "ministere"
     ],
     "acts": 1331
    },
    {
     "lineage": "ANAF",
     "families": [
      "agentii_centrale"
     ],
     "acts": 1166
    },
    {
     "lineage": "Ministerul Culturii (linia)",
     "families": [
      "ministere"
     ],
     "acts": 1128
    },
    {
     "lineage": "ANRM / ANRMPSG (linia)",
     "families": [
      "agentii_centrale",
      "autoritati_autonome"
     ],
     "acts": 1031
    },
    {
     "lineage": "Ministerul Justiției (linia)",
     "families": [
      "ministere"
     ],
     "acts": 1030
    },
    {
     "lineage": "ANCPI",
     "families": [
      "agentii_centrale"
     ],
     "acts": 1009
    },
    {
     "lineage": "ANSVSA",
     "families": [
      "agentii_centrale"
     ],
     "acts": 936
    },
    {
     "lineage": "CNAS",
     "families": [
      "agentii_centrale"
     ],
     "acts": 695
    },
    {
     "lineage": "Monitorul Oficial",
     "families": [
      "altele"
     ],
     "acts": 660
    },
    {
     "lineage": "Ministerul afacerilor externe",
     "families": [
      "ministere"
     ],
     "acts": 493
    },
    {
     "lineage": "Ministerul Fondurilor Europene (linia)",
     "families": [
      "ministere"
     ],
     "acts": 468
    },
    {
     "lineage": "Departamentul pentru situatii de urgenta",
     "families": [
      "agentii_centrale"
     ],
     "acts": 416
    },
    {
     "lineage": "Camera auditorilor financiari din romania",
     "families": [
      "altele"
     ],
     "acts": 387
    },
    {
     "lineage": "Președintele CFSN/CPUN",
     "families": [
      "presedinte"
     ],
     "acts": 362
    },
    {
     "lineage": "Oficiul roman pentru drepturile de autor",
     "families": [
      "agentii_centrale"
     ],
     "acts": 361
    },
    {
     "lineage": "AAAS (linia)",
     "families": [
      "agentii_centrale"
     ],
     "acts": 350
    },
    {
     "lineage": "Consiliul Concurenței",
     "families": [
      "autoritati_autonome"
     ],
     "acts": 340
    },
    {
     "lineage": "Consiliul Național al Audiovizualului",
     "families": [
      "autoritati_autonome"
     ],
     "acts": 334
    },
    {
     "lineage": "Consiliul superior al magistraturii plenul",
     "families": [
      "instante"
     ],
     "acts": 295
    }
   ],
   "years": {
    "min": 1926,
    "max": 2026
   }
  },
  "layer": {
   "layerId": "4",
   "releaseId": "6",
   "builtAt": "2026-11-24T22:38:54Z",
   "publishedAt": "2026-11-24T22:39:00Z",
   "releaseBuiltAt": "2026-11-21T17:19:17Z",
   "releasePublishedAt": "2026-11-21T17:22:11Z"
  },
  "args": {}
 },
 "summary": {
  "data": {
   "total": 227202,
   "population": 227202,
   "uncertain": 18661,
   "unplaced": 6307,
   "withText": 9521,
   "withVersions": 16674,
   "felul": [
    {
     "key": "rule-making",
     "acts": 72995
    },
    {
     "key": "individual",
     "acts": 39925
    },
    {
     "key": "budget-property-organisation",
     "acts": 26122
    },
    {
     "key": "court",
     "acts": 25999
    },
    {
     "key": "procedure",
     "acts": 25117
    },
    {
     "key": "uncertain",
     "acts": 18661
    },
    {
     "key": "reports-notices",
     "acts": 12076
    },
    {
     "key": "unplaced",
     "acts": 6307
    }
   ]
  },
  "layer": {
   "layerId": "4",
   "releaseId": "6",
   "builtAt": "2026-11-24T22:38:54Z",
   "publishedAt": "2026-11-24T22:39:00Z",
   "releaseBuiltAt": "2026-11-21T17:19:17Z",
   "releasePublishedAt": "2026-11-21T17:22:11Z"
  },
  "args": {}
 },
 "summary-stock": {
  "data": {
   "total": 46535,
   "population": 46535,
   "uncertain": 0,
   "unplaced": 0,
   "withText": 1612,
   "withVersions": 10881,
   "felul": [
    {
     "key": "rule-making",
     "acts": 41102
    },
    {
     "key": "budget-property-organisation",
     "acts": 5433
    }
   ]
  },
  "layer": {
   "layerId": "4",
   "releaseId": "6",
   "builtAt": "2026-11-24T22:38:54Z",
   "publishedAt": "2026-11-24T22:39:00Z",
   "releaseBuiltAt": "2026-11-21T17:19:17Z",
   "releasePublishedAt": "2026-11-21T17:22:11Z"
  },
  "args": {
   "population": "stock"
  }
 },
 "breakdown": {
  "data": {
   "total": 227202,
   "population": 227202,
   "uncertain": 18661,
   "unplaced": 6307,
   "lens": "felul",
   "rows": [
    {
     "key": "rule-making",
     "acts": 72995
    },
    {
     "key": "individual",
     "acts": 39925
    },
    {
     "key": "budget-property-organisation",
     "acts": 26122
    },
    {
     "key": "court",
     "acts": 25999
    },
    {
     "key": "procedure",
     "acts": 25117
    },
    {
     "key": "uncertain",
     "acts": 18661
    },
    {
     "key": "reports-notices",
     "acts": 12076
    },
    {
     "key": "unplaced",
     "acts": 6307
    }
   ],
   "rest": 0,
   "truncated": false
  },
  "layer": {
   "layerId": "4",
   "releaseId": "6",
   "builtAt": "2026-11-24T22:38:54Z",
   "publishedAt": "2026-11-24T22:39:00Z",
   "releaseBuiltAt": "2026-11-21T17:19:17Z",
   "releasePublishedAt": "2026-11-21T17:22:11Z"
  },
  "args": {}
 },
 "breakdown-kind": {
  "data": {
   "total": 227202,
   "population": 227202,
   "uncertain": 18661,
   "unplaced": 6307,
   "lens": "kind",
   "rows": [
    {
     "key": "amendment",
     "acts": 28603
    },
    {
     "key": "appointments",
     "acts": 28579
    },
    {
     "key": "application_rules",
     "acts": 26790
    },
    {
     "key": "court",
     "acts": 25999
    },
    {
     "key": "uncertain",
     "acts": 18661
    },
    {
     "key": "reports_notices",
     "acts": 12076
    },
    {
     "key": "budget",
     "acts": 11193
    },
    {
     "key": "promulgation",
     "acts": 10278
    },
    {
     "key": "property",
     "acts": 7992
    },
    {
     "key": "new_rules",
     "acts": 7986
    },
    {
     "key": "unplaced",
     "acts": 6307
    },
    {
     "key": "authorisation",
     "acts": 5457
    },
    {
     "key": "organisation",
     "acts": 5433
    },
    {
     "key": "ordinance_approval",
     "acts": 5072
    },
    {
     "key": "decorations",
     "acts": 4554
    },
    {
     "key": "international_agreement",
     "acts": 4497
    },
    {
     "key": "ratification",
     "acts": 4315
    },
    {
     "key": "chamber_procedure",
     "acts": 2835
    },
    {
     "key": "correction",
     "acts": 2617
    },
    {
     "key": "plans_and_programmes",
     "acts": 2350
    },
    {
     "key": "periodic_parameters",
     "acts": 1829
    },
    {
     "key": "administrative_territorial_and_electoral",
     "acts": 1504
    },
    {
     "key": "repeal",
     "acts": 940
    },
    {
     "key": "citizenship",
     "acts": 615
    },
    {
     "key": "sanctions",
     "acts": 565
    },
    {
     "key": "pardons",
     "acts": 155
    }
   ],
   "rest": 0,
   "truncated": false
  },
  "layer": {
   "layerId": "4",
   "releaseId": "6",
   "builtAt": "2026-11-24T22:38:54Z",
   "publishedAt": "2026-11-24T22:39:00Z",
   "releaseBuiltAt": "2026-11-21T17:19:17Z",
   "releasePublishedAt": "2026-11-21T17:22:11Z"
  },
  "args": {
   "lens": "kind"
  }
 },
 "breakdown-issuer": {
  "data": {
   "total": 227202,
   "population": 227202,
   "uncertain": 18661,
   "unplaced": 6307,
   "lens": "issuer",
   "rows": [
    {
     "key": "Guvernul",
     "acts": 49188
    },
    {
     "key": "Președintele României",
     "acts": 33338
    },
    {
     "key": null,
     "acts": 27310
    },
    {
     "key": "Curtea Constituțională",
     "acts": 23536
    },
    {
     "key": "Parlamentul",
     "acts": 12436
    },
    {
     "key": "Prim-ministrul",
     "acts": 8790
    },
    {
     "key": "Ministerul Educației (linia)",
     "acts": 6442
    },
    {
     "key": "Ministerul Sănătății (linia)",
     "acts": 5307
    },
    {
     "key": "Autoritatea Electorală Permanentă",
     "acts": 4967
    },
    {
     "key": "Ministerul Finanțelor (linia)",
     "acts": 4420
    },
    {
     "key": "Ministerul Agriculturii (linia)",
     "acts": 4029
    },
    {
     "key": "Ministerul Transporturilor (linia)",
     "acts": 3530
    },
    {
     "key": "ASF",
     "acts": 3130
    },
    {
     "key": "Senatul",
     "acts": 3028
    },
    {
     "key": "ANRE",
     "acts": 2925
    },
    {
     "key": "Ministerul Economiei (linia)",
     "acts": 2697
    },
    {
     "key": "Banca Națională a României",
     "acts": 2608
    },
    {
     "key": "Ministerul Mediului (linia)",
     "acts": 2378
    },
    {
     "key": "Camera Deputaților",
     "acts": 2331
    },
    {
     "key": "Înalta Curte de Casație și Justiție",
     "acts": 1911
    },
    {
     "key": "Ministerul Afacerilor Interne (linia)",
     "acts": 1514
    },
    {
     "key": "Ministerul Dezvoltării (linia)",
     "acts": 1361
    },
    {
     "key": "Ministerul Muncii (linia)",
     "acts": 1331
    },
    {
     "key": "ANAF",
     "acts": 1166
    },
    {
     "key": "Ministerul Culturii (linia)",
     "acts": 1128
    },
    {
     "key": "ANRM / ANRMPSG (linia)",
     "acts": 1031
    },
    {
     "key": "Ministerul Justiției (linia)",
     "acts": 1030
    },
    {
     "key": "ANCPI",
     "acts": 1009
    },
    {
     "key": "ANSVSA",
     "acts": 936
    },
    {
     "key": "CNAS",
     "acts": 695
    },
    {
     "key": "Monitorul Oficial",
     "acts": 660
    },
    {
     "key": "Ministerul afacerilor externe",
     "acts": 493
    },
    {
     "key": "Ministerul Fondurilor Europene (linia)",
     "acts": 468
    },
    {
     "key": "Departamentul pentru situatii de urgenta",
     "acts": 416
    },
    {
     "key": "Camera auditorilor financiari din romania",
     "acts": 387
    },
    {
     "key": "Președintele CFSN/CPUN",
     "acts": 362
    },
    {
     "key": "Oficiul roman pentru drepturile de autor",
     "acts": 361
    },
    {
     "key": "AAAS (linia)",
     "acts": 350
    },
    {
     "key": "Consiliul Concurenței",
     "acts": 340
    },
    {
     "key": "Consiliul Național al Audiovizualului",
     "acts": 334
    },
    {
     "key": "Consiliul superior al magistraturii plenul",
     "acts": 295
    },
    {
     "key": "Act international",
     "acts": 248
    },
    {
     "key": "Camera consultantilor fiscali",
     "acts": 207
    },
    {
     "key": "Biroul Electoral Central",
     "acts": 170
    },
    {
     "key": "Autoritatea nationala pentru protectia consumatorilor",
     "acts": 162
    },
    {
     "key": "Autoritatea nationala de management al calitatii in sanatate",
     "acts": 161
    },
    {
     "key": "ANCOM",
     "acts": 151
    },
    {
     "key": "Colegiul medicilor din romania",
     "acts": 129
    },
    {
     "key": "Comitetul interministerial de finantari garantii si asigurari",
     "acts": 126
    },
    {
     "key": "CNCAN",
     "acts": 125
    }
   ],
   "rest": 5755,
   "truncated": true
  },
  "layer": {
   "layerId": "4",
   "releaseId": "6",
   "builtAt": "2026-11-24T22:38:54Z",
   "publishedAt": "2026-11-24T22:39:00Z",
   "releaseBuiltAt": "2026-11-21T17:19:17Z",
   "releasePublishedAt": "2026-11-21T17:22:11Z"
  },
  "args": {
   "lens": "issuer",
   "limit": 50
  }
 },
 "series": {
  "data": {
   "total": 227202,
   "population": 227202,
   "uncertain": 18661,
   "unplaced": 6307,
   "lens": "felul",
   "keys": [
    "rule-making",
    "individual",
    "budget-property-organisation",
    "court",
    "procedure"
   ],
   "years": [
    {
     "year": 1926,
     "acts": [
      1,
      0,
      0,
      0,
      0,
      0
     ]
    },
    {
     "year": 1946,
     "acts": [
      1,
      0,
      0,
      0,
      0,
      0
     ]
    },
    {
     "year": 1949,
     "acts": [
      1,
      0,
      0,
      0,
      0,
      1
     ]
    },
    {
     "year": 1950,
     "acts": [
      0,
      0,
      0,
      0,
      0,
      1
     ]
    },
    {
     "year": 1952,
     "acts": [
      2,
      0,
      0,
      0,
      0,
      1
     ]
    },
    {
     "year": 1953,
     "acts": [
      0,
      0,
      0,
      0,
      0,
      1
     ]
    },
    {
     "year": 1954,
     "acts": [
      0,
      0,
      0,
      0,
      0,
      6
     ]
    },
    {
     "year": 1955,
     "acts": [
      0,
      0,
      0,
      0,
      0,
      1
     ]
    },
    {
     "year": 1956,
     "acts": [
      1,
      0,
      0,
      0,
      0,
      6
     ]
    },
    {
     "year": 1957,
     "acts": [
      1,
      0,
      0,
      0,
      0,
      4
     ]
    },
    {
     "year": 1958,
     "acts": [
      0,
      0,
      0,
      0,
      0,
      2
     ]
    },
    {
     "year": 1959,
     "acts": [
      1,
      0,
      0,
      0,
      0,
      0
     ]
    },
    {
     "year": 1960,
     "acts": [
      0,
      0,
      0,
      0,
      0,
      3
     ]
    },
    {
     "year": 1961,
     "acts": [
      1,
      0,
      0,
      0,
      0,
      1
     ]
    },
    {
     "year": 1962,
     "acts": [
      0,
      0,
      0,
      0,
      0,
      1
     ]
    },
    {
     "year": 1963,
     "acts": [
      2,
      0,
      0,
      0,
      0,
      0
     ]
    },
    {
     "year": 1966,
     "acts": [
      1,
      0,
      0,
      0,
      0,
      1
     ]
    },
    {
     "year": 1967,
     "acts": [
      0,
      0,
      0,
      0,
      0,
      2
     ]
    },
    {
     "year": 1968,
     "acts": [
      0,
      0,
      0,
      0,
      0,
      3
     ]
    },
    {
     "year": 1969,
     "acts": [
      0,
      0,
      0,
      0,
      0,
      2
     ]
    },
    {
     "year": 1970,
     "acts": [
      1,
      0,
      0,
      0,
      0,
      0
     ]
    },
    {
     "year": 1971,
     "acts": [
      1,
      0,
      0,
      0,
      0,
      4
     ]
    },
    {
     "year": 1972,
     "acts": [
      0,
      0,
      0,
      0,
      0,
      2
     ]
    },
    {
     "year": 1973,
     "acts": [
      0,
      0,
      0,
      0,
      0,
      2
     ]
    },
    {
     "year": 1974,
     "acts": [
      1,
      0,
      0,
      0,
      0,
      7
     ]
    },
    {
     "year": 1975,
     "acts": [
      0,
      0,
      0,
      0,
      0,
      7
     ]
    },
    {
     "year": 1976,
     "acts": [
      4,
      0,
      0,
      0,
      0,
      6
     ]
    },
    {
     "year": 1977,
     "acts": [
      2,
      0,
      0,
      0,
      0,
      13
     ]
    },
    {
     "year": 1978,
     "acts": [
      1,
      0,
      0,
      0,
      0,
      7
     ]
    },
    {
     "year": 1979,
     "acts": [
      0,
      0,
      0,
      0,
      0,
      13
     ]
    },
    {
     "year": 1980,
     "acts": [
      2,
      0,
      0,
      0,
      0,
      17
     ]
    },
    {
     "year": 1981,
     "acts": [
      2,
      0,
      0,
      0,
      0,
      15
     ]
    },
    {
     "year": 1982,
     "acts": [
      0,
      0,
      0,
      0,
      0,
      8
     ]
    },
    {
     "year": 1983,
     "acts": [
      2,
      0,
      0,
      0,
      0,
      8
     ]
    },
    {
     "year": 1984,
     "acts": [
      1,
      0,
      0,
      0,
      0,
      6
     ]
    },
    {
     "year": 1985,
     "acts": [
      0,
      0,
      0,
      0,
      0,
      11
     ]
    },
    {
     "year": 1986,
     "acts": [
      1,
      0,
      1,
      0,
      0,
      8
     ]
    },
    {
     "year": 1987,
     "acts": [
      1,
      0,
      2,
      0,
      0,
      1
     ]
    },
    {
     "year": 1988,
     "acts": [
      1,
      0,
      0,
      0,
      0,
      4
     ]
    },
    {
     "year": 1989,
     "acts": [
      27,
      29,
      21,
      0,
      3,
      10
     ]
    },
    {
     "year": 1990,
     "acts": [
      304,
      215,
      319,
      0,
      46,
      316
     ]
    },
    {
     "year": 1991,
     "acts": [
      298,
      77,
      290,
      0,
      128,
      253
     ]
    },
    {
     "year": 1992,
     "acts": [
      418,
      177,
      220,
      49,
      358,
      314
     ]
    },
    {
     "year": 1993,
     "acts": [
      316,
      267,
      215,
      53,
      298,
      260
     ]
    },
    {
     "year": 1994,
     "acts": [
      408,
      226,
      344,
      133,
      387,
      286
     ]
    },
    {
     "year": 1995,
     "acts": [
      477,
      345,
      514,
      135,
      389,
      268
     ]
    },
    {
     "year": 1996,
     "acts": [
      598,
      640,
      682,
      213,
      422,
      295
     ]
    },
    {
     "year": 1997,
     "acts": [
      658,
      323,
      460,
      679,
      583,
      300
     ]
    },
    {
     "year": 1998,
     "acts": [
      751,
      254,
      486,
      178,
      624,
      281
     ]
    },
    {
     "year": 1999,
     "acts": [
      1031,
      319,
      436,
      235,
      597,
      411
     ]
    },
    {
     "year": 2000,
     "acts": [
      1137,
      570,
      542,
      323,
      650,
      449
     ]
    },
    {
     "year": 2001,
     "acts": [
      1182,
      467,
      594,
      341,
      1610,
      415
     ]
    },
    {
     "year": 2002,
     "acts": [
      1759,
      432,
      720,
      337,
      1354,
      531
     ]
    },
    {
     "year": 2003,
     "acts": [
      1904,
      440,
      838,
      449,
      1141,
      567
     ]
    },
    {
     "year": 2004,
     "acts": [
      2307,
      1078,
      1207,
      556,
      1177,
      806
     ]
    },
    {
     "year": 2005,
     "acts": [
      2077,
      1196,
      962,
      643,
      901,
      562
     ]
    },
    {
     "year": 2006,
     "acts": [
      2353,
      1167,
      977,
      855,
      983,
      722
     ]
    },
    {
     "year": 2007,
     "acts": [
      2111,
      1082,
      892,
      1172,
      870,
      656
     ]
    },
    {
     "year": 2008,
     "acts": [
      2090,
      1371,
      800,
      1300,
      791,
      611
     ]
    },
    {
     "year": 2009,
     "acts": [
      1856,
      2329,
      677,
      1583,
      883,
      509
     ]
    },
    {
     "year": 2010,
     "acts": [
      1908,
      1316,
      726,
      1585,
      622,
      598
     ]
    },
    {
     "year": 2011,
     "acts": [
      1869,
      808,
      729,
      1539,
      645,
      623
     ]
    },
    {
     "year": 2012,
     "acts": [
      1698,
      1501,
      691,
      1060,
      566,
      592
     ]
    },
    {
     "year": 2013,
     "acts": [
      1857,
      1329,
      785,
      559,
      859,
      634
     ]
    },
    {
     "year": 2014,
     "acts": [
      1800,
      1156,
      743,
      845,
      502,
      658
     ]
    },
    {
     "year": 2015,
     "acts": [
      1984,
      1225,
      713,
      982,
      783,
      753
     ]
    },
    {
     "year": 2016,
     "acts": [
      2210,
      1575,
      617,
      868,
      585,
      960
     ]
    },
    {
     "year": 2017,
     "acts": [
      1768,
      1864,
      523,
      969,
      616,
      1139
     ]
    },
    {
     "year": 2018,
     "acts": [
      1867,
      1270,
      671,
      958,
      662,
      1269
     ]
    },
    {
     "year": 2019,
     "acts": [
      1656,
      1633,
      575,
      1010,
      511,
      1133
     ]
    },
    {
     "year": 2020,
     "acts": [
      2329,
      1391,
      657,
      1001,
      544,
      1999
     ]
    },
    {
     "year": 2021,
     "acts": [
      2028,
      1715,
      730,
      977,
      686,
      1928
     ]
    },
    {
     "year": 2022,
     "acts": [
      2230,
      2197,
      886,
      774,
      746,
      1487
     ]
    },
    {
     "year": 2023,
     "acts": [
      2070,
      2186,
      940,
      834,
      800,
      1441
     ]
    },
    {
     "year": 2024,
     "acts": [
      2063,
      2146,
      1206,
      869,
      708,
      2215
     ]
    },
    {
     "year": 2025,
     "acts": [
      1689,
      1937,
      714,
      1183,
      558,
      1401
     ]
    },
    {
     "year": 2026,
     "acts": [
      1220,
      1426,
      515,
      300,
      376,
      940
     ]
    }
   ],
   "restKey": true,
   "unknownYear": 27285
  },
  "layer": {
   "layerId": "4",
   "releaseId": "6",
   "builtAt": "2026-11-24T22:38:54Z",
   "publishedAt": "2026-11-24T22:39:00Z",
   "releaseBuiltAt": "2026-11-21T17:19:17Z",
   "releasePublishedAt": "2026-11-21T17:22:11Z"
  },
  "args": {}
 },
 "grid": {
  "data": {
   "total": 227202,
   "population": 227202,
   "uncertain": 18661,
   "unplaced": 6307,
   "lens": "felul",
   "by": "type",
   "rows": [
    {
     "key": "rule-making",
     "acts": 72995
    },
    {
     "key": "individual",
     "acts": 39925
    },
    {
     "key": "budget-property-organisation",
     "acts": 26122
    },
    {
     "key": "court",
     "acts": 25999
    },
    {
     "key": "procedure",
     "acts": 25117
    },
    {
     "key": "uncertain",
     "acts": 18661
    },
    {
     "key": "reports-notices",
     "acts": 12076
    },
    {
     "key": "unplaced",
     "acts": 6307
    }
   ],
   "cols": [
    {
     "key": "hotarare",
     "acts": 52553
    },
    {
     "key": "ordin",
     "acts": 47813
    },
    {
     "key": "decizie",
     "acts": 38380
    },
    {
     "key": "decret",
     "acts": 33470
    },
    {
     "key": "unknown",
     "acts": 33005
    },
    {
     "key": "lege",
     "acts": 10671
    }
   ],
   "cells": [
    [
     15186,
     27290,
     1854,
     40,
     17105,
     3842,
     7678
    ],
    [
     5791,
     3947,
     8967,
     20948,
     249,
     10,
     13
    ],
    [
     18903,
     4141,
     387,
     479,
     1507,
     413,
     292
    ],
    [
     525,
     0,
     24926,
     0,
     457,
     0,
     91
    ],
    [
     4191,
     62,
     531,
     11008,
     154,
     6399,
     2772
    ],
    [
     6162,
     8199,
     1537,
     767,
     1916,
     3,
     77
    ],
    [
     1596,
     930,
     136,
     2,
     9089,
     0,
     323
    ],
    [
     199,
     3244,
     42,
     226,
     2528,
     4,
     64
    ]
   ]
  },
  "layer": {
   "layerId": "4",
   "releaseId": "6",
   "builtAt": "2026-11-24T22:38:54Z",
   "publishedAt": "2026-11-24T22:39:00Z",
   "releaseBuiltAt": "2026-11-21T17:19:17Z",
   "releasePublishedAt": "2026-11-21T17:22:11Z"
  },
  "args": {}
 },
 "links": {
  "data": {
   "total": 227202,
   "population": 227202,
   "uncertain": 18661,
   "unplaced": 6307,
   "byKind": [
    {
     "kind": "amends",
     "note": "ambiguous",
     "links": 1426
    },
    {
     "kind": "amends",
     "note": "code",
     "links": 41
    },
    {
     "kind": "amends",
     "note": "no_target_in_title",
     "links": 6431
    },
    {
     "kind": "amends",
     "note": "outside_corpus",
     "links": 1604
    },
    {
     "kind": "amends",
     "note": "resolved",
     "links": 19503
    },
    {
     "kind": "approves_ordinance",
     "note": "no_target_in_title",
     "links": 85
    },
    {
     "kind": "approves_ordinance",
     "note": "outside_corpus",
     "links": 397
    },
    {
     "kind": "approves_ordinance",
     "note": "resolved",
     "links": 4137
    },
    {
     "kind": "court_names",
     "note": "ambiguous",
     "links": 71
    },
    {
     "kind": "court_names",
     "note": "code",
     "links": 7529
    },
    {
     "kind": "court_names",
     "note": "no_target_in_title",
     "links": 2352
    },
    {
     "kind": "court_names",
     "note": "outside_corpus",
     "links": 1473
    },
    {
     "kind": "court_names",
     "note": "resolved",
     "links": 14574
    },
    {
     "kind": "promulgates",
     "note": "ambiguous",
     "links": 75
    },
    {
     "kind": "promulgates",
     "note": "no_target_in_title",
     "links": 7
    },
    {
     "kind": "promulgates",
     "note": "outside_corpus",
     "links": 587
    },
    {
     "kind": "promulgates",
     "note": "resolved",
     "links": 9609
    },
    {
     "kind": "rejects_ordinance",
     "note": "outside_corpus",
     "links": 46
    },
    {
     "kind": "rejects_ordinance",
     "note": "resolved",
     "links": 407
    }
   ],
   "amends": [
    {
     "sourceBand": "ordine",
     "target": "ordine",
     "links": 7356
    },
    {
     "sourceBand": "hotarari",
     "target": "hotarari",
     "links": 6202
    },
    {
     "sourceBand": "legi_ordonante",
     "target": "legi_ordonante",
     "links": 4234
    },
    {
     "sourceBand": "ordine",
     "target": "no_target_in_title",
     "links": 3736
    },
    {
     "sourceBand": "hotarari",
     "target": "no_target_in_title",
     "links": 1511
    },
    {
     "sourceBand": "hotarari",
     "target": "outside_corpus",
     "links": 728
    },
    {
     "sourceBand": "hotarari",
     "target": "ambiguous",
     "links": 652
    },
    {
     "sourceBand": "altele",
     "target": "no_target_in_title",
     "links": 591
    },
    {
     "sourceBand": "ordine",
     "target": "outside_corpus",
     "links": 546
    },
    {
     "sourceBand": "altele",
     "target": "altele",
     "links": 443
    },
    {
     "sourceBand": "decizii",
     "target": "decizii",
     "links": 397
    },
    {
     "sourceBand": "legi_ordonante",
     "target": "no_target_in_title",
     "links": 347
    },
    {
     "sourceBand": "decizii",
     "target": "ambiguous",
     "links": 278
    },
    {
     "sourceBand": "altele",
     "target": "ambiguous",
     "links": 259
    },
    {
     "sourceBand": "legi_ordonante",
     "target": "outside_corpus",
     "links": 249
    },
    {
     "sourceBand": "ordine",
     "target": "ambiguous",
     "links": 237
    },
    {
     "sourceBand": "decizii",
     "target": "no_target_in_title",
     "links": 236
    },
    {
     "sourceBand": "ordine",
     "target": "hotarari",
     "links": 206
    },
    {
     "sourceBand": "altele",
     "target": "ordine",
     "links": 200
    },
    {
     "sourceBand": "ordine",
     "target": "legi_ordonante",
     "links": 167
    },
    {
     "sourceBand": "hotarari",
     "target": "legi_ordonante",
     "links": 95
    },
    {
     "sourceBand": "altele",
     "target": "outside_corpus",
     "links": 70
    },
    {
     "sourceBand": "altele",
     "target": "legi_ordonante",
     "links": 41
    },
    {
     "sourceBand": "legi_ordonante",
     "target": "code",
     "links": 41
    },
    {
     "sourceBand": "altele",
     "target": "hotarari",
     "links": 31
    },
    {
     "sourceBand": "ordine",
     "target": "altele",
     "links": 29
    },
    {
     "sourceBand": "legi_ordonante",
     "target": "decrete",
     "links": 27
    },
    {
     "sourceBand": "hotarari",
     "target": "altele",
     "links": 25
    },
    {
     "sourceBand": "ordine",
     "target": "decizii",
     "links": 23
    },
    {
     "sourceBand": "decizii",
     "target": "hotarari",
     "links": 13
    },
    {
     "sourceBand": "decrete",
     "target": "no_target_in_title",
     "links": 10
    },
    {
     "sourceBand": "decizii",
     "target": "outside_corpus",
     "links": 8
    },
    {
     "sourceBand": "decrete",
     "target": "decrete",
     "links": 8
    },
    {
     "sourceBand": "decrete",
     "target": "outside_corpus",
     "links": 3
    },
    {
     "sourceBand": "altele",
     "target": "decizii",
     "links": 2
    },
    {
     "sourceBand": "decizii",
     "target": "ordine",
     "links": 2
    },
    {
     "sourceBand": "decizii",
     "target": "altele",
     "links": 1
    },
    {
     "sourceBand": "decizii",
     "target": "legi_ordonante",
     "links": 1
    }
   ],
   "topTargets": [
    {
     "kind": "amends",
     "target": {
      "actId": "213501",
      "citation": "HG nr. 1705/2006",
      "title": null
     },
     "links": 341
    },
    {
     "kind": "amends",
     "target": {
      "actId": "65916",
      "citation": "Legea nr. 95/2006",
      "title": null
     },
     "links": 106
    },
    {
     "kind": "amends",
     "target": {
      "actId": "78808",
      "citation": "Ordinul nr. 141/2017",
      "title": null
     },
     "links": 98
    },
    {
     "kind": "amends",
     "target": {
      "actId": "79522",
      "citation": "Ordinul nr. 245/2017",
      "title": null
     },
     "links": 87
    },
    {
     "kind": "amends",
     "target": {
      "actId": "29384",
      "citation": "Legea nr. 1/2011",
      "title": null
     },
     "links": 70
    },
    {
     "kind": "amends",
     "target": {
      "actId": "66150",
      "citation": "Legea nr. 227/2015",
      "title": null
     },
     "links": 70
    },
    {
     "kind": "amends",
     "target": {
      "actId": "157190",
      "citation": "Ordinul nr. 5994/2024",
      "title": null
     },
     "links": 54
    },
    {
     "kind": "amends",
     "target": {
      "actId": "93306",
      "citation": "Ordinul nr. 1468/2018",
      "title": null
     },
     "links": 48
    },
    {
     "kind": "amends",
     "target": {
      "actId": "107354",
      "citation": "Ordinul nr. 1165/2020",
      "title": null
     },
     "links": 46
    },
    {
     "kind": "amends",
     "target": {
      "actId": "173409",
      "citation": "HG nr. 1359/2001",
      "title": null
     },
     "links": 44
    },
    {
     "kind": "amends",
     "target": {
      "actId": "126207",
      "citation": "Ordinul nr. 443/2022",
      "title": null
     },
     "links": 42
    },
    {
     "kind": "amends",
     "target": {
      "actId": "196762",
      "citation": "Ordinul nr. 86/2005",
      "title": null
     },
     "links": 41
    },
    {
     "kind": "amends",
     "target": {
      "actId": "202080",
      "citation": "HG nr. 956/2005",
      "title": null
     },
     "links": 41
    },
    {
     "kind": "amends",
     "target": {
      "actId": "227879",
      "citation": "Ordinul nr. 490/2008",
      "title": null
     },
     "links": 41
    },
    {
     "kind": "amends",
     "target": {
      "actId": "127352",
      "citation": "Ordinul nr. 180/2022",
      "title": null
     },
     "links": 40
    },
    {
     "kind": "amends",
     "target": {
      "actId": "28856",
      "citation": "Legea nr. 263/2010",
      "title": null
     },
     "links": 40
    },
    {
     "kind": "amends",
     "target": {
      "actId": "4595",
      "citation": "Ordinul nr. 477/2009",
      "title": null
     },
     "links": 40
    },
    {
     "kind": "amends",
     "target": {
      "actId": "53048",
      "citation": "HG nr. 1156/2013",
      "title": null
     },
     "links": 40
    },
    {
     "kind": "amends",
     "target": {
      "actId": "174781",
      "citation": "HG nr. 1362/2001",
      "title": null
     },
     "links": 38
    },
    {
     "kind": "amends",
     "target": {
      "actId": "79513",
      "citation": "Ordinul nr. 377/2017",
      "title": null
     },
     "links": 38
    },
    {
     "kind": "amends",
     "target": {
      "actId": "57745",
      "citation": "Ordinul nr. 96/2014",
      "title": null
     },
     "links": 37
    },
    {
     "kind": "amends",
     "target": {
      "actId": "179881",
      "citation": "OUG nr. 195/2002",
      "title": null
     },
     "links": 36
    },
    {
     "kind": "amends",
     "target": {
      "actId": "140645",
      "citation": "Ordinul nr. 2408/2023",
      "title": null
     },
     "links": 35
    },
    {
     "kind": "amends",
     "target": {
      "actId": "177472",
      "citation": "HG nr. 971/2002",
      "title": null
     },
     "links": 35
    }
   ],
   "daysMeasure": "days from the target's first Gazette publication to the source's first Gazette publication",
   "days": [
    {
     "kind": "amends",
     "links": 19313,
     "p25": 308,
     "median": 1024,
     "p75": 2649
    },
    {
     "kind": "approves_ordinance",
     "links": 4132,
     "p25": 127,
     "median": 198,
     "p75": 375
    },
    {
     "kind": "court_names",
     "links": 14151,
     "p25": 1220,
     "median": 2533,
     "p75": 4308
    },
    {
     "kind": "rejects_ordinance",
     "links": 407,
     "p25": 257,
     "median": 499,
     "p75": 932
    }
   ]
  },
  "layer": {
   "layerId": "4",
   "releaseId": "6",
   "builtAt": "2026-11-24T22:38:54Z",
   "publishedAt": "2026-11-24T22:39:00Z",
   "releaseBuiltAt": "2026-11-21T17:19:17Z",
   "releasePublishedAt": "2026-11-21T17:22:11Z"
  },
  "args": {}
 },
 "acts": {
  "data": {
   "total": 227202,
   "population": 227202,
   "uncertain": 18661,
   "unplaced": 6307,
   "order": "amended",
   "rows": [
    {
     "actId": "213501",
     "citation": "HG nr. 1705/2006",
     "title": null,
     "year": 2006,
     "type": "hotarare",
     "issuer": "Guvernul",
     "family": "guvern",
     "felul": "budget-property-organisation",
     "kind": "property",
     "guess": null,
     "amended": 341,
     "court": 0,
     "versions": 5,
     "cited": 68,
     "hasText": false
    },
    {
     "actId": "65916",
     "citation": "Legea nr. 95/2006",
     "title": null,
     "year": 2006,
     "type": "lege",
     "issuer": "Parlamentul",
     "family": "parlament",
     "felul": "rule-making",
     "kind": "new_rules",
     "guess": null,
     "amended": 106,
     "court": 136,
     "versions": 0,
     "cited": 99,
     "hasText": false
    },
    {
     "actId": "78808",
     "citation": "Ordinul nr. 141/2017",
     "title": null,
     "year": 2017,
     "type": "ordin",
     "issuer": "CNAS",
     "family": "agentii_centrale",
     "felul": "rule-making",
     "kind": "application_rules",
     "guess": null,
     "amended": 98,
     "court": 0,
     "versions": 67,
     "cited": 0,
     "hasText": false
    },
    {
     "actId": "79522",
     "citation": "Ordinul nr. 245/2017",
     "title": null,
     "year": 2017,
     "type": "ordin",
     "issuer": "CNAS",
     "family": "agentii_centrale",
     "felul": "rule-making",
     "kind": "application_rules",
     "guess": null,
     "amended": 87,
     "court": 0,
     "versions": 97,
     "cited": 0,
     "hasText": false
    },
    {
     "actId": "66150",
     "citation": "Legea nr. 227/2015",
     "title": null,
     "year": 2015,
     "type": "lege",
     "issuer": "Parlamentul",
     "family": "parlament",
     "felul": "unplaced",
     "kind": "unplaced",
     "guess": null,
     "amended": 70,
     "court": 57,
     "versions": 152,
     "cited": 7,
     "hasText": false
    },
    {
     "actId": "29384",
     "citation": "Legea nr. 1/2011",
     "title": null,
     "year": 2011,
     "type": "lege",
     "issuer": "Parlamentul",
     "family": "parlament",
     "felul": "rule-making",
     "kind": "new_rules",
     "guess": null,
     "amended": 70,
     "court": 44,
     "versions": 120,
     "cited": 46,
     "hasText": false
    },
    {
     "actId": "157190",
     "citation": "Ordinul nr. 5994/2024",
     "title": null,
     "year": 2024,
     "type": "ordin",
     "issuer": "Ministerul Sănătății (linia)",
     "family": "ministere",
     "felul": "rule-making",
     "kind": "application_rules",
     "guess": null,
     "amended": 54,
     "court": 0,
     "versions": 38,
     "cited": 1,
     "hasText": false
    },
    {
     "actId": "93306",
     "citation": "Ordinul nr. 1468/2018",
     "title": null,
     "year": 2018,
     "type": "ordin",
     "issuer": "Ministerul Sănătății (linia)",
     "family": "ministere",
     "felul": "rule-making",
     "kind": "application_rules",
     "guess": null,
     "amended": 48,
     "court": 0,
     "versions": 26,
     "cited": 1,
     "hasText": false
    },
    {
     "actId": "107354",
     "citation": "Ordinul nr. 1165/2020",
     "title": null,
     "year": 2020,
     "type": "ordin",
     "issuer": "Ministerul Sănătății (linia)",
     "family": "ministere",
     "felul": "rule-making",
     "kind": "application_rules",
     "guess": null,
     "amended": 46,
     "court": 0,
     "versions": 46,
     "cited": 0,
     "hasText": false
    },
    {
     "actId": "173409",
     "citation": "HG nr. 1359/2001",
     "title": null,
     "year": 2001,
     "type": "hotarare",
     "issuer": "Guvernul",
     "family": "guvern",
     "felul": "uncertain",
     "kind": "uncertain",
     "guess": {
      "group": "rule-making",
      "kind": "new_rules"
     },
     "amended": 44,
     "court": 0,
     "versions": 0,
     "cited": 1,
     "hasText": false
    },
    {
     "actId": "126207",
     "citation": "Ordinul nr. 443/2022",
     "title": null,
     "year": 2022,
     "type": "ordin",
     "issuer": "Ministerul Sănătății (linia)",
     "family": "ministere",
     "felul": "rule-making",
     "kind": "application_rules",
     "guess": null,
     "amended": 42,
     "court": 0,
     "versions": 33,
     "cited": 0,
     "hasText": false
    },
    {
     "actId": "227879",
     "citation": "Ordinul nr. 490/2008",
     "title": null,
     "year": 2008,
     "type": "ordin",
     "issuer": "Ministerul Afacerilor Interne (linia)",
     "family": "ministere",
     "felul": "uncertain",
     "kind": "uncertain",
     "guess": {
      "group": "rule-making",
      "kind": "new_rules"
     },
     "amended": 41,
     "court": 0,
     "versions": 38,
     "cited": 0,
     "hasText": false
    },
    {
     "actId": "202080",
     "citation": "HG nr. 956/2005",
     "title": null,
     "year": 2005,
     "type": "hotarare",
     "issuer": "Guvernul",
     "family": "guvern",
     "felul": "uncertain",
     "kind": "uncertain",
     "guess": {
      "group": "rule-making",
      "kind": "new_rules"
     },
     "amended": 41,
     "court": 0,
     "versions": 6,
     "cited": 3,
     "hasText": false
    },
    {
     "actId": "196762",
     "citation": "Ordinul nr. 86/2005",
     "title": null,
     "year": 2005,
     "type": "ordin",
     "issuer": "Ministerul Finanțelor (linia)",
     "family": "ministere",
     "felul": "rule-making",
     "kind": "new_rules",
     "guess": null,
     "amended": 41,
     "court": 0,
     "versions": 45,
     "cited": 1,
     "hasText": false
    },
    {
     "actId": "127352",
     "citation": "Ordinul nr. 180/2022",
     "title": null,
     "year": 2022,
     "type": "ordin",
     "issuer": "CNAS",
     "family": "agentii_centrale",
     "felul": "rule-making",
     "kind": "application_rules",
     "guess": null,
     "amended": 40,
     "court": 0,
     "versions": 44,
     "cited": 0,
     "hasText": false
    },
    {
     "actId": "53048",
     "citation": "HG nr. 1156/2013",
     "title": null,
     "year": 2013,
     "type": "hotarare",
     "issuer": "Guvernul",
     "family": "guvern",
     "felul": "uncertain",
     "kind": "uncertain",
     "guess": {
      "group": "rule-making",
      "kind": "application_rules"
     },
     "amended": 40,
     "court": 0,
     "versions": 17,
     "cited": 0,
     "hasText": false
    },
    {
     "actId": "28856",
     "citation": "Legea nr. 263/2010",
     "title": null,
     "year": 2010,
     "type": "lege",
     "issuer": "Parlamentul",
     "family": "parlament",
     "felul": "rule-making",
     "kind": "new_rules",
     "guess": null,
     "amended": 40,
     "court": 283,
     "versions": 73,
     "cited": 18,
     "hasText": false
    },
    {
     "actId": "4595",
     "citation": "Ordinul nr. 477/2009",
     "title": null,
     "year": 2009,
     "type": "ordin",
     "issuer": "Ministerul Sănătății (linia)",
     "family": "ministere",
     "felul": "budget-property-organisation",
     "kind": "organisation",
     "guess": null,
     "amended": 40,
     "court": 0,
     "versions": 39,
     "cited": 1,
     "hasText": false
    },
    {
     "actId": "174781",
     "citation": "HG nr. 1362/2001",
     "title": null,
     "year": 2001,
     "type": "hotarare",
     "issuer": "Guvernul",
     "family": "guvern",
     "felul": "uncertain",
     "kind": "uncertain",
     "guess": {
      "group": "rule-making",
      "kind": "new_rules"
     },
     "amended": 38,
     "court": 0,
     "versions": 0,
     "cited": 1,
     "hasText": false
    },
    {
     "actId": "79513",
     "citation": "Ordinul nr. 377/2017",
     "title": null,
     "year": 2017,
     "type": "ordin",
     "issuer": "Ministerul Sănătății (linia)",
     "family": "ministere",
     "felul": "rule-making",
     "kind": "application_rules",
     "guess": null,
     "amended": 38,
     "court": 0,
     "versions": 44,
     "cited": 0,
     "hasText": false
    },
    {
     "actId": "57745",
     "citation": "Ordinul nr. 96/2014",
     "title": null,
     "year": 2014,
     "type": "ordin",
     "issuer": "ANSVSA",
     "family": "agentii_centrale",
     "felul": "rule-making",
     "kind": "application_rules",
     "guess": null,
     "amended": 37,
     "court": 0,
     "versions": 46,
     "cited": 1,
     "hasText": false
    },
    {
     "actId": "179881",
     "citation": "OUG nr. 195/2002",
     "title": null,
     "year": 2002,
     "type": "ordonanta-urgenta",
     "issuer": "Guvernul",
     "family": "guvern",
     "felul": "rule-making",
     "kind": "new_rules",
     "guess": null,
     "amended": 36,
     "court": 349,
     "versions": 85,
     "cited": 24,
     "hasText": false
    },
    {
     "actId": "177472",
     "citation": "HG nr. 971/2002",
     "title": null,
     "year": 2002,
     "type": "hotarare",
     "issuer": "Guvernul",
     "family": "guvern",
     "felul": "uncertain",
     "kind": "uncertain",
     "guess": {
      "group": "rule-making",
      "kind": "new_rules"
     },
     "amended": 35,
     "court": 0,
     "versions": 0,
     "cited": 1,
     "hasText": false
    },
    {
     "actId": "140645",
     "citation": "Ordinul nr. 2408/2023",
     "title": null,
     "year": 2023,
     "type": "ordin",
     "issuer": "Ministerul Sănătății (linia)",
     "family": "ministere",
     "felul": "rule-making",
     "kind": "application_rules",
     "guess": null,
     "amended": 35,
     "court": 0,
     "versions": 34,
     "cited": 1,
     "hasText": false
    },
    {
     "actId": "194937",
     "citation": "Ordinul nr. 848/2004",
     "title": null,
     "year": 2004,
     "type": "ordin",
     "issuer": "Ministerul Agriculturii (linia)",
     "family": "ministere",
     "felul": "rule-making",
     "kind": "application_rules",
     "guess": null,
     "amended": 34,
     "court": 0,
     "versions": 37,
     "cited": 0,
     "hasText": false
    }
   ],
   "hidden": 0,
   "next": "WyI0IiwiYWN0cz97fSIsMzQsIjE5NDkzNyJd"
  },
  "layer": {
   "layerId": "4",
   "releaseId": "6",
   "builtAt": "2026-11-24T22:38:54Z",
   "publishedAt": "2026-11-24T22:39:00Z",
   "releaseBuiltAt": "2026-11-21T17:19:17Z",
   "releasePublishedAt": "2026-11-21T17:22:11Z"
  },
  "args": {}
 }
} as const
