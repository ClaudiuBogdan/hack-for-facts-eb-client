/* Real SEAP contracts read from the dev API on 2026-09-28 (scratchpad fixtures.mjs), trimmed to what the page reads. Regenerate, don't edit. */
import type { RawContractRecord } from './contract.types'

export const CONTRACT_FIXTURES: Readonly<Record<string, RawContractRecord>> = {
 "turnul-sfatului": {
  "label": "Sibiu, Turnul Sfatului — o lucrare, două firme",
  "contract": {
   "id": "2533825",
   "contractNo": "191",
   "contractDate": "2025-12-10",
   "noticeNo": "SCNA1128809",
   "title": null,
   "supplier": {
    "cui": "27843529",
    "name": "DOMINO CONSTRUCT EXPERT SRL",
    "displayName": "DOMINO CONSTRUCT EXPERT SRL"
   },
   "valueRon": "7664195.00",
   "currency": null,
   "valueState": "official_exact",
   "valueStateRule": "own_value",
   "valueAccepted": true,
   "recordKind": "contract_award",
   "displayTitle": {
    "text": "„INTERVENTII DE REABILITARE LA TURNUL SFATULUI”",
    "source": "procedure",
    "sourceUrl": "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100595212"
   },
   "authority": {
    "cui": "4270740",
    "name": "Municipiul Sibiu",
    "displayName": "Municipiul Sibiu"
   },
   "cpvCode": "45453000",
   "estimatedValueRon": null,
   "sourceSystem": "seap_contracts",
   "sourceUrl": "https://data.gov.ro/dataset/e0cf7ffc-1fa0-4ffb-a82f-c83981d81f21/resource/a1936e88-7fc5-4ffc-af65-6f946e98a005/download/contracte-t_iv_2025.xlsx",
   "valueComparable": "7664195.00",
   "modifications": []
  },
  "procedure": {
   "id": "345516",
   "noticeNo": "SCNA1128809",
   "procedureType": "Procedura simplificata",
   "title": "„INTERVENTII DE REABILITARE LA TURNUL SFATULUI”",
   "authorityCui": "4270740",
   "estimatedValueRon": "7664195.87",
   "awardedValueRon": "7664195.87",
   "cpvCode": "45453000",
   "publicationDate": null
  },
  "ted": null,
  "duplicates": [],
  "notice": {
   "total": 2,
   "rows": [
    {
     "id": "2533825",
     "contractNo": "191",
     "contractDate": "2025-12-10",
     "noticeNo": "SCNA1128809",
     "title": null,
     "supplier": {
      "cui": "27843529",
      "name": "DOMINO CONSTRUCT EXPERT SRL"
     },
     "valueRon": "7664195.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2533824",
     "contractNo": "191",
     "contractDate": "2025-12-10",
     "noticeNo": "SCNA1128809",
     "title": null,
     "supplier": {
      "cui": "21179945",
      "name": "DECORINT"
     },
     "valueRon": "7664195.00",
     "currency": null,
     "valueState": "conflicting_sources",
     "valueStateRule": "cross_disagrees",
     "valueAccepted": false,
     "recordKind": "contract_award"
    }
   ]
  },
  "names": {
   "labels": [
    [
     "4270740",
     "MUNICIPIUL SIBIU"
    ],
    [
     "27843529",
     "DOMINO CONSTRUCT EXPERT SRL"
    ],
    [
     "21179945",
     "DECORINT S.R.L."
    ]
   ],
   "entity": {
    "organization": {
     "name": "MUNICIPIUL SIBIU"
    },
    "territory": {
     "kind": "municipality",
     "name": "MUNICIPIUL SIBIU",
     "countyCode": "SB",
     "countyName": "SIBIU"
    },
    "reference": {
     "name": "MUNICIPIUL SIBIU",
     "address": "Sibiu, Municipiul Sibiu, STRADA SAMUEL BRUKENTHAL, Numar 2-4, Bloc/Scara , Sector , Cod postal 550178",
     "entityType": "uat",
     "isTerritorialExecutive": true
    },
    "budget": {
     "presence": true
    }
   }
  },
  "cpv": [
   {
    "code": "45453000",
    "ro": "Lucrări de reparaţii generale şi de renovare",
    "en": "Overhaul and refurbishment work"
   }
  ],
  "source": {
   "caNoticeId": "100595212",
   "callNotice": {
    "no": "SCN1167175",
    "date": "2025-08-26"
   },
   "awardNoticeDate": "2025-12-11",
   "awardNoticeVersions": [
    "2025-12-11",
    "2026-07-13",
    "2026-08-19"
   ],
   "authorityType": "Autoritatea regională sau locală",
   "contractType": "Lucrari",
   "totalEstimate": {
    "value": 7664195.87,
    "currency": "Leu"
   },
   "offerSpread": null,
   "frameworkValue": null,
   "plan": null,
   "annexD": {
    "explanation": null,
    "forceMajeure": false,
    "noOffers": false,
    "uniqueOfferer": null,
    "repetition": false,
    "supplementary": false
   },
   "lotsTotal": 1,
   "lots": [
    {
     "no": "1",
     "title": "Lot implicit",
     "estimate": 9052461.95,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Program / Proiect",
     "euProgram": null,
     "days": null,
     "months": 28,
     "status": "Atribuit"
    }
   ],
   "contract": {
    "framework": "Contract de achizitii publice",
    "startDate": "2025-12-10",
    "offers": {
     "received": 2,
     "sme": 2,
     "eu": 0,
     "nonEu": 0,
     "electronic": 2
    },
    "lotOffers": [
     {
      "no": "1",
      "admitted": 1,
      "unaccepted": 0,
      "nonconformed": 1,
      "withdrawn": 0
     }
    ],
    "estimate": 9052461.95,
    "value": 7664195.87,
    "currency": "RON",
    "ronValue": 7664195.87,
    "rate": 1,
    "subcontracting": null,
    "modified": 2,
    "winners": [
     {
      "name": "DECORINT",
      "cui": "21179945",
      "sme": true,
      "city": "Cluj-Napoca",
      "county": "Cluj"
     },
     {
      "name": "DOMINO CONSTRUCT EXPERT SRL",
      "cui": "27843529",
      "sme": true,
      "city": "Berghia",
      "county": "Mures"
     }
    ]
   },
   "contractsInNotice": 1
  },
  "context": {
   "year": 2025,
   "awards": [
    {
     "year": 2025,
     "value": 1
    }
   ],
   "frameworks": [],
   "direct": [],
   "pairYear": {
    "count": 1,
    "withValue": 1,
    "value": 7664195
   },
   "buyer": {
    "awards": {
     "count": 65,
     "withValue": 23,
     "value": 50858028.12
    },
    "frameworks": {
     "count": 9,
     "withValue": 0,
     "value": null
    },
    "firms": {
     "parties": 40,
     "more": false,
     "count": 1
    }
   },
   "seller": {
    "awards": {
     "count": 3,
     "withValue": 2,
     "value": 8646462
    },
    "clients": {
     "parties": 3,
     "more": false,
     "count": 1
    }
   },
   "records": 1,
   "newer": [
    {
     "id": "2533825",
     "contractNo": "191",
     "contractDate": "2025-12-10",
     "noticeNo": "SCNA1128809",
     "title": null,
     "supplier": {
      "cui": "27843529",
      "name": "DOMINO CONSTRUCT EXPERT SRL"
     },
     "valueRon": "7664195.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ],
   "older": [
    {
     "id": "2533825",
     "contractNo": "191",
     "contractDate": "2025-12-10",
     "noticeNo": "SCNA1128809",
     "title": null,
     "supplier": {
      "cui": "27843529",
      "name": "DOMINO CONSTRUCT EXPERT SRL"
     },
     "valueRon": "7664195.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ]
  }
 },
 "autostrada": {
  "label": "CNAIR, autostrada Pașcani–Suceava — licitație deschisă, TED",
  "contract": {
   "id": "51025676",
   "contractNo": "92/58718",
   "contractDate": "2026-04-29",
   "noticeNo": "CAN1167178",
   "title": "Proiectare si Executie “Autostrada Pascani-Suceava Lot 1”",
   "supplier": {
    "cui": "17042060",
    "name": "TEHNOSTRADE S.R.L.",
    "displayName": "TEHNOSTRADE S.R.L."
   },
   "valueRon": "3068398862.94",
   "currency": "RON",
   "valueState": "official_exact",
   "valueStateRule": "own_value",
   "valueAccepted": true,
   "recordKind": "contract_award",
   "displayTitle": {
    "text": "Proiectare si Executie “Autostrada Pascani-Suceava Lot 1”",
    "source": "native",
    "sourceUrl": "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100626163"
   },
   "authority": {
    "cui": "16054368",
    "name": "COMPANIA NATIONALA DE ADMINISTRARE A INFRASTRUCTURII RUTIERE S.A.",
    "displayName": "COMPANIA NATIONALA DE ADMINISTRARE A INFRASTRUCTURII RUTIERE S.A."
   },
   "cpvCode": "45233100",
   "estimatedValueRon": null,
   "sourceSystem": "elicitatie_ca_award",
   "sourceUrl": "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100626163",
   "valueComparable": "3068398862.94",
   "modifications": []
  },
  "procedure": {
   "id": "362314",
   "noticeNo": "CAN1167178",
   "procedureType": "Licitatie deschisa",
   "title": "PROIECTARE SI EXECUTIE \"AUTOSTRADA PASCANI – SUCEAVA LOT 1\"",
   "authorityCui": "16054368",
   "estimatedValueRon": "3068398862.94",
   "awardedValueRon": "3068398862.94",
   "cpvCode": "45233100",
   "publicationDate": null
  },
  "ted": {
   "tedNoticeNo": "313170-2026",
   "sourceUrl": "https://ted.europa.eu/en/notice/313170-2026/xml"
  },
  "duplicates": [],
  "notice": {
   "total": 1,
   "rows": [
    {
     "id": "51025676",
     "contractNo": "92/58718",
     "contractDate": "2026-04-29",
     "noticeNo": "CAN1167178",
     "title": "Proiectare si Executie “Autostrada Pascani-Suceava Lot 1”",
     "supplier": {
      "cui": "17042060",
      "name": "TEHNOSTRADE S.R.L."
     },
     "valueRon": "3068398862.94",
     "currency": "RON",
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ]
  },
  "names": {
   "labels": [
    [
     "16054368",
     "COMPANIA NAŢIONALĂ DE ADMINISTRARE A INFRASTRUCTURII RUTIERE S.A."
    ],
    [
     "17042060",
     "TEHNOSTRADE SRL"
    ]
   ],
   "entity": {
    "organization": {
     "name": "COMPANIA NAŢIONALĂ DE ADMINISTRARE A INFRASTRUCTURII RUTIERE S.A."
    },
    "territory": {
     "kind": "sector",
     "name": "SECTORUL 1",
     "countyCode": "B",
     "countyName": "MUNICIPIUL BUCUREȘTI"
    },
    "reference": {
     "name": "COMPANIA NATIONALA DE AUTOSTRAZI SI DRUMURI NATIONALE DIN ROMANIA S.A.",
     "address": "Bucuresti, Sectorul 1, BULEVARD DINICU GOLESCU, Numar 38, Bloc/Scara -, Sector 1, Cod postal 10873",
     "entityType": "public_entity",
     "isTerritorialExecutive": false
    },
    "budget": {
     "presence": false
    }
   }
  },
  "cpv": [
   {
    "code": "45233100",
    "ro": "Lucrări de construcţii de autostrăzi şi de drumuri",
    "en": "Construction work for highways, roads"
   }
  ],
  "source": {
   "caNoticeId": "100626163",
   "callNotice": {
    "no": "CN1071176",
    "date": "2024-07-18"
   },
   "awardNoticeDate": "2026-05-07",
   "awardNoticeVersions": [
    "2026-05-07"
   ],
   "authorityType": "Organism de drept public",
   "contractType": "Lucrari",
   "totalEstimate": {
    "value": 3068398862.94,
    "currency": "Leu"
   },
   "offerSpread": null,
   "frameworkValue": null,
   "plan": null,
   "annexD": {
    "explanation": null,
    "forceMajeure": false,
    "noOffers": false,
    "uniqueOfferer": null,
    "repetition": false,
    "supplementary": false
   },
   "lotsTotal": 1,
   "lots": [
    {
     "no": "1",
     "title": "Lot implicit",
     "estimate": null,
     "currency": "Leu",
     "criterion": "Cel mai bun raport calitate – pret",
     "financing": "Program / Proiect",
     "euProgram": null,
     "days": null,
     "months": 90,
     "status": "Atribuit"
    }
   ],
   "contract": {
    "framework": "Contract de achizitii publice",
    "startDate": "2026-04-30",
    "offers": {
     "received": 3,
     "sme": 2,
     "eu": 1,
     "nonEu": 0,
     "electronic": 3
    },
    "lotOffers": [
     {
      "no": "1",
      "admitted": 1,
      "unaccepted": 2,
      "nonconformed": 0,
      "withdrawn": 0
     }
    ],
    "estimate": 4300406164.41,
    "value": 3068398862.94,
    "currency": "RON",
    "ronValue": 3068398862.94,
    "rate": 1,
    "subcontracting": null,
    "modified": 0,
    "winners": [
     {
      "name": "TEHNOSTRADE S.R.L.",
      "cui": "17042060",
      "sme": false,
      "city": "Bacau",
      "county": "Bacau"
     },
     {
      "name": "SA & PE CONSTRUCT SRL",
      "cui": "31994414",
      "sme": false,
      "city": "Bacau",
      "county": "Bacau"
     },
     {
      "name": "SPEDITION UMB",
      "cui": "9942680",
      "sme": false,
      "city": "Bacau",
      "county": "Bacau"
     }
    ]
   },
   "contractsInNotice": 1
  },
  "context": {
   "year": 2026,
   "awards": [
    {
     "year": 2021,
     "value": 5
    },
    {
     "year": 2022,
     "value": 2
    },
    {
     "year": 2023,
     "value": 2
    },
    {
     "year": 2024,
     "value": 1
    },
    {
     "year": 2025,
     "value": 1
    },
    {
     "year": 2026,
     "value": 1
    }
   ],
   "frameworks": [],
   "direct": [],
   "pairYear": {
    "count": 1,
    "withValue": 1,
    "value": 3068398862.94
   },
   "buyer": {
    "awards": {
     "count": 334,
     "withValue": 150,
     "value": 6352787737.53
    },
    "frameworks": {
     "count": 54,
     "withValue": 0,
     "value": null
    },
    "firms": {
     "parties": 100,
     "more": true,
     "count": 1
    }
   },
   "seller": {
    "awards": {
     "count": 1,
     "withValue": 1,
     "value": 3068398862.94
    },
    "clients": {
     "parties": 1,
     "more": false,
     "count": 1
    }
   },
   "records": 12,
   "newer": [
    {
     "id": "51025676",
     "contractNo": "92/58718",
     "contractDate": "2026-04-29",
     "noticeNo": "CAN1167178",
     "title": "Proiectare si Executie “Autostrada Pascani-Suceava Lot 1”",
     "supplier": {
      "cui": "17042060",
      "name": "TEHNOSTRADE S.R.L."
     },
     "valueRon": "3068398862.94",
     "currency": "RON",
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ],
   "older": [
    {
     "id": "51025676",
     "contractNo": "92/58718",
     "contractDate": "2026-04-29",
     "noticeNo": "CAN1167178",
     "title": "Proiectare si Executie “Autostrada Pascani-Suceava Lot 1”",
     "supplier": {
      "cui": "17042060",
      "name": "TEHNOSTRADE S.R.L."
     },
     "valueRon": "3068398862.94",
     "currency": "RON",
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2176038",
     "contractNo": "92/44172",
     "contractDate": "2025-04-30",
     "noticeNo": "CAN1146605",
     "title": null,
     "supplier": {
      "cui": "17042060",
      "name": "TEHNOSTRADE S.R.L."
     },
     "valueRon": "2690665509.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "1950442",
     "contractNo": "92/115475",
     "contractDate": "2024-11-18",
     "noticeNo": "CAN1137556",
     "title": null,
     "supplier": {
      "cui": "17042060",
      "name": "TEHNOSTRADE S.R.L."
     },
     "valueRon": "71336289.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "1621684",
     "contractNo": "92/107756",
     "contractDate": "2023-10-31",
     "noticeNo": "CAN1115166",
     "title": null,
     "supplier": {
      "cui": "17042060",
      "name": "TEHNOSTRADE S.R.L."
     },
     "valueRon": "1568119534.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ]
  }
 },
 "salubrizare": {
  "label": "Sibiu, salubrizare — negociere fără anunț prealabil",
  "contract": {
   "id": "51426958",
   "contractNo": "31",
   "contractDate": "2026-04-02",
   "noticeNo": "CAN1165498",
   "title": "„ACTIVITĂŢI DE SALUBRIZARE STRADALĂ ȘI DESZĂPEZIRE ÎN MUNICIPIUL SIBIU ȘI STAȚIUNEA PĂLTINIȘ”",
   "supplier": {
    "cui": "946778",
    "name": "SOMA",
    "displayName": "SOMA"
   },
   "valueRon": "46134632.78",
   "currency": "RON",
   "valueState": "official_exact",
   "valueStateRule": "own_value",
   "valueAccepted": true,
   "recordKind": "contract_award",
   "displayTitle": {
    "text": "„ACTIVITĂŢI DE SALUBRIZARE STRADALĂ ȘI DESZĂPEZIRE ÎN MUNICIPIUL SIBIU ȘI STAȚIUNEA PĂLTINIȘ”",
    "source": "native",
    "sourceUrl": "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100620734"
   },
   "authority": {
    "cui": "4270740",
    "name": "Municipiul Sibiu",
    "displayName": "Municipiul Sibiu"
   },
   "cpvCode": "90610000",
   "estimatedValueRon": null,
   "sourceSystem": "elicitatie_ca_award",
   "sourceUrl": "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100620734",
   "valueComparable": "46134632.78",
   "modifications": []
  },
  "procedure": {
   "id": "358744",
   "noticeNo": "CAN1165498",
   "procedureType": "Negociere fara publicare prealabila",
   "title": "„ACTIVITĂŢI DE SALUBRIZARE STRADALĂ ȘI DESZĂPEZIRE ÎN MUNICIPIUL SIBIU ȘI STAȚIUNEA PĂLTINIȘ”",
   "authorityCui": "4270740",
   "estimatedValueRon": "46134632.78",
   "awardedValueRon": "46134632.78",
   "cpvCode": "90610000",
   "publicationDate": null
  },
  "ted": null,
  "duplicates": [],
  "notice": {
   "total": 1,
   "rows": [
    {
     "id": "51426958",
     "contractNo": "31",
     "contractDate": "2026-04-02",
     "noticeNo": "CAN1165498",
     "title": "„ACTIVITĂŢI DE SALUBRIZARE STRADALĂ ȘI DESZĂPEZIRE ÎN MUNICIPIUL SIBIU ȘI STAȚIUNEA PĂLTINIȘ”",
     "supplier": {
      "cui": "946778",
      "name": "SOMA"
     },
     "valueRon": "46134632.78",
     "currency": "RON",
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ]
  },
  "names": {
   "labels": [
    [
     "4270740",
     "MUNICIPIUL SIBIU"
    ],
    [
     "946778",
     "SOMA SRL"
    ]
   ],
   "entity": {
    "organization": {
     "name": "MUNICIPIUL SIBIU"
    },
    "territory": {
     "kind": "municipality",
     "name": "MUNICIPIUL SIBIU",
     "countyCode": "SB",
     "countyName": "SIBIU"
    },
    "reference": {
     "name": "MUNICIPIUL SIBIU",
     "address": "Sibiu, Municipiul Sibiu, STRADA SAMUEL BRUKENTHAL, Numar 2-4, Bloc/Scara , Sector , Cod postal 550178",
     "entityType": "uat",
     "isTerritorialExecutive": true
    },
    "budget": {
     "presence": true
    }
   }
  },
  "cpv": [
   {
    "code": "90610000",
    "ro": "Servicii de curăţare şi măturare a străzilor",
    "en": "Street-cleaning and sweeping services"
   }
  ],
  "source": {
   "caNoticeId": "100620734",
   "callNotice": null,
   "awardNoticeDate": "2026-04-06",
   "awardNoticeVersions": [
    "2026-04-06"
   ],
   "authorityType": "Municipiu",
   "contractType": "Servicii",
   "totalEstimate": {
    "value": 46134632.78,
    "currency": "Leu"
   },
   "offerSpread": null,
   "frameworkValue": null,
   "plan": {
    "name": "Delegare a gestiunii activităților de salubrizare stradală și deszăpezire în Municipiul Sibiu și Stațiunea Păltiniș",
    "value": 46134632.78
   },
   "annexD": {
    "explanation": "Autoritatea Contractantă a demarat licitatia deschisă CN1089166 din 23.01.2026 care este contestata. Astfel, Autoritatea Contractanta a demarat negociere fara publicare pentru incheierea unui contract care va fi valabil pana la atribuirea contractului prin licitatie",
    "forceMajeure": true,
    "noOffers": false,
    "uniqueOfferer": null,
    "repetition": false,
    "supplementary": false
   },
   "lotsTotal": 1,
   "lots": [
    {
     "no": "1",
     "title": "Lot implicit",
     "estimate": null,
     "currency": null,
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 24,
     "status": "Atribuit"
    }
   ],
   "contract": {
    "framework": "Contract de achizitii publice",
    "startDate": "2026-04-03",
    "offers": {
     "received": 1,
     "sme": null,
     "eu": 0,
     "nonEu": 0,
     "electronic": 0
    },
    "lotOffers": [],
    "estimate": 46184050,
    "value": 46134632.78,
    "currency": "RON",
    "ronValue": 46134632.78,
    "rate": 1,
    "subcontracting": null,
    "modified": 0,
    "winners": [
     {
      "name": "SOMA",
      "cui": "946778",
      "sme": false,
      "city": "Cisnadie",
      "county": "Sibiu"
     }
    ]
   },
   "contractsInNotice": 1
  },
  "context": {
   "year": 2026,
   "awards": [
    {
     "year": 2021,
     "value": 1
    },
    {
     "year": 2026,
     "value": 1
    }
   ],
   "frameworks": [],
   "direct": [],
   "pairYear": {
    "count": 1,
    "withValue": 1,
    "value": 46134632.78
   },
   "buyer": {
    "awards": {
     "count": 22,
     "withValue": 22,
     "value": 76957092
    },
    "frameworks": {
     "count": 2,
     "withValue": 0,
     "value": null
    },
    "firms": {
     "parties": 13,
     "more": false,
     "count": 1
    }
   },
   "seller": {
    "awards": {
     "count": 1,
     "withValue": 1,
     "value": 46134632.78
    },
    "clients": {
     "parties": 1,
     "more": false,
     "count": 1
    }
   },
   "records": 2,
   "newer": [
    {
     "id": "51426958",
     "contractNo": "31",
     "contractDate": "2026-04-02",
     "noticeNo": "CAN1165498",
     "title": "„ACTIVITĂŢI DE SALUBRIZARE STRADALĂ ȘI DESZĂPEZIRE ÎN MUNICIPIUL SIBIU ȘI STAȚIUNEA PĂLTINIȘ”",
     "supplier": {
      "cui": "946778",
      "name": "SOMA"
     },
     "valueRon": "46134632.78",
     "currency": "RON",
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ],
   "older": [
    {
     "id": "51426958",
     "contractNo": "31",
     "contractDate": "2026-04-02",
     "noticeNo": "CAN1165498",
     "title": "„ACTIVITĂŢI DE SALUBRIZARE STRADALĂ ȘI DESZĂPEZIRE ÎN MUNICIPIUL SIBIU ȘI STAȚIUNEA PĂLTINIȘ”",
     "supplier": {
      "cui": "946778",
      "name": "SOMA"
     },
     "valueRon": "46134632.78",
     "currency": "RON",
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2497462",
     "contractNo": "188",
     "contractDate": "2021-12-08",
     "noticeNo": "CAN1068051",
     "title": null,
     "supplier": {
      "cui": "946778",
      "name": "SOMA"
     },
     "valueRon": "74814360.00",
     "currency": null,
     "valueState": "conflicting_sources",
     "valueStateRule": "cross_disagrees",
     "valueAccepted": false,
     "recordKind": "contract_award"
    }
   ]
  }
 },
 "asociere": {
  "label": "CNIR, autostrada Târgu Mureș–Târgu Neamț — asociere de patru firme",
  "contract": {
   "id": "2137333",
   "contractNo": "101/1888",
   "contractDate": "2025-03-31",
   "noticeNo": "CAN1145385",
   "title": null,
   "supplier": {
    "cui": "17042060",
    "name": "TEHNOSTRADE S.R.L.",
    "displayName": "TEHNOSTRADE S.R.L."
   },
   "valueRon": "6142792901.00",
   "currency": null,
   "valueState": "official_exact",
   "valueStateRule": "own_value",
   "valueAccepted": true,
   "recordKind": "contract_award",
   "displayTitle": {
    "text": "Proiectare și Execuție AUTOSTRADA TARGU MURES-TARGU NEAMT SECTIUNEA II MIERCUREA NIRAJULUI – LEGHIN LOT 2 A: DITRAU-GRINTIES.",
    "source": "procedure",
    "sourceUrl": "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100578781"
   },
   "authority": {
    "cui": "36727850",
    "name": "COMPANIA NATIONALA DE INVESTITII RUTIERE S.A.",
    "displayName": "COMPANIA NATIONALA DE INVESTITII RUTIERE S.A."
   },
   "cpvCode": "45233100",
   "estimatedValueRon": null,
   "sourceSystem": "seap_contracts",
   "sourceUrl": "https://data.gov.ro/dataset/e0cf7ffc-1fa0-4ffb-a82f-c83981d81f21/resource/91947695-b315-4d72-b292-84bd57a9c72b/download/contracte-t2-2025.xlsx",
   "valueComparable": "6142792901.00",
   "modifications": []
  },
  "procedure": {
   "id": "337399",
   "noticeNo": "CAN1145385",
   "procedureType": "Licitatie deschisa",
   "title": "Proiectare și Execuție AUTOSTRADA TARGU MURES-TARGU NEAMT SECTIUNEA II MIERCUREA NIRAJULUI – LEGHIN LOT 2 A: DITRAU-GRINTIES.",
   "authorityCui": "36727850",
   "estimatedValueRon": "6142792901.06",
   "awardedValueRon": "6142792901.06",
   "cpvCode": "45233100",
   "publicationDate": null
  },
  "ted": {
   "tedNoticeNo": "644509-2025",
   "sourceUrl": "https://ted.europa.eu/en/notice/644509-2025/xml"
  },
  "duplicates": [
   "seap_contracts"
  ],
  "notice": {
   "total": 5,
   "rows": [
    {
     "id": "2435981",
     "contractNo": "101/1888",
     "contractDate": "2025-03-31",
     "noticeNo": "CAN1145385",
     "title": null,
     "supplier": {
      "cui": null,
      "name": "Euro-Asfalt"
     },
     "valueRon": "6142792901.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2137333",
     "contractNo": "101/1888",
     "contractDate": "2025-03-31",
     "noticeNo": "CAN1145385",
     "title": null,
     "supplier": {
      "cui": "17042060",
      "name": "TEHNOSTRADE S.R.L."
     },
     "valueRon": "6142792901.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2137332",
     "contractNo": "101/1888",
     "contractDate": "2025-03-31",
     "noticeNo": "CAN1145385",
     "title": null,
     "supplier": {
      "cui": "9942680",
      "name": "SPEDITION UMB"
     },
     "valueRon": "6142792901.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2137331",
     "contractNo": "101/1888",
     "contractDate": "2025-03-31",
     "noticeNo": "CAN1145385",
     "title": null,
     "supplier": {
      "cui": "31994414",
      "name": "SA & PE CONSTRUCT SRL"
     },
     "valueRon": "6142792901.00",
     "currency": null,
     "valueState": "conflicting_sources",
     "valueStateRule": "cross_disagrees",
     "valueAccepted": false,
     "recordKind": "contract_award"
    },
    {
     "id": "2137330",
     "contractNo": "101/1888",
     "contractDate": "2025-03-31",
     "noticeNo": "CAN1145385",
     "title": null,
     "supplier": {
      "cui": null,
      "name": "Euro-Asfalt"
     },
     "valueRon": "6142792901.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ]
  },
  "names": {
   "labels": [
    [
     "36727850",
     "COMPANIA NAŢIONALĂ DE INVESTIŢII RUTIERE S.A."
    ],
    [
     "17042060",
     "TEHNOSTRADE SRL"
    ],
    [
     "9942680",
     "SPEDITION UMB SRL"
    ],
    [
     "31994414",
     "SA & PE CONSTRUCT SRL"
    ]
   ],
   "entity": {
    "organization": {
     "name": "COMPANIA NAŢIONALĂ DE INVESTIŢII RUTIERE S.A."
    },
    "territory": null,
    "reference": null,
    "budget": {
     "presence": false
    }
   }
  },
  "cpv": [
   {
    "code": "45233100",
    "ro": "Lucrări de construcţii de autostrăzi şi de drumuri",
    "en": "Construction work for highways, roads"
   }
  ],
  "source": {
   "caNoticeId": "100578781",
   "callNotice": {
    "no": "CN1074946",
    "date": "2024-10-31"
   },
   "awardNoticeDate": "2025-04-17",
   "awardNoticeVersions": [
    "2025-04-17",
    "2025-10-01"
   ],
   "authorityType": "Organism de drept public",
   "contractType": "Lucrari",
   "totalEstimate": {
    "value": 6142792901.06,
    "currency": "Leu"
   },
   "offerSpread": null,
   "frameworkValue": null,
   "plan": null,
   "annexD": {
    "explanation": null,
    "forceMajeure": false,
    "noOffers": false,
    "uniqueOfferer": null,
    "repetition": false,
    "supplementary": false
   },
   "lotsTotal": 1,
   "lots": [
    {
     "no": "1",
     "title": "Lot implicit",
     "estimate": null,
     "currency": "Leu",
     "criterion": "Cel mai bun raport calitate – pret",
     "financing": "Program / Proiect",
     "euProgram": null,
     "days": null,
     "months": 114,
     "status": "Atribuit"
    }
   ],
   "contract": {
    "framework": "Contract de achizitii publice",
    "startDate": "2025-03-31",
    "offers": {
     "received": 1,
     "sme": 1,
     "eu": 0,
     "nonEu": 1,
     "electronic": 1
    },
    "lotOffers": [
     {
      "no": "1",
      "admitted": 1,
      "unaccepted": 0,
      "nonconformed": 0,
      "withdrawn": 0
     }
    ],
    "estimate": 7579615950.64,
    "value": 6142792901.06,
    "currency": "RON",
    "ronValue": 6142792901.06,
    "rate": null,
    "subcontracting": null,
    "modified": 1,
    "winners": [
     {
      "name": "SA & PE CONSTRUCT SRL",
      "cui": "31994414",
      "sme": false,
      "city": "Bacau",
      "county": "Bacau"
     },
     {
      "name": "TEHNOSTRADE S.R.L.",
      "cui": "17042060",
      "sme": false,
      "city": "Bacau",
      "county": "Bacau"
     },
     {
      "name": "SPEDITION UMB",
      "cui": "9942680",
      "sme": false,
      "city": "Bacau",
      "county": "Bacau"
     },
     {
      "name": "Euro-Asfalt",
      "cui": "20038799007",
      "sme": true,
      "city": "Bahnari",
      "county": "NA"
     }
    ]
   },
   "contractsInNotice": 1
  },
  "context": {
   "year": 2025,
   "awards": [
    {
     "year": 2025,
     "value": 4
    }
   ],
   "frameworks": [],
   "direct": [],
   "pairYear": {
    "count": 4,
    "withValue": 0,
    "value": null
   },
   "buyer": {
    "awards": {
     "count": 26,
     "withValue": 5,
     "value": 22262996083
    },
    "frameworks": {
     "count": 0,
     "withValue": 0,
     "value": null
    },
    "firms": {
     "parties": 10,
     "more": false,
     "count": 4
    }
   },
   "seller": {
    "awards": {
     "count": 5,
     "withValue": 0,
     "value": null
    },
    "clients": {
     "parties": 2,
     "more": false,
     "count": 4
    }
   },
   "records": 4,
   "newer": [
    {
     "id": "2137333",
     "contractNo": "101/1888",
     "contractDate": "2025-03-31",
     "noticeNo": "CAN1145385",
     "title": null,
     "supplier": {
      "cui": "17042060",
      "name": "TEHNOSTRADE S.R.L."
     },
     "valueRon": "6142792901.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2482898",
     "contractNo": "101/5815/31.10.2025 - s20251031013",
     "contractDate": "2025-10-31",
     "noticeNo": "CAN1157175",
     "title": null,
     "supplier": {
      "cui": "17042060",
      "name": "TEHNOSTRADE S.R.L."
     },
     "valueRon": "5975737362.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2482796",
     "contractNo": "101/5816",
     "contractDate": "2025-10-31",
     "noticeNo": "CAN1157158",
     "title": null,
     "supplier": {
      "cui": "17042060",
      "name": "TEHNOSTRADE S.R.L."
     },
     "valueRon": "4292745059.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2522722",
     "contractNo": "101/6433/26.11.2025",
     "contractDate": "2025-11-27",
     "noticeNo": "CAN1158870",
     "title": null,
     "supplier": {
      "cui": "17042060",
      "name": "TEHNOSTRADE S.R.L."
     },
     "valueRon": "4940170423.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ],
   "older": [
    {
     "id": "2137333",
     "contractNo": "101/1888",
     "contractDate": "2025-03-31",
     "noticeNo": "CAN1145385",
     "title": null,
     "supplier": {
      "cui": "17042060",
      "name": "TEHNOSTRADE S.R.L."
     },
     "valueRon": "6142792901.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ]
  }
 },
 "acord-cadru": {
  "label": "Spitalul Caracal, medicamente — un lot dintr-un acord-cadru",
  "contract": {
   "id": "51214497",
   "contractNo": "364.30",
   "contractDate": "2025-06-30",
   "noticeNo": "CAN1150526",
   "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
   "supplier": {
    "cui": "22082443",
    "name": "ND PHARMA S.R.L.",
    "displayName": "ND PHARMA S.R.L."
   },
   "valueRon": "34464.00",
   "currency": "RON",
   "valueState": "ambiguous_grain",
   "valueStateRule": "framework_guard",
   "valueAccepted": false,
   "recordKind": "framework_agreement",
   "displayTitle": {
    "text": "ACORD CADRU FURNIZARE MEDICAMENTE",
    "source": "native",
    "sourceUrl": "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100608344"
   },
   "authority": {
    "cui": "4395086",
    "name": "SPITALUL MUNICIPAL CARACAL",
    "displayName": "SPITALUL MUNICIPAL CARACAL"
   },
   "cpvCode": "33600000",
   "estimatedValueRon": null,
   "sourceSystem": "elicitatie_ca_award",
   "sourceUrl": "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100608344",
   "valueComparable": null,
   "modifications": []
  },
  "procedure": {
   "id": "352140",
   "noticeNo": "CAN1150526",
   "procedureType": "Licitatie deschisa",
   "title": "Acord-cadru 48 de luni furnizare Produse farmaceutice (medicamente pentru tract digestiv, dermatologie, sistem genito-urinar si altele)",
   "authorityCui": "4395086",
   "estimatedValueRon": "557085.90",
   "awardedValueRon": "557085.90",
   "cpvCode": "33600000",
   "publicationDate": null
  },
  "ted": {
   "tedNoticeNo": "101124-2026",
   "sourceUrl": "https://ted.europa.eu/en/notice/101124-2026/xml"
  },
  "duplicates": [],
  "notice": {
   "total": 110,
   "rows": [
    {
     "id": "2673742",
     "contractNo": "604",
     "contractDate": "2025-12-11",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "3596251",
      "name": "DONA. LOGISTICA"
     },
     "valueRon": "4860.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2673697",
     "contractNo": "386",
     "contractDate": "2025-10-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "3024756",
      "name": "FELSIN FARM"
     },
     "valueRon": "57969.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2673779",
     "contractNo": "474",
     "contractDate": "2025-08-09",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "8955860",
      "name": "ALLIANCE HEALTHCARE ROMANIA"
     },
     "valueRon": "94800.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2673766",
     "contractNo": "380",
     "contractDate": "2025-08-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "11653560",
      "name": "COMPANIA NATIONALA UNIFARM"
     },
     "valueRon": "76944.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2673656",
     "contractNo": "379",
     "contractDate": "2025-08-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "335278",
      "name": "FARMEXIM S.A."
     },
     "valueRon": "7030.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2673686",
     "contractNo": "506",
     "contractDate": "2025-07-10",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "8955860",
      "name": "ALLIANCE HEALTHCARE ROMANIA"
     },
     "valueRon": "61440.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2673693",
     "contractNo": "376",
     "contractDate": "2025-07-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "9378655",
      "name": "DR.MAX"
     },
     "valueRon": "101364.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2673689",
     "contractNo": "378",
     "contractDate": "2025-07-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "3596251",
      "name": "DONA. LOGISTICA"
     },
     "valueRon": "12432.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2673668",
     "contractNo": "377",
     "contractDate": "2025-07-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "22082443",
      "name": "ND PHARMA S.R.L."
     },
     "valueRon": "17160.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2673660",
     "contractNo": "375",
     "contractDate": "2025-07-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "8955860",
      "name": "ALLIANCE HEALTHCARE ROMANIA"
     },
     "valueRon": "115509.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "51214497",
     "contractNo": "364.30",
     "contractDate": "2025-06-30",
     "noticeNo": "CAN1150526",
     "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
     "supplier": {
      "cui": "22082443",
      "name": "ND PHARMA S.R.L."
     },
     "valueRon": "34464.00",
     "currency": "RON",
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "51214496",
     "contractNo": "364.20",
     "contractDate": "2025-06-30",
     "noticeNo": "CAN1150526",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "supplier": {
      "cui": "3596251",
      "name": "DONA. LOGISTICA"
     },
     "valueRon": "19200.00",
     "currency": "RON",
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "51214472",
     "contractNo": "364.10",
     "contractDate": "2025-06-30",
     "noticeNo": "CAN1150526",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "supplier": {
      "cui": "22082443",
      "name": "ND PHARMA S.R.L."
     },
     "valueRon": "16632.00",
     "currency": "RON",
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "51214453",
     "contractNo": "364.40",
     "contractDate": "2025-06-30",
     "noticeNo": "CAN1150526",
     "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
     "supplier": {
      "cui": "335278",
      "name": "FARMEXIM S.A."
     },
     "valueRon": "273600.00",
     "currency": "RON",
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2673722",
     "contractNo": "627",
     "contractDate": "2025-03-12",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "8955860",
      "name": "ALLIANCE HEALTHCARE ROMANIA"
     },
     "valueRon": "559.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2673770",
     "contractNo": "623",
     "contractDate": "2025-02-12",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "13591928",
      "name": "Pharma"
     },
     "valueRon": "2688.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321073",
     "contractNo": "364.9",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "13591928",
      "name": "Pharma"
     },
     "valueRon": "6316.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321072",
     "contractNo": "364.9",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "9378655",
      "name": "DR.MAX"
     },
     "valueRon": "6316.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321071",
     "contractNo": "364.9",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "3596251",
      "name": "DONA. LOGISTICA"
     },
     "valueRon": "6316.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321070",
     "contractNo": "364.7",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "3024756",
      "name": "FELSIN FARM"
     },
     "valueRon": "36000.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321069",
     "contractNo": "364.7",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "3596251",
      "name": "DONA. LOGISTICA"
     },
     "valueRon": "36000.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321068",
     "contractNo": "364.7",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "8955860",
      "name": "ALLIANCE HEALTHCARE ROMANIA"
     },
     "valueRon": "36000.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321067",
     "contractNo": "364.6",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "9378655",
      "name": "DR.MAX"
     },
     "valueRon": "357840.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321066",
     "contractNo": "364.6",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "1199107",
      "name": "BIOEEL"
     },
     "valueRon": "357840.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321065",
     "contractNo": "364.6",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "8955860",
      "name": "ALLIANCE HEALTHCARE ROMANIA"
     },
     "valueRon": "357840.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321064",
     "contractNo": "364.5",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "13591928",
      "name": "Pharma"
     },
     "valueRon": "2486.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321063",
     "contractNo": "364.5",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "22082443",
      "name": "ND PHARMA S.R.L."
     },
     "valueRon": "2486.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321062",
     "contractNo": "364.5",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "9378655",
      "name": "DR.MAX"
     },
     "valueRon": "2486.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321061",
     "contractNo": "364.43",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "13591928",
      "name": "Pharma"
     },
     "valueRon": "268560.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321060",
     "contractNo": "364.42",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "11653560",
      "name": "COMPANIA NATIONALA UNIFARM"
     },
     "valueRon": "17952.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321059",
     "contractNo": "364.41",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "5919650",
      "name": "Prisum Healthcare"
     },
     "valueRon": "615360.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321058",
     "contractNo": "364.41",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "335278",
      "name": "FARMEXIM S.A."
     },
     "valueRon": "615360.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321057",
     "contractNo": "364.41",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "11653560",
      "name": "COMPANIA NATIONALA UNIFARM"
     },
     "valueRon": "615360.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321056",
     "contractNo": "364.4",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "335278",
      "name": "FARMEXIM S.A."
     },
     "valueRon": "273600.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321055",
     "contractNo": "364.4",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "9378655",
      "name": "DR.MAX"
     },
     "valueRon": "273600.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321054",
     "contractNo": "364.4",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "8955860",
      "name": "ALLIANCE HEALTHCARE ROMANIA"
     },
     "valueRon": "273600.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321053",
     "contractNo": "364.39",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "3572074",
      "name": "FARMACEUTICA REMEDIA DISTRIBUTION & LOGISTICS S.R.L."
     },
     "valueRon": "927120.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321052",
     "contractNo": "364.39",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "9378655",
      "name": "DR.MAX"
     },
     "valueRon": "927120.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321051",
     "contractNo": "364.39",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "8955860",
      "name": "ALLIANCE HEALTHCARE ROMANIA"
     },
     "valueRon": "927120.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321050",
     "contractNo": "364.38",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "22082443",
      "name": "ND PHARMA S.R.L."
     },
     "valueRon": "20160.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321049",
     "contractNo": "364.38",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "8955860",
      "name": "ALLIANCE HEALTHCARE ROMANIA"
     },
     "valueRon": "20160.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321048",
     "contractNo": "364.37",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "335278",
      "name": "FARMEXIM S.A."
     },
     "valueRon": "19152.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321047",
     "contractNo": "364.37",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "3572074",
      "name": "FARMACEUTICA REMEDIA DISTRIBUTION & LOGISTICS S.R.L."
     },
     "valueRon": "19152.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321046",
     "contractNo": "364.37",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "8955860",
      "name": "ALLIANCE HEALTHCARE ROMANIA"
     },
     "valueRon": "19152.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321045",
     "contractNo": "364.36",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "13591928",
      "name": "Pharma"
     },
     "valueRon": "528.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321044",
     "contractNo": "364.36",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "3024756",
      "name": "FELSIN FARM"
     },
     "valueRon": "528.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321043",
     "contractNo": "364.36",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "9378655",
      "name": "DR.MAX"
     },
     "valueRon": "528.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321042",
     "contractNo": "364.35",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "9378655",
      "name": "DR.MAX"
     },
     "valueRon": "583200.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321041",
     "contractNo": "364.35",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "3596251",
      "name": "DONA. LOGISTICA"
     },
     "valueRon": "583200.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321040",
     "contractNo": "364.34",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "3024756",
      "name": "FELSIN FARM"
     },
     "valueRon": "468000.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321039",
     "contractNo": "364.34",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "1199107",
      "name": "BIOEEL"
     },
     "valueRon": "468000.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321038",
     "contractNo": "364.34",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "8955860",
      "name": "ALLIANCE HEALTHCARE ROMANIA"
     },
     "valueRon": "468000.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321037",
     "contractNo": "364.33",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "22082443",
      "name": "ND PHARMA S.R.L."
     },
     "valueRon": "2928.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321036",
     "contractNo": "364.32",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "335278",
      "name": "FARMEXIM S.A."
     },
     "valueRon": "124320.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321035",
     "contractNo": "364.32",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "1199107",
      "name": "BIOEEL"
     },
     "valueRon": "124320.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321034",
     "contractNo": "364.32",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "8955860",
      "name": "ALLIANCE HEALTHCARE ROMANIA"
     },
     "valueRon": "124320.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321033",
     "contractNo": "364.3",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "22082443",
      "name": "ND PHARMA S.R.L."
     },
     "valueRon": "34464.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321032",
     "contractNo": "364.3",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "9378655",
      "name": "DR.MAX"
     },
     "valueRon": "34464.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321031",
     "contractNo": "364.3",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "22082443",
      "name": "ND PHARMA S.R.L."
     },
     "valueRon": "17568.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2321030",
     "contractNo": "364.3",
     "contractDate": "2025-01-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "335278",
      "name": "FARMEXIM S.A."
     },
     "valueRon": "17568.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    }
   ]
  },
  "names": {
   "labels": [
    [
     "4395086",
     "SPITALUL MUNICIPAL CARACAL"
    ],
    [
     "22082443",
     "ND PHARMA SRL"
    ],
    [
     "3596251",
     "DONA. LOGISTICA S.A."
    ],
    [
     "3024756",
     "FELSIN FARM SRL"
    ],
    [
     "8955860",
     "ALLIANCE HEALTHCARE ROMANIA S.R.L."
    ],
    [
     "11653560",
     "COMPANIA NATIONALA UNIFARM SA"
    ],
    [
     "335278",
     "FARMEXIM SA"
    ],
    [
     "9378655",
     "SENSIBLU SRL"
    ],
    [
     "13591928",
     "PHARMA SA"
    ],
    [
     "1199107",
     "BIO EEL SRL"
    ],
    [
     "5919650",
     "PRISUM HEALTHCARE S.R.L."
    ],
    [
     "3572074",
     "FARMACEUTICA REMEDIA DISTRIBUTION & LOGISTICS S.R.L."
    ]
   ],
   "entity": {
    "organization": {
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "territory": {
     "kind": "municipality",
     "name": "MUNICIPIUL CARACAL",
     "countyCode": "OT",
     "countyName": "OLT"
    },
    "reference": {
     "name": "SPITALUL MUNICIPAL CARACAL",
     "address": "Olt, Municipiul Caracal, STRADA PLEVNEI, Numar 36, Bloc/Scara , Sector , Cod postal 235200",
     "entityType": "health",
     "isTerritorialExecutive": false
    },
    "budget": {
     "presence": true
    }
   }
  },
  "cpv": [
   {
    "code": "33600000",
    "ro": "Produse farmaceutice",
    "en": "Pharmaceutical products"
   }
  ],
  "source": {
   "caNoticeId": "100608344",
   "callNotice": {
    "no": "CN1078907",
    "date": "2025-03-14"
   },
   "awardNoticeDate": "2025-07-15",
   "awardNoticeVersions": [
    "2025-07-15",
    "2026-02-12"
   ],
   "authorityType": "Autoritatea regională sau locală",
   "contractType": "Furnizare",
   "totalEstimate": {
    "value": 557085.9,
    "currency": "Leu"
   },
   "offerSpread": {
    "lowest": 4486968,
    "highest": 5172302.4
   },
   "frameworkValue": 4680134.4,
   "plan": {
    "name": "Acord-cadru 48 de luni furnizare  Produse farmaceutice (medicamente pentru tract digestiv,  dermatologie, sistem genito-urinar si altele)",
    "value": 557085.9
   },
   "annexD": {
    "explanation": null,
    "forceMajeure": false,
    "noOffers": false,
    "uniqueOfferer": null,
    "repetition": false,
    "supplementary": false
   },
   "lotsTotal": 44,
   "lots": [
    {
     "no": "44",
     "title": "NATRII CHLORIDUM 5,85%",
     "estimate": 32832,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Anulat"
    },
    {
     "no": "27",
     "title": "METHYLPREDNISOLONUM ACEPONAT",
     "estimate": 40348.8,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Anulat"
    },
    {
     "no": "8",
     "title": "TRIMEBUTINUM\t24 mg/5ml",
     "estimate": 15264,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Anulat"
    },
    {
     "no": "4",
     "title": "INSULINE UMANE (HUMULIN R SAU ECHIVALENT )",
     "estimate": 13416,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Anulat"
    },
    {
     "no": "18",
     "title": "COMBINATII (TRIDERM)",
     "estimate": 1248,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Anulat"
    },
    {
     "no": "1",
     "title": "ACIDUM ASCORBICUM",
     "estimate": 358560,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Anulat"
    },
    {
     "no": "31",
     "title": "VALACYCLOVIRUM \t500 mg\tcp",
     "estimate": 5597.76,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Anulat"
    },
    {
     "no": "26",
     "title": "KETOPROFENUM\t100 mg\tcaps",
     "estimate": 25440,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "14",
     "title": "CHLORZOXAZONUM\t250 mg\tcp",
     "estimate": 32640,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "17",
     "title": "COMBINATII (NEOPREOL) UNGUENT",
     "estimate": 24000,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "19",
     "title": "COMBINATII (BETAMETHASONUM + CLOTRIMAZOL UM + GENTAMICINUM)(TRESY) - crema",
     "estimate": 10260,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "15",
     "title": "COMBINATII (FLUOCINOLONUM + NEOMICINUM) - FLUOCINOLON N",
     "estimate": 11011.2,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "16",
     "title": "COMBINATII (BEPANTHEN\tcrema",
     "estimate": 43200,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "30",
     "title": "OXIMED SPRAY CUTANAT\t59.5 g\ttub",
     "estimate": 36480,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "22",
     "title": "DICLOFENACUM\t100 mg",
     "estimate": 6120,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "34",
     "title": "HYDROCORTISONUM \t100 mg \tflacon",
     "estimate": 483840,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "10",
     "title": "ACICLOVIRUM\t400 mg\tcpr",
     "estimate": 16848,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "13",
     "title": "COMBINATII (ACIDUM FUSIDICUM+ HYDROCORTISONUM) (FUCIDIN H)\t20 mg/10 mg - crema\ttub x 15g",
     "estimate": 19152,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "12",
     "title": "COMBINATII (ACIDUM FUSIDICUM+ BETAMETHASONUM) (FUCICORT)",
     "estimate": 25132.8,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "28",
     "title": "MOMETASONUM - crema",
     "estimate": 7444.8,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "5",
     "title": "METOCLOPRAMIDUM\t10mg",
     "estimate": 2496,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "21",
     "title": "DEXKETOPROFENUM\t50 mg/2 ml",
     "estimate": 168960,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "36",
     "title": "PREDNISONUM\t5 mg",
     "estimate": 624,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "35",
     "title": "HYDROCORTISONUM \t19.6 mg/5ml\tfiola x 5 ml",
     "estimate": 645600,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "23",
     "title": "DICLOFENACUM\t75 mg/3ml",
     "estimate": 185040,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "2",
     "title": "COMBINATII (Clorhidrat de piridoxină, acid D,L-aspartic ) ASPATOFORT",
     "estimate": 348480,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "20",
     "title": "DEXKETOPROFENUM\t25 mg\tcp",
     "estimate": 19200,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "9",
     "title": "ACICLOVIRUM CREMA\t50 mg/g - 5 g\ttub",
     "estimate": 7161.6,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "25",
     "title": "KETOPROFENUM\t100 mg/2 ml\tf x 2 ml",
     "estimate": 25920,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "7",
     "title": "OMEPRAZOLUM\t20 mg\tcp",
     "estimate": 115200,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "3",
     "title": "FAMOTIDINUM\t20 mg",
     "estimate": 18720,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "24",
     "title": "IBUPROFENUM",
     "estimate": 86640,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "29",
     "title": "NEOSTIGMINI METILSULFAS",
     "estimate": 30240,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "40",
     "title": "ACETYLCYSTEINUM\t300 mg/3 ml\tfiola",
     "estimate": 288720,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "43",
     "title": "COMBINATII (SOLUTIE PERFUZABILA RINGER)\t500 ml\tfl",
     "estimate": 270720,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "41",
     "title": "ALBUMINUM HUMANUM",
     "estimate": 652800,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "42",
     "title": "CARBETOCINUM",
     "estimate": 17952,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "6",
     "title": "OMEPRAZOLUM\t40 mg pulb. pt. sol. perf. \tflacon",
     "estimate": 1149840,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "37",
     "title": "CEFAZOLINUM \t1 g\tfl",
     "estimate": 35712,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    },
    {
     "no": "33",
     "title": "SULFADIAZINUM (REGEN-AG)\tcrema - \ttub x 50 g",
     "estimate": 2688,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    }
   ],
   "contract": {
    "framework": "Acord-cadru",
    "startDate": "2025-07-01",
    "offers": {
     "received": 2,
     "sme": 1,
     "eu": 0,
     "nonEu": 0,
     "electronic": 2
    },
    "lotOffers": [
     {
      "no": "30",
      "admitted": 2,
      "unaccepted": 0,
      "nonconformed": 0,
      "withdrawn": 0
     }
    ],
    "estimate": 36480,
    "value": 34464,
    "currency": "RON",
    "ronValue": 34464,
    "rate": 1,
    "subcontracting": null,
    "modified": 0,
    "winners": [
     {
      "name": "ND PHARMA S.R.L.",
      "cui": "22082443",
      "sme": true,
      "city": "Bacau",
      "county": "Bacau"
     },
     {
      "name": "DR.MAX",
      "cui": "9378655",
      "sme": false,
      "city": "Mogosoaia",
      "county": "Ilfov"
     }
    ]
   },
   "contractsInNotice": 51
  },
  "context": {
   "year": 2025,
   "awards": [
    {
     "year": 2021,
     "value": 7
    },
    {
     "year": 2022,
     "value": 9
    }
   ],
   "frameworks": [
    {
     "year": 2020,
     "value": 19
    },
    {
     "year": 2021,
     "value": 8
    },
    {
     "year": 2023,
     "value": 2
    },
    {
     "year": 2024,
     "value": 17
    },
    {
     "year": 2025,
     "value": 41
    }
   ],
   "direct": [
    {
     "year": 2020,
     "value": 4,
     "lei": 10030.5
    },
    {
     "year": 2021,
     "value": 6,
     "lei": 3992.66
    },
    {
     "year": 2022,
     "value": 11,
     "lei": 3865.55
    },
    {
     "year": 2023,
     "value": 6,
     "lei": 19650
    },
    {
     "year": 2024,
     "value": 4,
     "lei": 1555
    },
    {
     "year": 2025,
     "value": 14,
     "lei": 3800.18
    },
    {
     "year": 2026,
     "value": 7,
     "lei": 1835
    }
   ],
   "pairYear": {
    "count": 0,
    "withValue": 0,
    "value": null
   },
   "buyer": {
    "awards": {
     "count": 27,
     "withValue": 20,
     "value": 5420155.66
    },
    "frameworks": {
     "count": 421,
     "withValue": 0,
     "value": null
    },
    "firms": {
     "parties": 20,
     "more": false,
     "count": 0
    }
   },
   "seller": {
    "awards": {
     "count": 165,
     "withValue": 30,
     "value": 154965.85
    },
    "clients": {
     "parties": 39,
     "more": false,
     "count": 0
    }
   },
   "records": 102,
   "newer": [
    {
     "id": "51214497",
     "contractNo": "364.30",
     "contractDate": "2025-06-30",
     "noticeNo": "CAN1150526",
     "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
     "supplier": {
      "cui": "22082443",
      "name": "ND PHARMA S.R.L."
     },
     "valueRon": "34464.00",
     "currency": "RON",
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "51214472",
     "contractNo": "364.10",
     "contractDate": "2025-06-30",
     "noticeNo": "CAN1150526",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "supplier": {
      "cui": "22082443",
      "name": "ND PHARMA S.R.L."
     },
     "valueRon": "16632.00",
     "currency": "RON",
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2673668",
     "contractNo": "377",
     "contractDate": "2025-07-07",
     "noticeNo": "CAN1150526",
     "title": null,
     "supplier": {
      "cui": "22082443",
      "name": "ND PHARMA S.R.L."
     },
     "valueRon": "17160.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2675225",
     "contractNo": "512",
     "contractDate": "2025-07-10",
     "noticeNo": "CAN1134287",
     "title": null,
     "supplier": {
      "cui": "22082443",
      "name": "ND PHARMA S.R.L."
     },
     "valueRon": "675.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    }
   ],
   "older": [
    {
     "id": "51214497",
     "contractNo": "364.30",
     "contractDate": "2025-06-30",
     "noticeNo": "CAN1150526",
     "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
     "supplier": {
      "cui": "22082443",
      "name": "ND PHARMA S.R.L."
     },
     "valueRon": "34464.00",
     "currency": "RON",
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "51214472",
     "contractNo": "364.10",
     "contractDate": "2025-06-30",
     "noticeNo": "CAN1150526",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "supplier": {
      "cui": "22082443",
      "name": "ND PHARMA S.R.L."
     },
     "valueRon": "16632.00",
     "currency": "RON",
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2251769",
     "contractNo": "321.6",
     "contractDate": "2025-06-10",
     "noticeNo": "CAN1148929",
     "title": null,
     "supplier": {
      "cui": "22082443",
      "name": "ND PHARMA S.R.L."
     },
     "valueRon": "3456.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    },
    {
     "id": "2251751",
     "contractNo": "321.41",
     "contractDate": "2025-06-10",
     "noticeNo": "CAN1148929",
     "title": null,
     "supplier": {
      "cui": "22082443",
      "name": "ND PHARMA S.R.L."
     },
     "valueRon": "16128.00",
     "currency": null,
     "valueState": "ambiguous_grain",
     "valueStateRule": "framework_guard",
     "valueAccepted": false,
     "recordKind": "framework_agreement"
    }
   ]
  }
 },
 "subsecvent": {
  "label": "Ministerul Transporturilor — contract subsecvent",
  "contract": {
   "id": "51237886",
   "contractNo": "4",
   "contractDate": "2025-12-31",
   "noticeNo": "CAN1162487",
   "title": "Contract subsecvent nr.4 la Acordul- cadru nr.16913/27.05.2025",
   "supplier": {
    "cui": "14893410",
    "name": "GRUP EXPLOATARE SI INTRETINERE PALAT CFR S.A.",
    "displayName": "GRUP EXPLOATARE SI INTRETINERE PALAT CFR S.A."
   },
   "valueRon": "26996.63",
   "currency": "RON",
   "valueState": "official_exact",
   "valueStateRule": "own_value",
   "valueAccepted": true,
   "recordKind": "contract_award",
   "displayTitle": {
    "text": "Contract subsecvent nr.4 la Acordul- cadru nr.16913/27.05.2025",
    "source": "native",
    "sourceUrl": "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100608219"
   },
   "authority": {
    "cui": "13633330",
    "name": "Ministerul Transporturilor și Infrastructurii",
    "displayName": "Ministerul Transporturilor și Infrastructurii"
   },
   "cpvCode": "50721000",
   "estimatedValueRon": null,
   "sourceSystem": "elicitatie_ca_award",
   "sourceUrl": "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100608219",
   "valueComparable": "26996.63",
   "modifications": []
  },
  "procedure": {
   "id": "352065",
   "noticeNo": "CAN1162487",
   "procedureType": "Negociere fara publicare prealabila",
   "title": "Contract subsecvent nr.4 la Acordul- cadru nr.16913/27.05.2025",
   "authorityCui": "13633330",
   "estimatedValueRon": "26996.63",
   "awardedValueRon": "26996.63",
   "cpvCode": "50721000",
   "publicationDate": null
  },
  "ted": null,
  "duplicates": [],
  "notice": {
   "total": 1,
   "rows": [
    {
     "id": "51237886",
     "contractNo": "4",
     "contractDate": "2025-12-31",
     "noticeNo": "CAN1162487",
     "title": "Contract subsecvent nr.4 la Acordul- cadru nr.16913/27.05.2025",
     "supplier": {
      "cui": "14893410",
      "name": "GRUP EXPLOATARE SI INTRETINERE PALAT CFR S.A."
     },
     "valueRon": "26996.63",
     "currency": "RON",
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ]
  },
  "names": {
   "labels": [
    [
     "13633330",
     "MINISTERUL TRANSPORTURILOR SI INFRASTRUCTURII"
    ],
    [
     "14893410",
     "Grup Exploatare si Intretinere Palat C.F.R. SA"
    ]
   ],
   "entity": {
    "organization": {
     "name": "MINISTERUL TRANSPORTURILOR SI INFRASTRUCTURII"
    },
    "territory": {
     "kind": "sector",
     "name": "SECTORUL 1",
     "countyCode": "B",
     "countyName": "MUNICIPIUL BUCUREȘTI"
    },
    "reference": {
     "name": "MINISTERUL TRANSPORTURILOR SI INFRASTRUCTURII",
     "address": "Bucuresti, Sectorul 1 al Municipiului Bucuresti, BULEVARD DINICU GOLESCU, Numar 38, Bloc/Scara , Sector 1, Cod postal 10873",
     "entityType": "central_authority",
     "isTerritorialExecutive": false
    },
    "budget": {
     "presence": true
    }
   }
  },
  "cpv": [
   {
    "code": "50721000",
    "ro": "Recondiţionarea instalaţiilor de încălzire",
    "en": "Commissioning of heating installations"
   }
  ],
  "source": {
   "caNoticeId": "100608219",
   "callNotice": null,
   "awardNoticeDate": "2026-02-10",
   "awardNoticeVersions": [
    "2026-02-10"
   ],
   "authorityType": "Minister ",
   "contractType": "Servicii",
   "totalEstimate": {
    "value": 26996.63,
    "currency": "Leu"
   },
   "offerSpread": null,
   "frameworkValue": null,
   "plan": null,
   "annexD": {
    "explanation": "Astfel procedura de achizitie a serviciilor mai sus mentionate aleasă  este cea de negociere fără publicare prealabilă în conformitate cu  art.104 alin. (1) lit. b), coroborat cu alin. (2) lit. c), “protecția unor drepturi exclusive, inclusiv drepturi de proprietate intelectuală” din Legea nr. 98/2016 privind achiziţiile publice, cu modificările și completările ulterioare,  S.C. Grup Exploatare si Întretinere Palat C.F.R. S.A. fiind singura abilitată să presteze servicii de întreţinere pentru tot Palatul CFR .",
    "forceMajeure": false,
    "noOffers": false,
    "uniqueOfferer": null,
    "repetition": false,
    "supplementary": false
   },
   "lotsTotal": 1,
   "lots": [
    {
     "no": "1",
     "title": "Lot implicit",
     "estimate": null,
     "currency": null,
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 1,
     "status": "Atribuit"
    }
   ],
   "contract": {
    "framework": "Contract de achizitii publice",
    "startDate": "2026-01-01",
    "offers": {
     "received": 1,
     "sme": 0,
     "eu": 0,
     "nonEu": 0,
     "electronic": 0
    },
    "lotOffers": [],
    "estimate": 26996.63,
    "value": 26996.63,
    "currency": "RON",
    "ronValue": 26996.63,
    "rate": 1,
    "subcontracting": null,
    "modified": 0,
    "winners": [
     {
      "name": "GRUP EXPLOATARE SI INTRETINERE PALAT CFR S.A.",
      "cui": "14893410",
      "sme": false,
      "city": "Bucuresti",
      "county": "Bucuresti"
     }
    ]
   },
   "contractsInNotice": 1
  },
  "context": {
   "year": 2025,
   "awards": [
    {
     "year": 2019,
     "value": 5
    },
    {
     "year": 2020,
     "value": 2
    },
    {
     "year": 2021,
     "value": 1
    },
    {
     "year": 2022,
     "value": 1
    },
    {
     "year": 2024,
     "value": 5
    },
    {
     "year": 2025,
     "value": 5
    }
   ],
   "frameworks": [],
   "direct": [],
   "pairYear": {
    "count": 5,
    "withValue": 5,
    "value": 474223.46
   },
   "buyer": {
    "awards": {
     "count": 26,
     "withValue": 18,
     "value": 50191838.28
    },
    "frameworks": {
     "count": 6,
     "withValue": 0,
     "value": null
    },
    "firms": {
     "parties": 14,
     "more": false,
     "count": 5
    }
   },
   "seller": {
    "awards": {
     "count": 6,
     "withValue": 6,
     "value": 4974100.34
    },
    "clients": {
     "parties": 2,
     "more": false,
     "count": 5
    }
   },
   "records": 19,
   "newer": [
    {
     "id": "51237886",
     "contractNo": "4",
     "contractDate": "2025-12-31",
     "noticeNo": "CAN1162487",
     "title": "Contract subsecvent nr.4 la Acordul- cadru nr.16913/27.05.2025",
     "supplier": {
      "cui": "14893410",
      "name": "GRUP EXPLOATARE SI INTRETINERE PALAT CFR S.A."
     },
     "valueRon": "26996.63",
     "currency": "RON",
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ],
   "older": [
    {
     "id": "51237886",
     "contractNo": "4",
     "contractDate": "2025-12-31",
     "noticeNo": "CAN1162487",
     "title": "Contract subsecvent nr.4 la Acordul- cadru nr.16913/27.05.2025",
     "supplier": {
      "cui": "14893410",
      "name": "GRUP EXPLOATARE SI INTRETINERE PALAT CFR S.A."
     },
     "valueRon": "26996.63",
     "currency": "RON",
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "51224593",
     "contractNo": "3",
     "contractDate": "2025-07-27",
     "noticeNo": "CAN1154633",
     "title": "Contract subsecvent nr.3 la Acordul-cadru nr.16913/27.05.2025",
     "supplier": {
      "cui": "14893410",
      "name": "GRUP EXPLOATARE SI INTRETINERE PALAT CFR S.A."
     },
     "valueRon": "111764.65",
     "currency": "RON",
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "51289571",
     "contractNo": "2",
     "contractDate": "2025-06-30",
     "noticeNo": "CAN1150080",
     "title": "Contract subsecvent nr.2 la Acordul-cadru nr.16913/27.05.2025",
     "supplier": {
      "cui": "14893410",
      "name": "GRUP EXPLOATARE SI INTRETINERE PALAT CFR S.A."
     },
     "valueRon": "23529.41",
     "currency": "RON",
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "48759368",
     "contractNo": "1",
     "contractDate": "2025-05-29",
     "noticeNo": "CAN1148846",
     "title": "Contract subsecvent nr.1 la acordul-cadru nr.16913 /27.05.2025 privind serviciile de întreținere a spațiilor utilizate de Ministerul Transporturilor și Infrastructurii în clădirea PALAT CFR",
     "supplier": {
      "cui": "14893410",
      "name": "GRUP EXPLOATARE SI INTRETINERE PALAT CFR S.A."
     },
     "valueRon": "23529.41",
     "currency": "RON",
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ]
  }
 },
 "acte-aditionale": {
  "label": "CNI — acte adiționale: 8,45 → 181,27 mil. lei",
  "contract": {
   "id": "1745168",
   "contractNo": "1065",
   "contractDate": "2021-12-07",
   "noticeNo": "SCNA1063044",
   "title": null,
   "supplier": {
    "cui": "18146760",
    "name": "MASTERCLASS AG",
    "displayName": "MASTERCLASS AG"
   },
   "valueRon": "8451291.00",
   "currency": null,
   "valueState": "official_exact",
   "valueStateRule": "own_value",
   "valueAccepted": true,
   "recordKind": "contract_award",
   "displayTitle": {
    "text": "Proiectare – faza adaptare la amplasament, executie lucrari si asistenta tehnica din partea proiectantului, aferente obiectivului de investitii – „Bazin de inot didactic, Str. Tineretului si Sf. Andrei, nr. 70-22, sat. Sanandrei, comuna Sanandrei, judetul Timis\"",
    "source": "matched_award",
    "sourceUrl": "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100625175"
   },
   "authority": {
    "cui": "14273221",
    "name": "COMPANIA NATIONALA DE INVESTITII SA",
    "displayName": "COMPANIA NATIONALA DE INVESTITII SA"
   },
   "cpvCode": "45200000",
   "estimatedValueRon": null,
   "sourceSystem": "seap_contracts",
   "sourceUrl": "https://data.gov.ro/dataset/ed84773a-06c6-4016-ad59-8f1d06b8ec1d/resource/c5f1fefc-7940-47ff-ac08-8783ea6484cf/download/datagov-raport-contracte-publicate-t-ii-2024.csv",
   "valueComparable": "8451291.00",
   "modifications": [
    {
     "id": "47228",
     "date": "2024-09-04",
     "before": null,
     "after": null,
     "delta": "8451291.00",
     "text": "Prin actul aditional nr. 3/18.04.2023 se modifica termenul de finalizare a lucrarilor pana la data de 14.10.2023. Decalarea termenului de finalizare a lucrarilor este de 70 zile calendaristice pana la data de 14.10.2023.",
     "contractNo": "1065"
    },
    {
     "id": "59361",
     "date": "2025-05-19",
     "before": "8451291.18",
     "after": "180260321.90",
     "delta": "171809030.72",
     "text": "Actul aditional nr. 5./08.04.2024  incheiat in baza art. 221, alin. (1), lit. a) si e) din Legea 98/2016, pretul se majoreaza cu suma de 1.809.030,69 lei (exclusiv TVA), conform devizului oferta, insusit de CNI-SA, parte integranta din contract.",
     "contractNo": "1065"
    },
    {
     "id": "68652",
     "date": null,
     "before": "180260321.90",
     "after": "180232112.50",
     "delta": "-28209.40",
     "text": "Actul aditional nr. 6./09.05.2025  incheiat in baza art. 221, alin. (1), lit. f) din Legea 98/2016, pretul platibil anteprenorului se diminueaza  cu suma de 28.209,34 lei (exclusiv TVA), conform devizului oferta, insusit de CNI-SA, parte integranta din contract.",
     "contractNo": "1065"
    },
    {
     "id": "68656",
     "date": null,
     "before": "180232112.50",
     "after": "181271655.50",
     "delta": "1039543.00",
     "text": "Actul aditional nr. 7/30.09.2025, incheiat in baza art. 221, alin. (1), lit. a) si e) din Legea 98/2016, pretul platibil antreprenorului se majoreaza cu suma de 1.039.543,01 lei (exclusiv TVA), conform devizului oferta, insusit de CNI-SA, parte integranta din contract.",
     "contractNo": "1065"
    },
    {
     "id": "68671",
     "date": null,
     "before": "181271655.50",
     "after": "181271655.50",
     "delta": "0.00",
     "text": "Actul aditional nr. 9/28.11.2025 incheiat in baza art. 221, alin. (1), lit. e) din Legea 98/2016, pretul platibil antreprenorului se majoreaza cu suma de 2.302,40 lei  - reprezentand ajustarea valorii contractului generata de modificarea cotei standard a taxei pe valoare adaugata, de la 19% la 21% aplicabila cu 01.08.2025 pentru restul ramas de executat.",
     "contractNo": "1065"
    },
    {
     "id": "1823040",
     "date": null,
     "before": null,
     "after": null,
     "delta": "8451291.00",
     "text": "Prin actul aditional nr. 2/13.03.2023, se modifica termenul de finalizare a lucrarilor pana la data de 05.08.2023. Decalarea termenului de finalizare a lucrarilor este de 56 zile calendaristice pana la data de 05.08.2023",
     "contractNo": "1065"
    }
   ]
  },
  "procedure": {
   "id": "361648",
   "noticeNo": "SCNA1063044",
   "procedureType": "Procedura simplificata",
   "title": "Proiectare – faza adaptare la amplasament, executie lucrari si asistenta tehnica din partea proiectantului, aferente obiectivului de investitii – „Bazin de inot didactic, Str. Tineretului si Sf. Andrei, nr. 70-22, sat. Sanandrei, comuna Sanandrei, judetul Timis\"",
   "authorityCui": "14273221",
   "estimatedValueRon": "181887293.77",
   "awardedValueRon": "181887293.77",
   "cpvCode": "45200000",
   "publicationDate": null
  },
  "ted": null,
  "duplicates": [],
  "notice": {
   "total": 9,
   "rows": [
    {
     "id": "2188063",
     "contractNo": "1065",
     "contractDate": "2021-12-07",
     "noticeNo": "SCNA1063044",
     "title": null,
     "supplier": {
      "cui": "34570049",
      "name": "PROJECT OFFICE STUDIO"
     },
     "valueRon": "180260321.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2188062",
     "contractNo": "1065",
     "contractDate": "2021-12-07",
     "noticeNo": "SCNA1063044",
     "title": null,
     "supplier": {
      "cui": "4880340874",
      "name": "MIGIFRA SRL"
     },
     "valueRon": "180260321.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2188061",
     "contractNo": "1065",
     "contractDate": "2021-12-07",
     "noticeNo": "SCNA1063044",
     "title": null,
     "supplier": {
      "cui": "18146760",
      "name": "MASTERCLASS AG"
     },
     "valueRon": "180260321.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "1745170",
     "contractNo": "1065",
     "contractDate": "2021-12-07",
     "noticeNo": "SCNA1063044",
     "title": null,
     "supplier": {
      "cui": "34570049",
      "name": "PROJECT OFFICE STUDIO"
     },
     "valueRon": "8451291.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "1745169",
     "contractNo": "1065",
     "contractDate": "2021-12-07",
     "noticeNo": "SCNA1063044",
     "title": null,
     "supplier": {
      "cui": null,
      "name": "MIGIFRA SRL"
     },
     "valueRon": "8451291.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "1745168",
     "contractNo": "1065",
     "contractDate": "2021-12-07",
     "noticeNo": "SCNA1063044",
     "title": null,
     "supplier": {
      "cui": "18146760",
      "name": "MASTERCLASS AG"
     },
     "valueRon": "8451291.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2637935",
     "contractNo": "1065",
     "contractDate": "2021-07-12",
     "noticeNo": "SCNA1063044",
     "title": null,
     "supplier": {
      "cui": "34570049",
      "name": "PROJECT OFFICE STUDIO"
     },
     "valueRon": "181271655.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2637934",
     "contractNo": "1065",
     "contractDate": "2021-07-12",
     "noticeNo": "SCNA1063044",
     "title": null,
     "supplier": {
      "cui": "4880340874",
      "name": "MIGIFRA SRL"
     },
     "valueRon": "181271655.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2637933",
     "contractNo": "1065",
     "contractDate": "2021-07-12",
     "noticeNo": "SCNA1063044",
     "title": null,
     "supplier": {
      "cui": "18146760",
      "name": "MASTERCLASS AG"
     },
     "valueRon": "181271655.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ]
  },
  "names": {
   "labels": [
    [
     "14273221",
     "COMPANIA NATIONALA DE INVESTITII C.N.I. SA"
    ],
    [
     "18146760",
     "MASTERCLASS AG SRL"
    ],
    [
     "34570049",
     "PROJECT OFFICE STUDIO S.R.L."
    ]
   ],
   "entity": {
    "organization": {
     "name": "COMPANIA NATIONALA DE INVESTITII C.N.I. SA"
    },
    "territory": null,
    "reference": null,
    "budget": {
     "presence": false
    }
   }
  },
  "cpv": [
   {
    "code": "45200000",
    "ro": "Lucrări de construcţii complete sau parţiale şi lucrări publice",
    "en": "Works for complete or part construction and civil engineering work"
   }
  ],
  "source": {
   "caNoticeId": "100625175",
   "callNotice": {
    "no": "SCN1075616",
    "date": "2020-09-23"
   },
   "awardNoticeDate": "2021-12-13",
   "awardNoticeVersions": [
    "2021-12-13",
    "2023-03-20",
    "2024-04-09",
    "2025-05-19",
    "2026-01-22",
    "2026-01-22",
    "2026-01-22",
    "2026-04-28",
    "2026-04-28"
   ],
   "authorityType": "Alt tip",
   "contractType": "Lucrari",
   "totalEstimate": {
    "value": 181887293.77,
    "currency": "Leu"
   },
   "offerSpread": null,
   "frameworkValue": null,
   "plan": {
    "name": "Bazin de inot didactic Str Tineretului si Sf Andrei nr 70-22 sat Sanandrei, com Sanandrei, jud Timis",
    "value": 181887293.77
   },
   "annexD": {
    "explanation": null,
    "forceMajeure": false,
    "noOffers": false,
    "uniqueOfferer": null,
    "repetition": false,
    "supplementary": false
   },
   "lotsTotal": 1,
   "lots": [
    {
     "no": "1",
     "title": "Lot implicit",
     "estimate": 8921230,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 48,
     "status": "Atribuit"
    }
   ],
   "contract": {
    "framework": "Contract de achizitii publice",
    "startDate": "2021-12-07",
    "offers": {
     "received": 5,
     "sme": 5,
     "eu": 0,
     "nonEu": 0,
     "electronic": 5
    },
    "lotOffers": [
     {
      "no": "1",
      "admitted": 2,
      "unaccepted": 3,
      "nonconformed": 0,
      "withdrawn": 0
     }
    ],
    "estimate": 8921230,
    "value": 181887293.77,
    "currency": "RON",
    "ronValue": 181887293.77,
    "rate": 1,
    "subcontracting": null,
    "modified": 8,
    "winners": [
     {
      "name": "MASTERCLASS AG",
      "cui": "18146760",
      "sme": true,
      "city": "Bucuresti",
      "county": "Bucuresti"
     },
     {
      "name": "PROJECT OFFICE STUDIO",
      "cui": "34570049",
      "sme": true,
      "city": "Bucuresti",
      "county": "Bucuresti"
     },
     {
      "name": "MIGIFRA SRL",
      "cui": "04880340874",
      "sme": true,
      "city": "NA",
      "county": "NA"
     }
    ]
   },
   "contractsInNotice": 1
  },
  "context": {
   "year": 2021,
   "awards": [
    {
     "year": 2019,
     "value": 2
    },
    {
     "year": 2020,
     "value": 4
    },
    {
     "year": 2021,
     "value": 15
    },
    {
     "year": 2022,
     "value": 5
    },
    {
     "year": 2023,
     "value": 3
    }
   ],
   "frameworks": [],
   "direct": [],
   "pairYear": {
    "count": 15,
    "withValue": 0,
    "value": null
   },
   "buyer": {
    "awards": {
     "count": 1447,
     "withValue": 235,
     "value": 1103830482.25
    },
    "frameworks": {
     "count": 0,
     "withValue": 0,
     "value": null
    },
    "firms": {
     "parties": 100,
     "more": true,
     "count": 15
    }
   },
   "seller": {
    "awards": {
     "count": 16,
     "withValue": 0,
     "value": null
    },
    "clients": {
     "parties": 2,
     "more": false,
     "count": 15
    }
   },
   "records": 30,
   "newer": [
    {
     "id": "2188061",
     "contractNo": "1065",
     "contractDate": "2021-12-07",
     "noticeNo": "SCNA1063044",
     "title": null,
     "supplier": {
      "cui": "18146760",
      "name": "MASTERCLASS AG"
     },
     "valueRon": "180260321.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "1745168",
     "contractNo": "1065",
     "contractDate": "2021-12-07",
     "noticeNo": "SCNA1063044",
     "title": null,
     "supplier": {
      "cui": "18146760",
      "name": "MASTERCLASS AG"
     },
     "valueRon": "8451291.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "24326685",
     "contractNo": "132",
     "contractDate": "2022-02-14",
     "noticeNo": "SCNA1065819",
     "title": null,
     "supplier": {
      "cui": "18146760",
      "name": "MASTERCLASS AG"
     },
     "valueRon": "5466986.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "1944032",
     "contractNo": "132",
     "contractDate": "2022-02-14",
     "noticeNo": "SCNA1065819",
     "title": null,
     "supplier": {
      "cui": "18146760",
      "name": "MASTERCLASS AG"
     },
     "valueRon": "7004998.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ],
   "older": [
    {
     "id": "2188061",
     "contractNo": "1065",
     "contractDate": "2021-12-07",
     "noticeNo": "SCNA1063044",
     "title": null,
     "supplier": {
      "cui": "18146760",
      "name": "MASTERCLASS AG"
     },
     "valueRon": "180260321.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "1745168",
     "contractNo": "1065",
     "contractDate": "2021-12-07",
     "noticeNo": "SCNA1063044",
     "title": null,
     "supplier": {
      "cui": "18146760",
      "name": "MASTERCLASS AG"
     },
     "valueRon": "8451291.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "24326692",
     "contractNo": "828",
     "contractDate": "2021-10-15",
     "noticeNo": "SCNA1060064",
     "title": null,
     "supplier": {
      "cui": "18146760",
      "name": "S.C. MASTERCLASS AG S.R.L."
     },
     "valueRon": "8992545.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "1854580",
     "contractNo": "828",
     "contractDate": "2021-10-15",
     "noticeNo": "SCNA1060064",
     "title": null,
     "supplier": {
      "cui": "18146760",
      "name": "S.C. MASTERCLASS AG S.R.L."
     },
     "valueRon": "8232515.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ]
  }
 },
 "valori": {
  "label": "CFR, stații — un contract publicat cu cinci valori",
  "contract": {
   "id": "1316942",
   "contractNo": "57",
   "contractDate": "2022-05-30",
   "noticeNo": "CAN1080039",
   "title": "Proiectare şi Execuție lucrări aferente obiectivului de investiţii ”Lucrări în stațiile C.F. Fetești și Ciulnița, de pe linia de cale ferată București – Constanța”",
   "supplier": {
    "cui": "5437520",
    "name": "ARCADA COMPANY",
    "displayName": "ARCADA COMPANY"
   },
   "valueRon": "309208853.00",
   "currency": "RON",
   "valueState": "official_exact",
   "valueStateRule": "own_value",
   "valueAccepted": true,
   "recordKind": "contract_award",
   "displayTitle": {
    "text": "Proiectare şi Execuție lucrări aferente obiectivului de investiţii ”Lucrări în stațiile C.F. Fetești și Ciulnița, de pe linia de cale ferată București – Constanța”",
    "source": "native",
    "sourceUrl": "https://data.gov.ro/dataset/51fca83b-02a5-46da-b894-5d9cac565fa2/resource/4ea3ccd1-a543-4e29-be7c-774aaa040912/download/raport-contracte-t2-2022.xls"
   },
   "authority": {
    "cui": "11054529",
    "name": "Compania Nationala de Cai Ferate \"CFR\" - SA",
    "displayName": "Compania Nationala de Cai Ferate \"CFR\" - SA"
   },
   "cpvCode": "45234100",
   "estimatedValueRon": "317369456.00",
   "sourceSystem": "seap_contracts",
   "sourceUrl": "https://data.gov.ro/dataset/51fca83b-02a5-46da-b894-5d9cac565fa2/resource/4ea3ccd1-a543-4e29-be7c-774aaa040912/download/raport-contracte-t2-2022.xls",
   "valueComparable": "309208853.00",
   "modifications": []
  },
  "procedure": {
   "id": "355434",
   "noticeNo": "CAN1080039",
   "procedureType": "Licitatie deschisa",
   "title": "Proiectare şi Execuție lucrări aferente obiectivului de investiţii „Lucrări în stațiile C.F.Fetești și Ciulnița, de pe linia de cale ferată București – Constanța”",
   "authorityCui": "11054529",
   "estimatedValueRon": "398084465.19",
   "awardedValueRon": "398084465.19",
   "cpvCode": "45234100",
   "publicationDate": null
  },
  "ted": {
   "tedNoticeNo": "174348-2026",
   "sourceUrl": "https://ted.europa.eu/en/notice/174348-2026/xml"
  },
  "duplicates": [],
  "notice": {
   "total": 10,
   "rows": [
    {
     "id": "20720886",
     "contractNo": "57",
     "contractDate": "2022-05-30",
     "noticeNo": "CAN1080039",
     "title": null,
     "supplier": {
      "cui": "1566866",
      "name": "I.S.P.C.F."
     },
     "valueRon": "3253535431.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "20720885",
     "contractNo": "57",
     "contractDate": "2022-05-30",
     "noticeNo": "CAN1080039",
     "title": null,
     "supplier": {
      "cui": "5437520",
      "name": "ARCADA COMPANY"
     },
     "valueRon": "3253535431.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2464699",
     "contractNo": "57",
     "contractDate": "2022-05-30",
     "noticeNo": "CAN1080039",
     "title": null,
     "supplier": {
      "cui": "1566866",
      "name": "I.S.P.C.F."
     },
     "valueRon": "380321829.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2464698",
     "contractNo": "57",
     "contractDate": "2022-05-30",
     "noticeNo": "CAN1080039",
     "title": null,
     "supplier": {
      "cui": "5437520",
      "name": "ARCADA COMPANY"
     },
     "valueRon": "380321829.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "1316942",
     "contractNo": "57",
     "contractDate": "2022-05-30",
     "noticeNo": "CAN1080039",
     "title": "Proiectare şi Execuție lucrări aferente obiectivului de investiţii ”Lucrări în stațiile C.F. Fetești și Ciulnița, de pe linia de cale ferată București – Constanța”",
     "supplier": {
      "cui": "5437520",
      "name": "ARCADA COMPANY"
     },
     "valueRon": "309208853.00",
     "currency": "RON",
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "1316200",
     "contractNo": "57",
     "contractDate": "2022-05-30",
     "noticeNo": "CAN1080039",
     "title": "Proiectare şi Execuție lucrări aferente obiectivului de investiţii ”Lucrări în stațiile C.F. Fetești și Ciulnița, de pe linia de cale ferată București – Constanța”",
     "supplier": {
      "cui": "1566866",
      "name": "I.S.P.C.F."
     },
     "valueRon": "309208853.00",
     "currency": "RON",
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2729725",
     "contractNo": "57",
     "contractDate": null,
     "noticeNo": "CAN1080039",
     "title": null,
     "supplier": {
      "cui": "1566866",
      "name": "I.S.P.C.F."
     },
     "valueRon": "398084465.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2729724",
     "contractNo": "57",
     "contractDate": null,
     "noticeNo": "CAN1080039",
     "title": null,
     "supplier": {
      "cui": "5437520",
      "name": "ARCADA COMPANY"
     },
     "valueRon": "398084465.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2071523",
     "contractNo": "57",
     "contractDate": null,
     "noticeNo": "CAN1080039",
     "title": null,
     "supplier": {
      "cui": "1566866",
      "name": "I.S.P.C.F."
     },
     "valueRon": "329065127.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2071522",
     "contractNo": "57",
     "contractDate": null,
     "noticeNo": "CAN1080039",
     "title": null,
     "supplier": {
      "cui": "5437520",
      "name": "ARCADA COMPANY"
     },
     "valueRon": "329065127.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ]
  },
  "names": {
   "labels": [
    [
     "11054529",
     "COMPANIA NATIONALA DE CAI FERATE CFR SA"
    ],
    [
     "5437520",
     "ARCADA COMPANY SA"
    ],
    [
     "1566866",
     "I.S.P.C.F. SA"
    ]
   ],
   "entity": {
    "organization": {
     "name": "COMPANIA NATIONALA DE CAI FERATE CFR SA"
    },
    "territory": null,
    "reference": null,
    "budget": {
     "presence": false
    }
   }
  },
  "cpv": [
   {
    "code": "45234100",
    "ro": "Lucrări de construcţii de căi ferate",
    "en": "Railway construction works"
   }
  ],
  "source": {
   "caNoticeId": "100614852",
   "callNotice": null,
   "awardNoticeDate": "2022-06-01",
   "awardNoticeVersions": [
    "2022-06-01",
    "2024-01-22",
    "2024-03-20",
    "2024-03-26",
    "2024-08-07",
    "2025-03-27",
    "2025-07-02",
    "2025-10-07",
    "2025-10-24",
    "2026-02-19",
    "2026-02-23",
    "2026-03-11",
    "2026-06-26"
   ],
   "authorityType": null,
   "contractType": null,
   "totalEstimate": null,
   "offerSpread": null,
   "frameworkValue": null,
   "plan": null,
   "annexD": {
    "explanation": null,
    "forceMajeure": false,
    "noOffers": false,
    "uniqueOfferer": null,
    "repetition": false,
    "supplementary": false
   },
   "lotsTotal": 1,
   "lots": [
    {
     "no": "1",
     "title": "Lot implicit",
     "estimate": 317369456.27,
     "currency": "Leu",
     "criterion": "Cel mai bun raport calitate – pret",
     "financing": "Program / Proiect",
     "euProgram": null,
     "days": null,
     "months": 84,
     "status": "Atribuit"
    }
   ],
   "contract": {
    "framework": "Contract de achizitii publice",
    "startDate": "2022-05-30",
    "offers": {
     "received": 2,
     "sme": 0,
     "eu": 0,
     "nonEu": 0,
     "electronic": 2
    },
    "lotOffers": [
     {
      "no": "1",
      "admitted": 1,
      "unaccepted": 1,
      "nonconformed": 0,
      "withdrawn": 0
     }
    ],
    "estimate": 317369456.27,
    "value": 398084465.19,
    "currency": "RON",
    "ronValue": 398084465.19,
    "rate": null,
    "subcontracting": null,
    "modified": 12,
    "winners": [
     {
      "name": "I.S.P.C.F.",
      "cui": "1566866",
      "sme": true,
      "city": "Bucuresti",
      "county": "Bucuresti"
     },
     {
      "name": "ARCADA COMPANY",
      "cui": "5437520",
      "sme": false,
      "city": "Galati",
      "county": "Galati"
     }
    ]
   },
   "contractsInNotice": 1
  },
  "context": {
   "year": 2022,
   "awards": [
    {
     "year": 2019,
     "value": 3
    },
    {
     "year": 2022,
     "value": 5
    },
    {
     "year": 2023,
     "value": 1
    },
    {
     "year": 2024,
     "value": 4
    },
    {
     "year": 2026,
     "value": 2
    }
   ],
   "frameworks": [
    {
     "year": 2024,
     "value": 3
    },
    {
     "year": 2025,
     "value": 1
    }
   ],
   "direct": [],
   "pairYear": {
    "count": 5,
    "withValue": 1,
    "value": 1611475802
   },
   "buyer": {
    "awards": {
     "count": 112,
     "withValue": 44,
     "value": 6726381585.39
    },
    "frameworks": {
     "count": 31,
     "withValue": 0,
     "value": null
    },
    "firms": {
     "parties": 52,
     "more": false,
     "count": 5
    }
   },
   "seller": {
    "awards": {
     "count": 6,
     "withValue": 2,
     "value": 1673293614.54
    },
    "clients": {
     "parties": 2,
     "more": false,
     "count": 5
    }
   },
   "records": 19,
   "newer": [
    {
     "id": "20720885",
     "contractNo": "57",
     "contractDate": "2022-05-30",
     "noticeNo": "CAN1080039",
     "title": null,
     "supplier": {
      "cui": "5437520",
      "name": "ARCADA COMPANY"
     },
     "valueRon": "3253535431.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2464698",
     "contractNo": "57",
     "contractDate": "2022-05-30",
     "noticeNo": "CAN1080039",
     "title": null,
     "supplier": {
      "cui": "5437520",
      "name": "ARCADA COMPANY"
     },
     "valueRon": "380321829.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "1316942",
     "contractNo": "57",
     "contractDate": "2022-05-30",
     "noticeNo": "CAN1080039",
     "title": "Proiectare şi Execuție lucrări aferente obiectivului de investiţii ”Lucrări în stațiile C.F. Fetești și Ciulnița, de pe linia de cale ferată București – Constanța”",
     "supplier": {
      "cui": "5437520",
      "name": "ARCADA COMPANY"
     },
     "valueRon": "309208853.00",
     "currency": "RON",
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2191760",
     "contractNo": "185",
     "contractDate": "2022-12-21",
     "noticeNo": "CAN1094723",
     "title": null,
     "supplier": {
      "cui": "5437520",
      "name": "ARCADA COMPANY"
     },
     "valueRon": "1535202975.00",
     "currency": null,
     "valueState": "conflicting_sources",
     "valueStateRule": "cross_disagrees",
     "valueAccepted": false,
     "recordKind": "contract_award"
    }
   ],
   "older": [
    {
     "id": "20720885",
     "contractNo": "57",
     "contractDate": "2022-05-30",
     "noticeNo": "CAN1080039",
     "title": null,
     "supplier": {
      "cui": "5437520",
      "name": "ARCADA COMPANY"
     },
     "valueRon": "3253535431.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2464698",
     "contractNo": "57",
     "contractDate": "2022-05-30",
     "noticeNo": "CAN1080039",
     "title": null,
     "supplier": {
      "cui": "5437520",
      "name": "ARCADA COMPANY"
     },
     "valueRon": "380321829.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "1316942",
     "contractNo": "57",
     "contractDate": "2022-05-30",
     "noticeNo": "CAN1080039",
     "title": "Proiectare şi Execuție lucrări aferente obiectivului de investiţii ”Lucrări în stațiile C.F. Fetești și Ciulnița, de pe linia de cale ferată București – Constanța”",
     "supplier": {
      "cui": "5437520",
      "name": "ARCADA COMPANY"
     },
     "valueRon": "309208853.00",
     "currency": "RON",
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2269705",
     "contractNo": "60",
     "contractDate": "2019-06-21",
     "noticeNo": "CAN1017938",
     "title": null,
     "supplier": {
      "cui": "5437520",
      "name": "ARCADA COMPANY"
     },
     "valueRon": "439062160.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ]
  }
 },
 "valuta": {
  "label": "Regia Stejarul, autoutilitare — valoare în euro",
  "contract": {
   "id": "51262304",
   "contractNo": "2",
   "contractDate": "2026-06-01",
   "noticeNo": "SCNA1133594",
   "title": "Contract de furnizare a 4 (patru) autoutilitare pick – up, 4x4, cabina dubla – 4 locuri, capacitate cilindrică maxim 1200 cm3",
   "supplier": {
    "cui": "6277265",
    "name": "ROMTURINGIA S.R.L.",
    "displayName": "ROMTURINGIA S.R.L."
   },
   "valueRon": "550084.72",
   "currency": "EUR",
   "valueState": "official_ron_equivalent",
   "valueStateRule": "own_value",
   "valueAccepted": true,
   "recordKind": "contract_award",
   "displayTitle": {
    "text": "Contract de furnizare a 4 (patru) autoutilitare pick – up, 4x4, cabina dubla – 4 locuri, capacitate cilindrică maxim 1200 cm3",
    "source": "native",
    "sourceUrl": "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100631627"
   },
   "authority": {
    "cui": "23550461",
    "name": "Regia Publica Locala a Padurilor Stejarul R.A.",
    "displayName": "Regia Publica Locala a Padurilor Stejarul R.A."
   },
   "cpvCode": "34113300",
   "estimatedValueRon": null,
   "sourceSystem": "elicitatie_ca_award",
   "sourceUrl": "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100631627",
   "valueComparable": "550084.72",
   "modifications": []
  },
  "procedure": {
   "id": "366220",
   "noticeNo": "SCNA1133594",
   "procedureType": "Procedura simplificata",
   "title": "Furnizare a 4 (patru) autoutilitare pick – up, 4x4, cabina dubla – 4 locuri, capacitate cilindrică maxim 1200 cm3 si a unei (1) autoutilitare pick – up, 4x4, cabina dubla – 5 locuri, cu capacitate cilindrică maxim 2000 cm3",
   "authorityCui": "23550461",
   "estimatedValueRon": null,
   "awardedValueRon": null,
   "cpvCode": "34113300",
   "publicationDate": null
  },
  "ted": null,
  "duplicates": [],
  "notice": {
   "total": 2,
   "rows": [
    {
     "id": "51262304",
     "contractNo": "2",
     "contractDate": "2026-06-01",
     "noticeNo": "SCNA1133594",
     "title": "Contract de furnizare a 4 (patru) autoutilitare pick – up, 4x4, cabina dubla – 4 locuri, capacitate cilindrică maxim 1200 cm3",
     "supplier": {
      "cui": "6277265",
      "name": "ROMTURINGIA S.R.L."
     },
     "valueRon": "550084.72",
     "currency": "EUR",
     "valueState": "official_ron_equivalent",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "51262303",
     "contractNo": "1",
     "contractDate": "2026-06-01",
     "noticeNo": "SCNA1133594",
     "title": "Contract de frunizare a unei autoutilitare pick – up categoria N1G, 4x4, cabina dubla – 5 locuri, capacitate cilindrică maxim 2000 cm3",
     "supplier": {
      "cui": "26928228",
      "name": "AUTO NOVEX SA"
     },
     "valueRon": "163765.68",
     "currency": "EUR",
     "valueState": "official_ron_equivalent",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ]
  },
  "names": {
   "labels": [
    [
     "23550461",
     "REGIA PUBLICA LOCALA A PADURILOR STEJARUL RA"
    ],
    [
     "6277265",
     "ROMTURINGIA SRL"
    ],
    [
     "26928228",
     "AUTO NOVEX SA"
    ]
   ],
   "entity": {
    "organization": {
     "name": "REGIA PUBLICA LOCALA A PADURILOR STEJARUL RA"
    },
    "territory": null,
    "reference": null,
    "budget": {
     "presence": false
    }
   }
  },
  "cpv": [
   {
    "code": "34113300",
    "ro": "Vehicule de teren",
    "en": "Off-road vehicles"
   }
  ],
  "source": {
   "caNoticeId": "100631627",
   "callNotice": {
    "no": "SCN1175163",
    "date": "2026-05-12"
   },
   "awardNoticeDate": "2026-06-02",
   "awardNoticeVersions": [
    "2026-06-02"
   ],
   "authorityType": "Organism de drept public",
   "contractType": "Furnizare",
   "totalEstimate": {
    "value": 136000,
    "currency": "Moneda Unica Europeana"
   },
   "offerSpread": null,
   "frameworkValue": null,
   "plan": null,
   "annexD": {
    "explanation": null,
    "forceMajeure": false,
    "noOffers": false,
    "uniqueOfferer": null,
    "repetition": false,
    "supplementary": false
   },
   "lotsTotal": 2,
   "lots": [
    {
     "no": "1",
     "title": "Autoutilitara pick – up (1 buc.), categoria N1G, 4x4, cabina dubla – 5 locuri, capacitate cilindrică maxim 2000 cm3",
     "estimate": 31200,
     "currency": "Moneda Unica Europeana",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": 90,
     "months": null,
     "status": "Atribuit"
    },
    {
     "no": "2",
     "title": "Autoutilitare pick – up (4 buc.), categoria N1G, 4x4, cabina dubla – 4 locuri, capacitate cilindrică maxim 1200 cm3",
     "estimate": 104800,
     "currency": "Moneda Unica Europeana",
     "criterion": "Pretul cel mai scazut",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": 90,
     "months": null,
     "status": "Atribuit"
    }
   ],
   "contract": {
    "framework": "Contract de achizitii publice",
    "startDate": "2026-06-02",
    "offers": {
     "received": 1,
     "sme": 1,
     "eu": 0,
     "nonEu": 0,
     "electronic": 1
    },
    "lotOffers": [
     {
      "no": "2",
      "admitted": 1,
      "unaccepted": 0,
      "nonconformed": 0,
      "withdrawn": 0
     }
    ],
    "estimate": 104800,
    "value": 104800,
    "currency": "EUR",
    "ronValue": 550084.72,
    "rate": 5.2489,
    "subcontracting": null,
    "modified": 0,
    "winners": [
     {
      "name": "ROMTURINGIA S.R.L.",
      "cui": "6277265",
      "sme": true,
      "city": "Campulung",
      "county": "Arges"
     }
    ]
   },
   "contractsInNotice": 2
  },
  "context": {
   "year": 2026,
   "awards": [
    {
     "year": 2026,
     "value": 1
    }
   ],
   "frameworks": [],
   "direct": [],
   "pairYear": {
    "count": 1,
    "withValue": 1,
    "value": 550084.72
   },
   "buyer": {
    "awards": {
     "count": 4,
     "withValue": 2,
     "value": 713850.4
    },
    "frameworks": {
     "count": 0,
     "withValue": 0,
     "value": null
    },
    "firms": {
     "parties": 3,
     "more": false,
     "count": 1
    }
   },
   "seller": {
    "awards": {
     "count": 1,
     "withValue": 1,
     "value": 550084.72
    },
    "clients": {
     "parties": 1,
     "more": false,
     "count": 1
    }
   },
   "records": 1,
   "newer": [
    {
     "id": "51262304",
     "contractNo": "2",
     "contractDate": "2026-06-01",
     "noticeNo": "SCNA1133594",
     "title": "Contract de furnizare a 4 (patru) autoutilitare pick – up, 4x4, cabina dubla – 4 locuri, capacitate cilindrică maxim 1200 cm3",
     "supplier": {
      "cui": "6277265",
      "name": "ROMTURINGIA S.R.L."
     },
     "valueRon": "550084.72",
     "currency": "EUR",
     "valueState": "official_ron_equivalent",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ],
   "older": [
    {
     "id": "51262304",
     "contractNo": "2",
     "contractDate": "2026-06-01",
     "noticeNo": "SCNA1133594",
     "title": "Contract de furnizare a 4 (patru) autoutilitare pick – up, 4x4, cabina dubla – 4 locuri, capacitate cilindrică maxim 1200 cm3",
     "supplier": {
      "cui": "6277265",
      "name": "ROMTURINGIA S.R.L."
     },
     "valueRon": "550084.72",
     "currency": "EUR",
     "valueState": "official_ron_equivalent",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ]
  }
 },
 "vechi": {
  "label": "Spitalul Cantacuzino, 2010 — procedură legată greșit",
  "contract": {
   "id": "183565687",
   "contractNo": null,
   "contractDate": "2010-12-31",
   "noticeNo": "136082",
   "title": "DEZINFECTANTI",
   "supplier": {
    "cui": "3210015",
    "name": "Sante International S.A.",
    "displayName": "Sante International S.A."
   },
   "valueRon": "400.00",
   "currency": "RON",
   "valueState": "official_exact",
   "valueStateRule": "own_value",
   "valueAccepted": true,
   "recordKind": "contract_award",
   "displayTitle": {
    "text": "DEZINFECTANTI",
    "source": "native",
    "sourceUrl": "http://data.gov.ro/storage/f/2013-11-01T13%3A53%3A25.333Z/contracte-2010.csv"
   },
   "authority": {
    "cui": "4203490",
    "name": "Spitalul Clinic Dr. I. Cantacuzino",
    "displayName": "Spitalul Clinic Dr. I. Cantacuzino"
   },
   "cpvCode": "24455000",
   "estimatedValueRon": "29293.36",
   "sourceSystem": "seap_contracts",
   "sourceUrl": "http://data.gov.ro/storage/f/2013-11-01T13%3A53%3A25.333Z/contracte-2010.csv",
   "valueComparable": "400.00",
   "modifications": []
  },
  "procedure": {
   "id": "35057418",
   "noticeNo": "136082",
   "procedureType": "Cerere de oferta",
   "title": null,
   "authorityCui": "7453165",
   "estimatedValueRon": null,
   "awardedValueRon": null,
   "cpvCode": "45233161",
   "publicationDate": "2008-04-25"
  },
  "ted": null,
  "duplicates": [],
  "notice": {
   "total": 4,
   "rows": [
    {
     "id": "183565687",
     "contractNo": null,
     "contractDate": "2010-12-31",
     "noticeNo": "136082",
     "title": "DEZINFECTANTI",
     "supplier": {
      "cui": "3210015",
      "name": "Sante International S.A."
     },
     "valueRon": "400.00",
     "currency": "RON",
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "183565686",
     "contractNo": null,
     "contractDate": "2010-12-31",
     "noticeNo": "136082",
     "title": "DEZINFECTANTI",
     "supplier": {
      "cui": "7039466",
      "name": "HEXI PHARMA CO S.R.L."
     },
     "valueRon": "7730.00",
     "currency": "RON",
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "183565685",
     "contractNo": null,
     "contractDate": "2010-12-31",
     "noticeNo": "136082",
     "title": "DEZINFECTANTI",
     "supplier": {
      "cui": "4057646",
      "name": "G&M 2000 S.R.L."
     },
     "valueRon": "1050.00",
     "currency": "RON",
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "183565684",
     "contractNo": null,
     "contractDate": "2010-12-31",
     "noticeNo": "136082",
     "title": "DEZINFECTANTI",
     "supplier": {
      "cui": "4275950",
      "name": "INTERCOOP S.R.L."
     },
     "valueRon": "8450.00",
     "currency": "RON",
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ]
  },
  "names": {
   "labels": [
    [
     "4203490",
     "SPITALUL CLINIC DR. I. CANTACUZINO"
    ],
    [
     "3210015",
     "SANTE INTERNATIONAL SA"
    ],
    [
     "7039466",
     "HEXI PHARMA CO. SRL"
    ],
    [
     "4057646",
     "G & M 2000 SRL"
    ],
    [
     "4275950",
     "INTERCOOP SRL"
    ]
   ],
   "entity": {
    "organization": {
     "name": "SPITALUL CLINIC DR. I. CANTACUZINO"
    },
    "territory": {
     "kind": "municipality",
     "name": "MUNICIPIUL BUCUREȘTI",
     "countyCode": "B",
     "countyName": "MUNICIPIUL BUCUREȘTI"
    },
    "reference": {
     "name": "SPITALUL CLINIC DR. I. CANTACUZINO",
     "address": "Bucuresti, Sectorul 2 al Municipiului Bucuresti, STRADA ION MOVILA, Numar 5-7, Bloc/Scara , Sector 2, Cod postal 70266",
     "entityType": "health",
     "isTerritorialExecutive": false
    },
    "budget": {
     "presence": true
    }
   }
  },
  "cpv": [
   {
    "code": "24455000",
    "ro": "Dezinfectanţi",
    "en": "Disinfectants"
   },
   {
    "code": "45233161",
    "ro": "Lucrări de construcţii de trotuare",
    "en": "Footpath construction work"
   }
  ],
  "source": null,
  "context": null
 },
 "disputata": {
  "label": "ANIF, irigații — valoare disputată, trei contracte în anunț",
  "contract": {
   "id": "2561147",
   "contractNo": "23.01.001",
   "contractDate": "2023-01-04",
   "noticeNo": "CAN1096494",
   "title": null,
   "supplier": {
    "cui": "7348194",
    "name": "ELECTRO-ALFA INTERNATIONAL",
    "displayName": "ELECTRO-ALFA INTERNATIONAL"
   },
   "valueRon": "3234147.00",
   "currency": null,
   "valueState": "conflicting_sources",
   "valueStateRule": "cross_disagrees",
   "valueAccepted": false,
   "recordKind": "contract_award",
   "displayTitle": {
    "text": "Inv 4 Executia lucrarilor pt. obiectivele de investitii aflate in adm. ANIF din PNRIPIR ,3 loturi - Lot I Reabilitarea infrastructurii principale din amenajarea de irigatii Movileni Hăvârna, jud. Botosani",
    "source": "matched_award",
    "sourceUrl": "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100615014"
   },
   "authority": {
    "cui": "29275212",
    "name": "AGENTIA NATIONALA DE IMBUNATATIRI FUNCIARE",
    "displayName": "AGENTIA NATIONALA DE IMBUNATATIRI FUNCIARE"
   },
   "cpvCode": "45232120",
   "estimatedValueRon": null,
   "sourceSystem": "seap_contracts",
   "sourceUrl": "https://data.gov.ro/dataset/e0cf7ffc-1fa0-4ffb-a82f-c83981d81f21/resource/a1936e88-7fc5-4ffc-af65-6f946e98a005/download/contracte-t_iv_2025.xlsx",
   "valueComparable": null,
   "modifications": [
    {
     "id": "67298",
     "date": "2025-12-17",
     "before": "37161828.00",
     "after": "390810555.00",
     "delta": "353648727.00",
     "text": "VALOARE AJUSTARI - 1.919.227,63",
     "contractNo": "22.12.227"
    },
    {
     "id": "67578",
     "date": "2025-12-22",
     "before": "390810555.00",
     "after": "41458798.00",
     "delta": "-349351757.00",
     "text": "NCS-NR",
     "contractNo": "22.12.227"
    },
    {
     "id": "70736",
     "date": null,
     "before": "41458797.87",
     "after": "41458797.87",
     "delta": "0.00",
     "text": "Prelungire contract conform acte aditionale",
     "contractNo": "22.12.227"
    },
    {
     "id": "1825625",
     "date": null,
     "before": null,
     "after": null,
     "delta": "35658444.00",
     "text": "Ajustare conform OUG168/2022",
     "contractNo": "22.12.227"
    }
   ]
  },
  "procedure": {
   "id": "355515",
   "noticeNo": "CAN1096494",
   "procedureType": "Licitatie deschisa",
   "title": "„ INV - 4/2022 Executia lucrarilor pentru obiectivele de investiţii aflate in administrarea ANIF, din cadrul Programului National de Reabilitare a Infrastructurii Principale de Irigatii din Romania, pentru obiectivele de investitii: 3 Loturi\"",
   "authorityCui": "29275212",
   "estimatedValueRon": "63233506.18",
   "awardedValueRon": "63233506.18",
   "cpvCode": "45232120",
   "publicationDate": null
  },
  "ted": {
   "tedNoticeNo": "172788-2026",
   "sourceUrl": "https://ted.europa.eu/en/notice/172788-2026/xml"
  },
  "duplicates": [
   "seap_contracts"
  ],
  "notice": {
   "total": 5,
   "rows": [
    {
     "id": "2561147",
     "contractNo": "23.01.001",
     "contractDate": "2023-01-04",
     "noticeNo": "CAN1096494",
     "title": null,
     "supplier": {
      "cui": "7348194",
      "name": "ELECTRO-ALFA INTERNATIONAL"
     },
     "valueRon": "3234147.00",
     "currency": null,
     "valueState": "conflicting_sources",
     "valueStateRule": "cross_disagrees",
     "valueAccepted": false,
     "recordKind": "contract_award"
    },
    {
     "id": "2561150",
     "contractNo": "22.12.227",
     "contractDate": "2022-12-13",
     "noticeNo": "CAN1096494",
     "title": null,
     "supplier": {
      "cui": "8006670",
      "name": "TANCRAD S.R.L."
     },
     "valueRon": "41458797.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2561149",
     "contractNo": "22.12.227",
     "contractDate": "2022-12-13",
     "noticeNo": "CAN1096494",
     "title": null,
     "supplier": {
      "cui": "7862755",
      "name": "Remico Comprest"
     },
     "valueRon": "41458797.00",
     "currency": null,
     "valueState": "conflicting_sources",
     "valueStateRule": "cross_disagrees",
     "valueAccepted": false,
     "recordKind": "contract_award"
    },
    {
     "id": "2561148",
     "contractNo": "22.12.225",
     "contractDate": "2022-12-09",
     "noticeNo": "CAN1096494",
     "title": null,
     "supplier": {
      "cui": "1555468",
      "name": "ENERGOMONTAJ S.A."
     },
     "valueRon": "18422827.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2729946",
     "contractNo": "22.12.225",
     "contractDate": "2022-09-12",
     "noticeNo": "CAN1096494",
     "title": null,
     "supplier": {
      "cui": "1555468",
      "name": "ENERGOMONTAJ S.A."
     },
     "valueRon": "18540561.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ]
  },
  "names": {
   "labels": [
    [
     "29275212",
     "AGENTIA NATIONALA DE IMBUNATATIRI FUNCIARE"
    ],
    [
     "7348194",
     "ELECTRO-ALFA INTERNATIONAL S.A."
    ],
    [
     "8006670",
     "TANCRAD SRL"
    ],
    [
     "7862755",
     "REMICO COMPREST SRL"
    ],
    [
     "1555468",
     "ENERGOMONTAJ SA"
    ]
   ],
   "entity": {
    "organization": {
     "name": "AGENTIA NATIONALA DE IMBUNATATIRI FUNCIARE"
    },
    "territory": {
     "kind": "sector",
     "name": "SECTORUL 4",
     "countyCode": "B",
     "countyName": "MUNICIPIUL BUCUREȘTI"
    },
    "reference": {
     "name": "AGENTIA NATIONALA DE IMBUNATATIRI FUNCIARE",
     "address": "Bucuresti, Sectorul 4 al Municipiului Bucuresti, SOSEA OLTENITEI, Numar 35-37, Bloc/Scara -, Sector 4, Cod postal 41293",
     "entityType": "central_authority",
     "isTerritorialExecutive": false
    },
    "budget": {
     "presence": true
    }
   }
  },
  "cpv": [
   {
    "code": "45232120",
    "ro": "Lucrări de irigaţie",
    "en": "Irrigation works"
   }
  ],
  "source": {
   "caNoticeId": "100615014",
   "callNotice": {
    "no": "CN1044934",
    "date": "2022-07-14"
   },
   "awardNoticeDate": "2023-01-22",
   "awardNoticeVersions": [
    "2023-01-22",
    "2023-06-26",
    "2025-12-17",
    "2025-12-22",
    "2026-01-27",
    "2026-03-11"
   ],
   "authorityType": "Agenție / birou național sau federal",
   "contractType": "Lucrari",
   "totalEstimate": {
    "value": 63233506.18,
    "currency": "Leu"
   },
   "offerSpread": null,
   "frameworkValue": null,
   "plan": null,
   "annexD": {
    "explanation": null,
    "forceMajeure": false,
    "noOffers": false,
    "uniqueOfferer": null,
    "repetition": false,
    "supplementary": false
   },
   "lotsTotal": 3,
   "lots": [
    {
     "no": "3",
     "title": "LOT III - Reabilitarea amenajării de irigaţii Nămoloasa Măxineni, etapa a  II-a, judeţul Brăila",
     "estimate": 39336700.36,
     "currency": "Leu",
     "criterion": "Cel mai bun raport calitate – pret",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 18,
     "status": "Atribuit"
    },
    {
     "no": "1",
     "title": "LOT IReabilitarea infrastructurii principale din amenajarea de irigaţii Movileni Hăvârna, judeţul Botoşani;",
     "estimate": 3293041,
     "currency": "Leu",
     "criterion": "Cel mai bun raport calitate – pret",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 22,
     "status": "Atribuit"
    },
    {
     "no": "2",
     "title": "LOT II Reabilitarea şi modernizarea staţiilor de pompare plutitoare Vadu Oii şi SP Plutitoare Hârşova din cadrul amenajării de irigaţii Orezărie Hârşova, judeţul Constanţa",
     "estimate": 20680615,
     "currency": "Leu",
     "criterion": "Cel mai bun raport calitate – pret",
     "financing": "Fonduri bugetare",
     "euProgram": null,
     "days": null,
     "months": 22,
     "status": "Atribuit"
    }
   ],
   "contract": {
    "framework": "Contract de achizitii publice",
    "startDate": "2023-01-04",
    "offers": {
     "received": 2,
     "sme": 1,
     "eu": 0,
     "nonEu": 0,
     "electronic": 2
    },
    "lotOffers": [
     {
      "no": "1",
      "admitted": 2,
      "unaccepted": 0,
      "nonconformed": 0,
      "withdrawn": 0
     }
    ],
    "estimate": 3293041,
    "value": 3234147.07,
    "currency": "RON",
    "ronValue": 3234147.07,
    "rate": 1,
    "subcontracting": null,
    "modified": 0,
    "winners": [
     {
      "name": "ELECTRO-ALFA INTERNATIONAL",
      "cui": "7348194",
      "sme": false,
      "city": "Botosani",
      "county": "Botosani"
     }
    ]
   },
   "contractsInNotice": 3
  },
  "context": {
   "year": 2023,
   "awards": [
    {
     "year": 2019,
     "value": 1
    },
    {
     "year": 2022,
     "value": 2
    },
    {
     "year": 2023,
     "value": 9
    },
    {
     "year": 2024,
     "value": 2
    }
   ],
   "frameworks": [],
   "direct": [],
   "pairYear": {
    "count": 9,
    "withValue": 1,
    "value": 64301813.88
   },
   "buyer": {
    "awards": {
     "count": 237,
     "withValue": 113,
     "value": 947825105.82
    },
    "frameworks": {
     "count": 98,
     "withValue": 0,
     "value": null
    },
    "firms": {
     "parties": 58,
     "more": false,
     "count": 9
    }
   },
   "seller": {
    "awards": {
     "count": 22,
     "withValue": 9,
     "value": 86543686.88
    },
    "clients": {
     "parties": 6,
     "more": false,
     "count": 9
    }
   },
   "records": 14,
   "newer": [
    {
     "id": "2561147",
     "contractNo": "23.01.001",
     "contractDate": "2023-01-04",
     "noticeNo": "CAN1096494",
     "title": null,
     "supplier": {
      "cui": "7348194",
      "name": "ELECTRO-ALFA INTERNATIONAL"
     },
     "valueRon": "3234147.00",
     "currency": null,
     "valueState": "conflicting_sources",
     "valueStateRule": "cross_disagrees",
     "valueAccepted": false,
     "recordKind": "contract_award"
    },
    {
     "id": "51500574",
     "contractNo": "23.01.013",
     "contractDate": "2023-01-24",
     "noticeNo": "CAN1077821",
     "title": "Reabilitarea statiei de pompare de baza \\sp1 babadag, SP2 Babadag, a statiilor de repompare SRP1 Babadag, SRP4 Babadag si a canalelor de aductiune CA5, CD 1-8 si CA0-Sp2 Babadag din amenajarea de irigatii Babadg, jud.Tulcea",
     "supplier": {
      "cui": "7348194",
      "name": "ELECTRO-ALFA INTERNATIONAL"
     },
     "valueRon": "64301813.88",
     "currency": "RON",
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2561136",
     "contractNo": "23.01.014",
     "contractDate": "2023-01-25",
     "noticeNo": "CAN1096785",
     "title": null,
     "supplier": {
      "cui": "7348194",
      "name": "ELECTRO-ALFA INTERNATIONAL"
     },
     "valueRon": "185303161.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "1829244",
     "contractNo": "23.01.014",
     "contractDate": "2023-01-25",
     "noticeNo": "CAN1096785",
     "title": null,
     "supplier": {
      "cui": "7348194",
      "name": "ELECTRO-ALFA INTERNATIONAL"
     },
     "valueRon": "168835493.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ],
   "older": [
    {
     "id": "2561147",
     "contractNo": "23.01.001",
     "contractDate": "2023-01-04",
     "noticeNo": "CAN1096494",
     "title": null,
     "supplier": {
      "cui": "7348194",
      "name": "ELECTRO-ALFA INTERNATIONAL"
     },
     "valueRon": "3234147.00",
     "currency": null,
     "valueState": "conflicting_sources",
     "valueStateRule": "cross_disagrees",
     "valueAccepted": false,
     "recordKind": "contract_award"
    },
    {
     "id": "24276473",
     "contractNo": "22.06.149",
     "contractDate": "2022-06-16",
     "noticeNo": "CAN1081969",
     "title": null,
     "supplier": {
      "cui": "7348194",
      "name": "ELECTRO-ALFA INTERNATIONAL"
     },
     "valueRon": "60643826.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "1314137",
     "contractNo": "22.02.057",
     "contractDate": "2022-02-18",
     "noticeNo": "CAN1079910",
     "title": "Lucrari de intretinere si reparatii  in amenajarea de irigatii Sadova-Corabia, din cadrul Filialei teritoriale de Imbunatatiri Funciare Dolj, ju. Dolj",
     "supplier": {
      "cui": "7348194",
      "name": "ELECTRO-ALFA INTERNATIONAL"
     },
     "valueRon": "779000.00",
     "currency": "RON",
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    },
    {
     "id": "2561154",
     "contractNo": "19.12.563",
     "contractDate": "2019-12-19",
     "noticeNo": "CAN1028007",
     "title": null,
     "supplier": {
      "cui": "7348194",
      "name": "ELECTRO-ALFA INTERNATIONAL"
     },
     "valueRon": "20224855.00",
     "currency": null,
     "valueState": "official_exact",
     "valueStateRule": "own_value",
     "valueAccepted": true,
     "recordKind": "contract_award"
    }
   ]
  }
 }
}
