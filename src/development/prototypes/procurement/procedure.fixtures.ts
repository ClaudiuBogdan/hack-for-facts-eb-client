/* Real SEAP procedures read from the dev API and e-licitatie on 2026-10-02 (scratchpad procedure-fixtures.mjs), trimmed to what the page reads. Regenerate, don't edit. */
import type { RawProcedureRecord } from './procedure.types'

export const PROCEDURE_FIXTURES: Readonly<Record<string, RawProcedureRecord>> = {
 "anif": {
  "label": "ANIF, irigații — trei loturi, o ofertă pe lot, anunț la trei ani",
  "procedure": {
   "id": "355515",
   "noticeNo": "CAN1096494",
   "noticeKind": "award_no_init",
   "procedureType": "Licitatie deschisa",
   "contractKind": null,
   "title": "„ INV - 4/2022 Executia lucrarilor pentru obiectivele de investiţii aflate in administrarea ANIF, din cadrul Programului National de Reabilitare a Infrastructurii Principale de Irigatii din Romania, pentru obiectivele de investitii: 3 Loturi\"",
   "authority": {
    "cui": "29275212",
    "name": "AGENTIA NATIONALA DE IMBUNATATIRI FUNCIARE"
   },
   "cpvCode": "45232120",
   "estimatedValueRon": "63233506.18",
   "awardedValueRon": "63233506.18",
   "currency": "RON",
   "status": "awarded",
   "publicationDate": null,
   "stateDate": null,
   "sourceSystem": "elicitatie",
   "sourceUrl": "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100615014",
   "valueAccepted": true
  },
  "contracts": [
   {
    "id": "2561147",
    "contractNo": "23.01.001",
    "contractDate": "2023-01-04",
    "title": null,
    "authority": {
     "cui": "29275212",
     "name": "AGENTIA NATIONALA DE IMBUNATATIRI FUNCIARE"
    },
    "supplier": {
     "cui": "7348194",
     "name": "ELECTRO-ALFA INTERNATIONAL"
    },
    "valueRon": "3234147.00",
    "valueAccepted": false,
    "valueState": "conflicting_sources",
    "recordKind": "contract_award"
   },
   {
    "id": "2561150",
    "contractNo": "22.12.227",
    "contractDate": "2022-12-13",
    "title": null,
    "authority": {
     "cui": "29275212",
     "name": "AGENTIA NATIONALA DE IMBUNATATIRI FUNCIARE"
    },
    "supplier": {
     "cui": "8006670",
     "name": "TANCRAD S.R.L."
    },
    "valueRon": "41458797.00",
    "valueAccepted": true,
    "valueState": "official_exact",
    "recordKind": "contract_award"
   },
   {
    "id": "2561149",
    "contractNo": "22.12.227",
    "contractDate": "2022-12-13",
    "title": null,
    "authority": {
     "cui": "29275212",
     "name": "AGENTIA NATIONALA DE IMBUNATATIRI FUNCIARE"
    },
    "supplier": {
     "cui": "7862755",
     "name": "Remico Comprest"
    },
    "valueRon": "41458797.00",
    "valueAccepted": false,
    "valueState": "conflicting_sources",
    "recordKind": "contract_award"
   },
   {
    "id": "2561148",
    "contractNo": "22.12.225",
    "contractDate": "2022-12-09",
    "title": null,
    "authority": {
     "cui": "29275212",
     "name": "AGENTIA NATIONALA DE IMBUNATATIRI FUNCIARE"
    },
    "supplier": {
     "cui": "1555468",
     "name": "ENERGOMONTAJ S.A."
    },
    "valueRon": "18422827.00",
    "valueAccepted": true,
    "valueState": "official_exact",
    "recordKind": "contract_award"
   },
   {
    "id": "2729946",
    "contractNo": "22.12.225",
    "contractDate": "2022-09-12",
    "title": null,
    "authority": {
     "cui": "29275212",
     "name": "AGENTIA NATIONALA DE IMBUNATATIRI FUNCIARE"
    },
    "supplier": {
     "cui": "1555468",
     "name": "ENERGOMONTAJ S.A."
    },
    "valueRon": "18540561.00",
    "valueAccepted": true,
    "valueState": "official_exact",
    "recordKind": "contract_award"
   }
  ],
  "ted": "172788-2026",
  "notice": null,
  "linked": [
   {
    "row": {
     "id": "412114",
     "noticeNo": "CN1044934",
     "noticeKind": "initiation",
     "procedureType": "Licitatie deschisa",
     "contractKind": "works",
     "title": null,
     "authority": {
      "cui": "29275212",
      "name": "AGENTIA NATIONALA DE IMBUNATATIRI FUNCIARE"
     },
     "cpvCode": "45232120",
     "estimatedValueRon": "63310356.00",
     "awardedValueRon": null,
     "currency": "RON",
     "status": "unknown",
     "publicationDate": "2022-07-14",
     "stateDate": null,
     "sourceSystem": "seap_notice",
     "sourceUrl": "https://data.gov.ro/dataset/51fca83b-02a5-46da-b894-5d9cac565fa2/resource/dafaf52d-26e8-4021-9081-915061f3c906/download/raport-datagov-anunturi-de-initiere-t3-2022.xls",
     "valueAccepted": false
    },
    "tie": "call"
   }
  ],
  "source": {
   "caNoticeId": "100615014",
   "title": "„ INV - 4/2022 Executia lucrarilor pentru obiectivele de investiţii aflate in administrarea ANIF,  din cadrul Programului National de Reabilitare a Infrastructurii Principale de Irigatii din Romania, pentru obiectivele  de investitii:  3 Loturi\"",
   "reference": "29275212/4/2022",
   "contractType": "Lucrari",
   "authorityType": "Agenție / birou național sau federal",
   "legislation": "Legea nr. 98/23.05.2016",
   "procedureType": "Licitatie deschisa",
   "framework": false,
   "call": {
    "no": "CN1044934",
    "date": "2022-07-14"
   },
   "ted": "172788-2026",
   "totalEstimate": 63233506.18,
   "lotsEstimate": 63310356.36,
   "frameworkValue": 0,
   "annexD": {
    "explanation": null,
    "forceMajeure": false
   },
   "lots": [
    {
     "no": "3",
     "title": "LOT III - Reabilitarea amenajării de irigaţii Nămoloasa Măxineni, etapa a  II-a, judeţul Brăila",
     "cpv": "45232120-9 Lucrari de irigatie (Rev.2)",
     "place": "RO216 Vaslui",
     "estimate": 39336700.36,
     "currency": "Leu",
     "criterion": "Cel mai bun raport calitate – pret",
     "criteria": [
      {
       "name": "Pretul ofertei",
       "weight": 60,
       "price": true
      },
      {
       "name": "Componenta tehnica",
       "weight": 40,
       "price": false
      }
     ],
     "months": 18,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "1",
     "title": "LOT IReabilitarea infrastructurii principale din amenajarea de irigaţii Movileni Hăvârna, judeţul Botoşani;",
     "cpv": "45232120-9 Lucrari de irigatie (Rev.2)",
     "place": "RO212 Botoşani",
     "estimate": 3293041,
     "currency": "Leu",
     "criterion": "Cel mai bun raport calitate – pret",
     "criteria": [
      {
       "name": "Pretul ofertei",
       "weight": 60,
       "price": true
      },
      {
       "name": "Componenta tehnica - Grafic",
       "weight": 40,
       "price": false
      }
     ],
     "months": 22,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "2",
     "title": "LOT II Reabilitarea şi modernizarea staţiilor de pompare plutitoare Vadu Oii şi SP Plutitoare Hârşova din cadrul amenajării de irigaţii Orezărie Hârşova, judeţul Constanţa",
     "cpv": "45232120-9 Lucrari de irigatie (Rev.2)",
     "place": "RO223 Constanţa",
     "estimate": 20680615,
     "currency": "Leu",
     "criterion": "Cel mai bun raport calitate – pret",
     "criteria": [
      {
       "name": "Pretul ofertei",
       "weight": 60,
       "price": true
      },
      {
       "name": "Componenta tehnica",
       "weight": 40,
       "price": false
      }
     ],
     "months": 22,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    }
   ],
   "contracts": [
    {
     "id": "107383076",
     "no": "22.12.225",
     "date": "2022-12-09",
     "title": "Inv 4 Executia lucrarilor pentru obiectivele de investitii din administrarea ANIF prin PNRIPIR, 3 loturi- Lot II Reabilitarea si modernizarea statiilor de pompare plutitoare Vadu Oii si SP Plutitoare Harsova din amenaj. de irigatii Orezarie Harsova, jud. Constanta",
     "lots": [
      "2"
     ],
     "value": 18540561.24,
     "currency": "RON",
     "ronValue": 18540561.24,
     "winners": [
      {
       "name": "ENERGOMONTAJ S.A.",
       "cui": "1555468",
       "sme": false,
       "city": "Bucuresti"
      }
     ],
     "modified": 0,
     "framework": "Contract de achizitii publice",
     "estimate": 20680615,
     "lowest": null,
     "highest": null,
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
       "withdrawn": 2
      }
     ],
     "group": false,
     "startDate": "2022-12-09"
    },
    {
     "id": "107383074",
     "no": "22.12.227",
     "date": "2022-12-13",
     "title": "INV 4 Executia lucrarilor pt. obiectivele de investitii aflate in adm.ANIF din PNRIP de irigatii din Romania :3 loturi, Lot III- Reabilitarea amenajarii de irigatii Nămoloasa Maxineni, faza a II-a, jud. Braila",
     "lots": [
      "3"
     ],
     "value": 41458797.87,
     "currency": "RON",
     "ronValue": 41458797.87,
     "winners": [
      {
       "name": "Remico Comprest",
       "cui": "7862755",
       "sme": true,
       "city": "Galati"
      },
      {
       "name": "TANCRAD S.R.L.",
       "cui": "8006670",
       "sme": false,
       "city": "Galati"
      }
     ],
     "modified": 4,
     "framework": "Contract de achizitii publice",
     "estimate": 39336700.36,
     "lowest": null,
     "highest": null,
     "offers": {
      "received": 4,
      "sme": 4,
      "eu": 0,
      "nonEu": 0,
      "electronic": 4
     },
     "lotOffers": [
      {
       "no": "3",
       "admitted": 3,
       "unaccepted": 1,
       "nonconformed": 0,
       "withdrawn": 4
      }
     ],
     "group": true,
     "startDate": "2022-12-13"
    },
    {
     "id": "107383075",
     "no": "23.01.001",
     "date": "2023-01-04",
     "title": "Inv 4 Executia lucrarilor pt. obiectivele de investitii aflate in adm. ANIF din PNRIPIR ,3 loturi - Lot I Reabilitarea infrastructurii principale din amenajarea de irigatii Movileni Hăvârna, jud. Botosani",
     "lots": [
      "1"
     ],
     "value": 3234147.07,
     "currency": "RON",
     "ronValue": 3234147.07,
     "winners": [
      {
       "name": "ELECTRO-ALFA INTERNATIONAL",
       "cui": "7348194",
       "sme": false,
       "city": "Botosani"
      }
     ],
     "modified": 0,
     "framework": "Contract de achizitii publice",
     "estimate": 3293041,
     "lowest": null,
     "highest": null,
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
     "group": false,
     "startDate": "2023-01-04"
    }
   ],
   "versions": [
    {
     "date": "2026-03-11T15:00:05+02:00",
     "state": "Publicat",
     "correcting": false,
     "modification": true
    },
    {
     "date": "2026-01-27T13:03:27+02:00",
     "state": "Retras",
     "correcting": true,
     "modification": false
    },
    {
     "date": "2025-12-22T13:05:09+02:00",
     "state": "Retras",
     "correcting": false,
     "modification": true
    },
    {
     "date": "2025-12-17T13:03:59+02:00",
     "state": "Retras",
     "correcting": false,
     "modification": true
    },
    {
     "date": "2023-06-26T15:34:13+03:00",
     "state": "Retras",
     "correcting": false,
     "modification": true
    },
    {
     "date": "2023-01-22T13:01:25+02:00",
     "state": "Retras",
     "correcting": false,
     "modification": false
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
   "cpv": [
    {
     "code": "45232120",
     "ro": "Lucrări de irigaţie",
     "en": "Irrigation works"
    }
   ]
  }
 },
 "anif-apel": {
  "label": "ANIF, irigații — rândul anunțului de participare",
  "procedure": {
   "id": "412114",
   "noticeNo": "CN1044934",
   "noticeKind": "initiation",
   "procedureType": "Licitatie deschisa",
   "contractKind": "works",
   "title": null,
   "authority": {
    "cui": "29275212",
    "name": "AGENTIA NATIONALA DE IMBUNATATIRI FUNCIARE"
   },
   "cpvCode": "45232120",
   "estimatedValueRon": "63310356.00",
   "awardedValueRon": null,
   "currency": "RON",
   "status": "unknown",
   "publicationDate": "2022-07-14",
   "stateDate": null,
   "sourceSystem": "seap_notice",
   "sourceUrl": "https://data.gov.ro/dataset/51fca83b-02a5-46da-b894-5d9cac565fa2/resource/dafaf52d-26e8-4021-9081-915061f3c906/download/raport-datagov-anunturi-de-initiere-t3-2022.xls",
   "valueAccepted": false
  },
  "contracts": [],
  "ted": null,
  "notice": null,
  "linked": [
   {
    "row": {
     "id": "355515",
     "noticeNo": "CAN1096494",
     "noticeKind": "award_no_init",
     "procedureType": "Licitatie deschisa",
     "contractKind": null,
     "title": "„ INV - 4/2022 Executia lucrarilor pentru obiectivele de investiţii aflate in administrarea ANIF, din cadrul Programului National de Reabilitare a Infrastructurii Principale de Irigatii din Romania, pentru obiectivele de investitii: 3 Loturi\"",
     "authority": {
      "cui": "29275212",
      "name": "AGENTIA NATIONALA DE IMBUNATATIRI FUNCIARE"
     },
     "cpvCode": "45232120",
     "estimatedValueRon": "63233506.18",
     "awardedValueRon": "63233506.18",
     "currency": "RON",
     "status": "awarded",
     "publicationDate": null,
     "stateDate": null,
     "sourceSystem": "elicitatie",
     "sourceUrl": "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100615014",
     "valueAccepted": true
    },
    "tie": "award"
   }
  ],
  "source": {
   "caNoticeId": "100615014",
   "title": "„ INV - 4/2022 Executia lucrarilor pentru obiectivele de investiţii aflate in administrarea ANIF,  din cadrul Programului National de Reabilitare a Infrastructurii Principale de Irigatii din Romania, pentru obiectivele  de investitii:  3 Loturi\"",
   "reference": "29275212/4/2022",
   "contractType": "Lucrari",
   "authorityType": "Agenție / birou național sau federal",
   "legislation": "Legea nr. 98/23.05.2016",
   "procedureType": "Licitatie deschisa",
   "framework": false,
   "call": {
    "no": "CN1044934",
    "date": "2022-07-14"
   },
   "ted": "172788-2026",
   "totalEstimate": 63233506.18,
   "lotsEstimate": 63310356.36,
   "frameworkValue": 0,
   "annexD": {
    "explanation": null,
    "forceMajeure": false
   },
   "lots": [
    {
     "no": "3",
     "title": "LOT III - Reabilitarea amenajării de irigaţii Nămoloasa Măxineni, etapa a  II-a, judeţul Brăila",
     "cpv": "45232120-9 Lucrari de irigatie (Rev.2)",
     "place": "RO216 Vaslui",
     "estimate": 39336700.36,
     "currency": "Leu",
     "criterion": "Cel mai bun raport calitate – pret",
     "criteria": [
      {
       "name": "Pretul ofertei",
       "weight": 60,
       "price": true
      },
      {
       "name": "Componenta tehnica",
       "weight": 40,
       "price": false
      }
     ],
     "months": 18,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "1",
     "title": "LOT IReabilitarea infrastructurii principale din amenajarea de irigaţii Movileni Hăvârna, judeţul Botoşani;",
     "cpv": "45232120-9 Lucrari de irigatie (Rev.2)",
     "place": "RO212 Botoşani",
     "estimate": 3293041,
     "currency": "Leu",
     "criterion": "Cel mai bun raport calitate – pret",
     "criteria": [
      {
       "name": "Pretul ofertei",
       "weight": 60,
       "price": true
      },
      {
       "name": "Componenta tehnica - Grafic",
       "weight": 40,
       "price": false
      }
     ],
     "months": 22,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "2",
     "title": "LOT II Reabilitarea şi modernizarea staţiilor de pompare plutitoare Vadu Oii şi SP Plutitoare Hârşova din cadrul amenajării de irigaţii Orezărie Hârşova, judeţul Constanţa",
     "cpv": "45232120-9 Lucrari de irigatie (Rev.2)",
     "place": "RO223 Constanţa",
     "estimate": 20680615,
     "currency": "Leu",
     "criterion": "Cel mai bun raport calitate – pret",
     "criteria": [
      {
       "name": "Pretul ofertei",
       "weight": 60,
       "price": true
      },
      {
       "name": "Componenta tehnica",
       "weight": 40,
       "price": false
      }
     ],
     "months": 22,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    }
   ],
   "contracts": [
    {
     "id": "107383076",
     "no": "22.12.225",
     "date": "2022-12-09",
     "title": "Inv 4 Executia lucrarilor pentru obiectivele de investitii din administrarea ANIF prin PNRIPIR, 3 loturi- Lot II Reabilitarea si modernizarea statiilor de pompare plutitoare Vadu Oii si SP Plutitoare Harsova din amenaj. de irigatii Orezarie Harsova, jud. Constanta",
     "lots": [
      "2"
     ],
     "value": 18540561.24,
     "currency": "RON",
     "ronValue": 18540561.24,
     "winners": [
      {
       "name": "ENERGOMONTAJ S.A.",
       "cui": "1555468",
       "sme": false,
       "city": "Bucuresti"
      }
     ],
     "modified": 0,
     "framework": "Contract de achizitii publice",
     "estimate": 20680615,
     "lowest": null,
     "highest": null,
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
       "withdrawn": 2
      }
     ],
     "group": false,
     "startDate": "2022-12-09"
    },
    {
     "id": "107383074",
     "no": "22.12.227",
     "date": "2022-12-13",
     "title": "INV 4 Executia lucrarilor pt. obiectivele de investitii aflate in adm.ANIF din PNRIP de irigatii din Romania :3 loturi, Lot III- Reabilitarea amenajarii de irigatii Nămoloasa Maxineni, faza a II-a, jud. Braila",
     "lots": [
      "3"
     ],
     "value": 41458797.87,
     "currency": "RON",
     "ronValue": 41458797.87,
     "winners": [
      {
       "name": "Remico Comprest",
       "cui": "7862755",
       "sme": true,
       "city": "Galati"
      },
      {
       "name": "TANCRAD S.R.L.",
       "cui": "8006670",
       "sme": false,
       "city": "Galati"
      }
     ],
     "modified": 4,
     "framework": "Contract de achizitii publice",
     "estimate": 39336700.36,
     "lowest": null,
     "highest": null,
     "offers": {
      "received": 4,
      "sme": 4,
      "eu": 0,
      "nonEu": 0,
      "electronic": 4
     },
     "lotOffers": [
      {
       "no": "3",
       "admitted": 3,
       "unaccepted": 1,
       "nonconformed": 0,
       "withdrawn": 4
      }
     ],
     "group": true,
     "startDate": "2022-12-13"
    },
    {
     "id": "107383075",
     "no": "23.01.001",
     "date": "2023-01-04",
     "title": "Inv 4 Executia lucrarilor pt. obiectivele de investitii aflate in adm. ANIF din PNRIPIR ,3 loturi - Lot I Reabilitarea infrastructurii principale din amenajarea de irigatii Movileni Hăvârna, jud. Botosani",
     "lots": [
      "1"
     ],
     "value": 3234147.07,
     "currency": "RON",
     "ronValue": 3234147.07,
     "winners": [
      {
       "name": "ELECTRO-ALFA INTERNATIONAL",
       "cui": "7348194",
       "sme": false,
       "city": "Botosani"
      }
     ],
     "modified": 0,
     "framework": "Contract de achizitii publice",
     "estimate": 3293041,
     "lowest": null,
     "highest": null,
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
     "group": false,
     "startDate": "2023-01-04"
    }
   ],
   "versions": [
    {
     "date": "2026-03-11T15:00:05+02:00",
     "state": "Publicat",
     "correcting": false,
     "modification": true
    },
    {
     "date": "2026-01-27T13:03:27+02:00",
     "state": "Retras",
     "correcting": true,
     "modification": false
    },
    {
     "date": "2025-12-22T13:05:09+02:00",
     "state": "Retras",
     "correcting": false,
     "modification": true
    },
    {
     "date": "2025-12-17T13:03:59+02:00",
     "state": "Retras",
     "correcting": false,
     "modification": true
    },
    {
     "date": "2023-06-26T15:34:13+03:00",
     "state": "Retras",
     "correcting": false,
     "modification": true
    },
    {
     "date": "2023-01-22T13:01:25+02:00",
     "state": "Retras",
     "correcting": false,
     "modification": false
    }
   ]
  },
  "names": {
   "labels": [
    [
     "29275212",
     "AGENTIA NATIONALA DE IMBUNATATIRI FUNCIARE"
    ]
   ],
   "cpv": [
    {
     "code": "45232120",
     "ro": "Lucrări de irigaţie",
     "en": "Irrigation works"
    }
   ]
  }
 },
 "sibiu-negociere": {
  "label": "Sibiu, salubrizare — negociere fără anunț, după o licitație contestată",
  "procedure": {
   "id": "358744",
   "noticeNo": "CAN1165498",
   "noticeKind": "award_no_init",
   "procedureType": "Negociere fara publicare prealabila",
   "contractKind": null,
   "title": "„ACTIVITĂŢI DE SALUBRIZARE STRADALĂ ȘI DESZĂPEZIRE ÎN MUNICIPIUL SIBIU ȘI STAȚIUNEA PĂLTINIȘ”",
   "authority": {
    "cui": "4270740",
    "name": "Municipiul Sibiu"
   },
   "cpvCode": "90610000",
   "estimatedValueRon": "46134632.78",
   "awardedValueRon": "46134632.78",
   "currency": "RON",
   "status": "awarded",
   "publicationDate": null,
   "stateDate": null,
   "sourceSystem": "elicitatie",
   "sourceUrl": "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100620734",
   "valueAccepted": true
  },
  "contracts": [
   {
    "id": "51426958",
    "contractNo": "31",
    "contractDate": "2026-04-02",
    "title": "„ACTIVITĂŢI DE SALUBRIZARE STRADALĂ ȘI DESZĂPEZIRE ÎN MUNICIPIUL SIBIU ȘI STAȚIUNEA PĂLTINIȘ”",
    "authority": {
     "cui": "4270740",
     "name": "Municipiul Sibiu"
    },
    "supplier": {
     "cui": "946778",
     "name": "SOMA"
    },
    "valueRon": "46134632.78",
    "valueAccepted": true,
    "valueState": "official_exact",
    "recordKind": "contract_award"
   }
  ],
  "ted": null,
  "notice": null,
  "linked": [
   {
    "row": {
     "id": "579111",
     "noticeNo": "CN1089166",
     "noticeKind": "initiation",
     "procedureType": "Licitatie deschisa",
     "contractKind": "services",
     "title": "SERVICIUL PUBLIC DE SALUBRIZARE ÎN MUNICIPIUL SIBIU ȘI STAȚIUNEA PĂLTINIȘ - ACTIVITĂȚI DE SALUBRIZARE STRADALĂ ȘI DESZĂPEZIRE",
     "authority": {
      "cui": "4270740",
      "name": "Municipiul Sibiu"
     },
     "cpvCode": "90610000",
     "estimatedValueRon": "92368100.00",
     "awardedValueRon": null,
     "currency": "RON",
     "status": "suspended",
     "publicationDate": null,
     "stateDate": null,
     "sourceSystem": "seap_notice",
     "sourceUrl": "https://data.gov.ro/dataset/e8d22de4-f8ce-4b42-8561-98d2481ddef9/resource/5720192a-dc9a-428f-9ac6-bd055a06da95/download/raport-anunturi-de-initiere-publicate-ti-2026.xlsx",
     "valueAccepted": false
    },
    "tie": "named-in-reason"
   }
  ],
  "source": {
   "caNoticeId": "100620734",
   "title": "„ACTIVITĂŢI DE SALUBRIZARE STRADALĂ ȘI DESZĂPEZIRE ÎN MUNICIPIUL SIBIU ȘI STAȚIUNEA PĂLTINIȘ”",
   "reference": "4270740_2026_PAAPD1607016",
   "contractType": "Servicii",
   "authorityType": "Municipiu",
   "legislation": "Legea nr. 98/23.05.2016",
   "procedureType": "Negociere fara publicare prealabila",
   "framework": false,
   "call": null,
   "ted": null,
   "totalEstimate": 46134632.78,
   "lotsEstimate": null,
   "frameworkValue": 0,
   "annexD": {
    "explanation": "Autoritatea Contractantă a demarat licitatia deschisă CN1089166 din 23.01.2026 care este contestata. Astfel, Autoritatea Contractanta a demarat negociere fara publicare pentru incheierea unui contract care va fi valabil pana la atribuirea contractului prin licitatie",
    "forceMajeure": true
   },
   "lots": [
    {
     "no": "1",
     "title": "Lot implicit",
     "cpv": "90610000-6 Servicii de curatare si maturare a strazilor (Rev.2)",
     "place": "RO126 Sibiu",
     "estimate": null,
     "currency": null,
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 24,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    }
   ],
   "contracts": [
    {
     "id": "107494123",
     "no": "31",
     "date": "2026-04-03",
     "title": "„ACTIVITĂŢI DE SALUBRIZARE STRADALĂ ȘI DESZĂPEZIRE ÎN MUNICIPIUL SIBIU ȘI STAȚIUNEA PĂLTINIȘ”",
     "lots": [],
     "value": 46134632.78,
     "currency": "RON",
     "ronValue": 46134632.78,
     "winners": [
      {
       "name": "SOMA",
       "cui": "946778",
       "sme": false,
       "city": "Cisnadie"
      }
     ],
     "modified": 0,
     "framework": "Contract de achizitii publice",
     "estimate": 46184050,
     "lowest": null,
     "highest": null,
     "offers": {
      "received": 1,
      "sme": null,
      "eu": 0,
      "nonEu": 0,
      "electronic": 0
     },
     "lotOffers": [],
     "group": false,
     "startDate": "2026-04-03"
    }
   ],
   "versions": [
    {
     "date": "2026-04-06T09:39:40+03:00",
     "state": "Publicat",
     "correcting": false,
     "modification": false
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
   "cpv": [
    {
     "code": "90610000",
     "ro": "Servicii de curăţare şi măturare a străzilor",
     "en": "Street-cleaning and sweeping services"
    }
   ]
  }
 },
 "sibiu-apel": {
  "label": "Sibiu, salubrizare — licitația suspendată",
  "procedure": {
   "id": "579111",
   "noticeNo": "CN1089166",
   "noticeKind": "initiation",
   "procedureType": "Licitatie deschisa",
   "contractKind": "services",
   "title": "SERVICIUL PUBLIC DE SALUBRIZARE ÎN MUNICIPIUL SIBIU ȘI STAȚIUNEA PĂLTINIȘ - ACTIVITĂȚI DE SALUBRIZARE STRADALĂ ȘI DESZĂPEZIRE",
   "authority": {
    "cui": "4270740",
    "name": "Municipiul Sibiu"
   },
   "cpvCode": "90610000",
   "estimatedValueRon": "92368100.00",
   "awardedValueRon": null,
   "currency": "RON",
   "status": "suspended",
   "publicationDate": null,
   "stateDate": null,
   "sourceSystem": "seap_notice",
   "sourceUrl": "https://data.gov.ro/dataset/e8d22de4-f8ce-4b42-8561-98d2481ddef9/resource/5720192a-dc9a-428f-9ac6-bd055a06da95/download/raport-anunturi-de-initiere-publicate-ti-2026.xlsx",
   "valueAccepted": false
  },
  "contracts": [],
  "ted": null,
  "notice": null,
  "linked": [
   {
    "row": {
     "id": "358744",
     "noticeNo": "CAN1165498",
     "noticeKind": "award_no_init",
     "procedureType": "Negociere fara publicare prealabila",
     "contractKind": null,
     "title": "„ACTIVITĂŢI DE SALUBRIZARE STRADALĂ ȘI DESZĂPEZIRE ÎN MUNICIPIUL SIBIU ȘI STAȚIUNEA PĂLTINIȘ”",
     "authority": {
      "cui": "4270740",
      "name": "Municipiul Sibiu"
     },
     "cpvCode": "90610000",
     "estimatedValueRon": "46134632.78",
     "awardedValueRon": "46134632.78",
     "currency": "RON",
     "status": "awarded",
     "publicationDate": null,
     "stateDate": null,
     "sourceSystem": "elicitatie",
     "sourceUrl": "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100620734",
     "valueAccepted": true
    },
    "tie": "names-in-reason"
   }
  ],
  "source": null,
  "reason": {
   "explanation": "Autoritatea Contractantă a demarat licitatia deschisă CN1089166 din 23.01.2026 care este contestata. Astfel, Autoritatea Contractanta a demarat negociere fara publicare pentru incheierea unui contract care va fi valabil pana la atribuirea contractului prin licitatie",
   "forceMajeure": true
  },
  "names": {
   "labels": [
    [
     "4270740",
     "MUNICIPIUL SIBIU"
    ]
   ],
   "cpv": [
    {
     "code": "90610000",
     "ro": "Servicii de curăţare şi măturare a străzilor",
     "en": "Street-cleaning and sweeping services"
    }
   ]
  }
 },
 "cnir": {
  "label": "CNIR, autostrada Târgu Mureș–Târgu Neamț — o asociere, 6,1 mld.",
  "procedure": {
   "id": "337399",
   "noticeNo": "CAN1145385",
   "noticeKind": "award_no_init",
   "procedureType": "Licitatie deschisa",
   "contractKind": null,
   "title": "Proiectare și Execuție AUTOSTRADA TARGU MURES-TARGU NEAMT SECTIUNEA II MIERCUREA NIRAJULUI – LEGHIN LOT 2 A: DITRAU-GRINTIES.",
   "authority": {
    "cui": "36727850",
    "name": "COMPANIA NATIONALA DE INVESTITII RUTIERE S.A."
   },
   "cpvCode": "45233100",
   "estimatedValueRon": "6142792901.06",
   "awardedValueRon": "6142792901.06",
   "currency": "RON",
   "status": "awarded",
   "publicationDate": null,
   "stateDate": null,
   "sourceSystem": "elicitatie",
   "sourceUrl": "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100578781",
   "valueAccepted": true
  },
  "contracts": [
   {
    "id": "2435981",
    "contractNo": "101/1888",
    "contractDate": "2025-03-31",
    "title": null,
    "authority": {
     "cui": "36727850",
     "name": "COMPANIA NATIONALA DE INVESTITII RUTIERE S.A."
    },
    "supplier": {
     "cui": null,
     "name": "Euro-Asfalt"
    },
    "valueRon": "6142792901.00",
    "valueAccepted": true,
    "valueState": "official_exact",
    "recordKind": "contract_award"
   },
   {
    "id": "2137333",
    "contractNo": "101/1888",
    "contractDate": "2025-03-31",
    "title": null,
    "authority": {
     "cui": "36727850",
     "name": "COMPANIA NATIONALA DE INVESTITII RUTIERE S.A."
    },
    "supplier": {
     "cui": "17042060",
     "name": "TEHNOSTRADE S.R.L."
    },
    "valueRon": "6142792901.00",
    "valueAccepted": true,
    "valueState": "official_exact",
    "recordKind": "contract_award"
   },
   {
    "id": "2137332",
    "contractNo": "101/1888",
    "contractDate": "2025-03-31",
    "title": null,
    "authority": {
     "cui": "36727850",
     "name": "COMPANIA NATIONALA DE INVESTITII RUTIERE S.A."
    },
    "supplier": {
     "cui": "9942680",
     "name": "SPEDITION UMB"
    },
    "valueRon": "6142792901.00",
    "valueAccepted": true,
    "valueState": "official_exact",
    "recordKind": "contract_award"
   },
   {
    "id": "2137331",
    "contractNo": "101/1888",
    "contractDate": "2025-03-31",
    "title": null,
    "authority": {
     "cui": "36727850",
     "name": "COMPANIA NATIONALA DE INVESTITII RUTIERE S.A."
    },
    "supplier": {
     "cui": "31994414",
     "name": "SA & PE CONSTRUCT SRL"
    },
    "valueRon": "6142792901.00",
    "valueAccepted": false,
    "valueState": "conflicting_sources",
    "recordKind": "contract_award"
   },
   {
    "id": "2137330",
    "contractNo": "101/1888",
    "contractDate": "2025-03-31",
    "title": null,
    "authority": {
     "cui": "36727850",
     "name": "COMPANIA NATIONALA DE INVESTITII RUTIERE S.A."
    },
    "supplier": {
     "cui": null,
     "name": "Euro-Asfalt"
    },
    "valueRon": "6142792901.00",
    "valueAccepted": true,
    "valueState": "official_exact",
    "recordKind": "contract_award"
   }
  ],
  "ted": "644509-2025",
  "notice": null,
  "linked": [
   {
    "row": {
     "id": "4089001",
     "noticeNo": "CN1074946",
     "noticeKind": "initiation",
     "procedureType": "Licitatie deschisa",
     "contractKind": "works",
     "title": "Proiectare și Execuție AUTOSTRADA TARGU MURES-TARGU NEAMT SECTIUNEA II MIERCUREA NIRAJULUI – LEGHIN \nLOT 2 A: DITRAU-GRINTIES.",
     "authority": {
      "cui": "36727850",
      "name": "COMPANIA NATIONALA DE INVESTITII RUTIERE S.A."
     },
     "cpvCode": "45233100",
     "estimatedValueRon": "7579615950.00",
     "awardedValueRon": null,
     "currency": "RON",
     "status": "in_evaluation",
     "publicationDate": "2024-10-31",
     "stateDate": null,
     "sourceSystem": "seap_notice",
     "sourceUrl": "https://data.gov.ro/dataset/ed84773a-06c6-4016-ad59-8f1d06b8ec1d/resource/9c3607d4-eb68-47a7-a386-85659d13d3cc/download/datagov-raport-anunturi-de-initiere-publicate-t-iv_2024.xlsx",
     "valueAccepted": false
    },
    "tie": "call"
   }
  ],
  "source": {
   "caNoticeId": "100578781",
   "title": "Proiectare și Execuție AUTOSTRADA TARGU MURES-TARGU NEAMT SECTIUNEA II MIERCUREA NIRAJULUI – LEGHIN \nLOT 2 A: DITRAU-GRINTIES.",
   "reference": "101/2898/09.10.2024 poz.1",
   "contractType": "Lucrari",
   "authorityType": "Organism de drept public",
   "legislation": "Legea nr. 98/23.05.2016",
   "procedureType": "Licitatie deschisa",
   "framework": false,
   "call": {
    "no": "CN1074946",
    "date": "2024-10-31"
   },
   "ted": "644509-2025",
   "totalEstimate": 6142792901.06,
   "lotsEstimate": null,
   "frameworkValue": 0,
   "annexD": {
    "explanation": null,
    "forceMajeure": false
   },
   "lots": [
    {
     "no": "1",
     "title": "Lot implicit",
     "cpv": "45233100-0 Lucrari de constructii de autostrazi si de drumuri (Rev.2)",
     "place": "RO124 Harghita",
     "estimate": null,
     "currency": "Leu",
     "criterion": "Cel mai bun raport calitate – pret",
     "criteria": [
      {
       "name": "Pretul ofertei",
       "weight": 40,
       "price": true
      },
      {
       "name": "Metodologia de realizare a contractului si planificarea resurselor tehnice si umane in corelare cu specificul si complexitatea activitatilor",
       "weight": 10,
       "price": false
      },
      {
       "name": "Utilizarea BIM (Building Information Modelling) in cadrul activitatilor care fac obiectul Contractului",
       "weight": 6,
       "price": false
      },
      {
       "name": "Experienta Inginerului Proiectant Drumuri",
       "weight": 5,
       "price": false
      },
      {
       "name": "Experienta detinuta de INGINERUL PROIECTANT DE PODURI",
       "weight": 5,
       "price": false
      },
      {
       "name": "Experienta detinuta de SEFUL ECHIPEI DE PROIECTARE",
       "weight": 6,
       "price": false
      },
      {
       "name": "Cresterea incluziunii sociale",
       "weight": 6,
       "price": false
      },
      {
       "name": "Emisii de CO2 / Schimbari climatice – Materiale sustenabile pentru constructii",
       "weight": 5,
       "price": false
      },
      {
       "name": "Emisii de CO2 / Schimbari climatice – utilaje sustenabile pentru constructii",
       "weight": 5,
       "price": false
      },
      {
       "name": "Experienta detinuta de MANAGERUL DE PROIECT",
       "weight": 7,
       "price": false
      },
      {
       "name": "Experienta Inginer Proiectant Tuneluri",
       "weight": 5,
       "price": false
      }
     ],
     "months": 114,
     "days": null,
     "financing": "Program / Proiect",
     "status": "Atribuit"
    }
   ],
   "contracts": [
    {
     "id": "106827696",
     "no": "101/1888",
     "date": "2025-03-31",
     "title": "Proiectare si Executie AUTOSTRADA TARGU MURES - TARGU NEAMT SECTIUNEA II MIERCUREA NIRAJULUI – LEGHIN LOT 2A: DITRAU - GRINTIES",
     "lots": [
      "1"
     ],
     "value": 6142792901.06,
     "currency": "RON",
     "ronValue": 6142792901.06,
     "winners": [
      {
       "name": "SA & PE CONSTRUCT SRL",
       "cui": "31994414",
       "sme": false,
       "city": "Bacau"
      },
      {
       "name": "TEHNOSTRADE S.R.L.",
       "cui": "17042060",
       "sme": false,
       "city": "Bacau"
      },
      {
       "name": "SPEDITION UMB",
       "cui": "9942680",
       "sme": false,
       "city": "Bacau"
      },
      {
       "name": "Euro-Asfalt",
       "cui": null,
       "sme": true,
       "city": "Bahnari"
      }
     ],
     "modified": 1,
     "framework": "Contract de achizitii publice",
     "estimate": 7579615950.64,
     "lowest": null,
     "highest": null,
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
     "group": true,
     "startDate": "2025-03-31"
    }
   ],
   "versions": [
    {
     "date": "2025-10-01T13:02:24+03:00",
     "state": "Publicat",
     "correcting": false,
     "modification": true
    },
    {
     "date": "2025-04-17T13:03:32+03:00",
     "state": "Retras",
     "correcting": false,
     "modification": false
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
   "cpv": [
    {
     "code": "45233100",
     "ro": "Lucrări de construcţii de autostrăzi şi de drumuri",
     "en": "Construction work for highways, roads"
    }
   ]
  }
 },
 "pascani": {
  "label": "CNAIR, autostrada Pașcani–Suceava — licitație deschisă, TED",
  "procedure": {
   "id": "362314",
   "noticeNo": "CAN1167178",
   "noticeKind": "award_no_init",
   "procedureType": "Licitatie deschisa",
   "contractKind": null,
   "title": "PROIECTARE SI EXECUTIE \"AUTOSTRADA PASCANI – SUCEAVA LOT 1\"",
   "authority": {
    "cui": "16054368",
    "name": "COMPANIA NATIONALA DE ADMINISTRARE A INFRASTRUCTURII RUTIERE S.A."
   },
   "cpvCode": "45233100",
   "estimatedValueRon": "3068398862.94",
   "awardedValueRon": "3068398862.94",
   "currency": "RON",
   "status": "awarded",
   "publicationDate": null,
   "stateDate": null,
   "sourceSystem": "elicitatie",
   "sourceUrl": "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100626163",
   "valueAccepted": true
  },
  "contracts": [
   {
    "id": "51025676",
    "contractNo": "92/58718",
    "contractDate": "2026-04-29",
    "title": "Proiectare si Executie “Autostrada Pascani-Suceava Lot 1”",
    "authority": {
     "cui": "16054368",
     "name": "COMPANIA NATIONALA DE ADMINISTRARE A INFRASTRUCTURII RUTIERE S.A."
    },
    "supplier": {
     "cui": "17042060",
     "name": "TEHNOSTRADE S.R.L."
    },
    "valueRon": "3068398862.94",
    "valueAccepted": true,
    "valueState": "official_exact",
    "recordKind": "contract_award"
   }
  ],
  "ted": "313170-2026",
  "notice": null,
  "linked": [
   {
    "row": {
     "id": "525208",
     "noticeNo": "CN1071176",
     "noticeKind": "initiation",
     "procedureType": "Licitatie deschisa",
     "contractKind": "works",
     "title": "PROIECTARE SI EXECUTIE \"AUTOSTRADA PASCANI – SUCEAVA LOT 1\"",
     "authority": {
      "cui": "16054368",
      "name": "COMPANIA NATIONALA DE ADMINISTRARE A INFRASTRUCTURII RUTIERE S.A."
     },
     "cpvCode": "45233100",
     "estimatedValueRon": "4300406164.00",
     "awardedValueRon": null,
     "currency": "RON",
     "status": "in_evaluation",
     "publicationDate": "2024-07-18",
     "stateDate": null,
     "sourceSystem": "seap_notice",
     "sourceUrl": "https://data.gov.ro/dataset/ed84773a-06c6-4016-ad59-8f1d06b8ec1d/resource/98b99e9d-b73f-4701-9ed9-1c541ff6d856/download/datagov-raport-anunturi-de-initiere-publicate-tiii.xls",
     "valueAccepted": false
    },
    "tie": "call"
   }
  ],
  "source": {
   "caNoticeId": "100626163",
   "title": "PROIECTARE SI EXECUTIE \"AUTOSTRADA PASCANI – SUCEAVA LOT 1\"",
   "reference": "16054368/2024/3877/S13",
   "contractType": "Lucrari",
   "authorityType": "Organism de drept public",
   "legislation": "Legea nr. 98/23.05.2016",
   "procedureType": "Licitatie deschisa",
   "framework": false,
   "call": {
    "no": "CN1071176",
    "date": "2024-07-18"
   },
   "ted": "313170-2026",
   "totalEstimate": 3068398862.94,
   "lotsEstimate": null,
   "frameworkValue": 0,
   "annexD": {
    "explanation": null,
    "forceMajeure": false
   },
   "lots": [
    {
     "no": "1",
     "title": "Lot implicit",
     "cpv": "45233100-0 Lucrari de constructii de autostrazi si de drumuri (Rev.2)",
     "place": "RO321 Bucureşti",
     "estimate": null,
     "currency": "Leu",
     "criterion": "Cel mai bun raport calitate – pret",
     "criteria": [
      {
       "name": "Perioada de garantie a lucrarilor",
       "weight": 12,
       "price": false
      },
      {
       "name": "Pretul ofertei",
       "weight": 40,
       "price": true
      },
      {
       "name": "Experienta detinuta de MANAGERUL DE PROIECT",
       "weight": 7,
       "price": false
      },
      {
       "name": "Experienta detinuta de SEFUL ECHIPEI DE PROIECTARE",
       "weight": 7,
       "price": false
      },
      {
       "name": "Metodologia de realizare a contractului si planificarea resurselor tehnice si umane in corelare cu specificul si complexitatea activitatilor",
       "weight": 18,
       "price": false
      },
      {
       "name": "Experienta detinuta de INGINERUL PROIECTANT DE PODURI",
       "weight": 9,
       "price": false
      },
      {
       "name": "Experienta detinuta de INGINERUL PROIECTANT DE DRUMURI",
       "weight": 7,
       "price": false
      }
     ],
     "months": 90,
     "days": null,
     "financing": "Program / Proiect",
     "status": "Atribuit"
    }
   ],
   "contracts": [
    {
     "id": "107592691",
     "no": "92/58718",
     "date": "2026-04-30",
     "title": "Proiectare si Executie “Autostrada Pascani-Suceava Lot 1”",
     "lots": [
      "1"
     ],
     "value": 3068398862.94,
     "currency": "RON",
     "ronValue": 3068398862.94,
     "winners": [
      {
       "name": "TEHNOSTRADE S.R.L.",
       "cui": "17042060",
       "sme": false,
       "city": "Bacau"
      },
      {
       "name": "SA & PE CONSTRUCT SRL",
       "cui": "31994414",
       "sme": false,
       "city": "Bacau"
      },
      {
       "name": "SPEDITION UMB",
       "cui": "9942680",
       "sme": false,
       "city": "Bacau"
      }
     ],
     "modified": 0,
     "framework": "Contract de achizitii publice",
     "estimate": 4300406164.41,
     "lowest": null,
     "highest": null,
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
     "group": true,
     "startDate": "2026-04-30"
    }
   ],
   "versions": [
    {
     "date": "2026-05-07T13:02:43+03:00",
     "state": "Publicat",
     "correcting": false,
     "modification": false
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
   "cpv": [
    {
     "code": "45233100",
     "ro": "Lucrări de construcţii de autostrăzi şi de drumuri",
     "en": "Construction work for highways, roads"
    }
   ]
  }
 },
 "caracal": {
  "label": "Spitalul Caracal, medicamente — 44 de loturi, acorduri-cadru",
  "procedure": {
   "id": "352140",
   "noticeNo": "CAN1150526",
   "noticeKind": "award_no_init",
   "procedureType": "Licitatie deschisa",
   "contractKind": null,
   "title": "Acord-cadru 48 de luni furnizare Produse farmaceutice (medicamente pentru tract digestiv, dermatologie, sistem genito-urinar si altele)",
   "authority": {
    "cui": "4395086",
    "name": "SPITALUL MUNICIPAL CARACAL"
   },
   "cpvCode": "33600000",
   "estimatedValueRon": "557085.90",
   "awardedValueRon": "557085.90",
   "currency": "RON",
   "status": "awarded",
   "publicationDate": null,
   "stateDate": null,
   "sourceSystem": "elicitatie",
   "sourceUrl": "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100608344",
   "valueAccepted": true
  },
  "contracts": [
   {
    "id": "2673742",
    "contractNo": "604",
    "contractDate": "2025-12-11",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3596251",
     "name": "DONA. LOGISTICA"
    },
    "valueRon": "4860.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673697",
    "contractNo": "386",
    "contractDate": "2025-10-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3024756",
     "name": "FELSIN FARM"
    },
    "valueRon": "57969.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673779",
    "contractNo": "474",
    "contractDate": "2025-08-09",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "94800.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673766",
    "contractNo": "380",
    "contractDate": "2025-08-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "11653560",
     "name": "COMPANIA NATIONALA UNIFARM"
    },
    "valueRon": "76944.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673656",
    "contractNo": "379",
    "contractDate": "2025-08-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "335278",
     "name": "FARMEXIM S.A."
    },
    "valueRon": "7030.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673686",
    "contractNo": "506",
    "contractDate": "2025-07-10",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "61440.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673693",
    "contractNo": "376",
    "contractDate": "2025-07-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "101364.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673689",
    "contractNo": "378",
    "contractDate": "2025-07-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3596251",
     "name": "DONA. LOGISTICA"
    },
    "valueRon": "12432.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673668",
    "contractNo": "377",
    "contractDate": "2025-07-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "17160.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673660",
    "contractNo": "375",
    "contractDate": "2025-07-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "115509.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "51214497",
    "contractNo": "364.30",
    "contractDate": "2025-06-30",
    "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "34464.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "51214496",
    "contractNo": "364.20",
    "contractDate": "2025-06-30",
    "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3596251",
     "name": "DONA. LOGISTICA"
    },
    "valueRon": "19200.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "51214472",
    "contractNo": "364.10",
    "contractDate": "2025-06-30",
    "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "16632.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "51214453",
    "contractNo": "364.40",
    "contractDate": "2025-06-30",
    "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "335278",
     "name": "FARMEXIM S.A."
    },
    "valueRon": "273600.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673722",
    "contractNo": "627",
    "contractDate": "2025-03-12",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "559.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673770",
    "contractNo": "623",
    "contractDate": "2025-02-12",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "13591928",
     "name": "Pharma"
    },
    "valueRon": "2688.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321073",
    "contractNo": "364.9",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "13591928",
     "name": "Pharma"
    },
    "valueRon": "6316.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321072",
    "contractNo": "364.9",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "6316.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321071",
    "contractNo": "364.9",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3596251",
     "name": "DONA. LOGISTICA"
    },
    "valueRon": "6316.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321070",
    "contractNo": "364.7",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3024756",
     "name": "FELSIN FARM"
    },
    "valueRon": "36000.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321069",
    "contractNo": "364.7",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3596251",
     "name": "DONA. LOGISTICA"
    },
    "valueRon": "36000.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321068",
    "contractNo": "364.7",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "36000.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321067",
    "contractNo": "364.6",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "357840.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321066",
    "contractNo": "364.6",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "1199107",
     "name": "BIOEEL"
    },
    "valueRon": "357840.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321065",
    "contractNo": "364.6",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "357840.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321064",
    "contractNo": "364.5",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "13591928",
     "name": "Pharma"
    },
    "valueRon": "2486.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321063",
    "contractNo": "364.5",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "2486.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321062",
    "contractNo": "364.5",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "2486.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321061",
    "contractNo": "364.43",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "13591928",
     "name": "Pharma"
    },
    "valueRon": "268560.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321060",
    "contractNo": "364.42",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "11653560",
     "name": "COMPANIA NATIONALA UNIFARM"
    },
    "valueRon": "17952.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321059",
    "contractNo": "364.41",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "5919650",
     "name": "Prisum Healthcare"
    },
    "valueRon": "615360.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321058",
    "contractNo": "364.41",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "335278",
     "name": "FARMEXIM S.A."
    },
    "valueRon": "615360.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321057",
    "contractNo": "364.41",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "11653560",
     "name": "COMPANIA NATIONALA UNIFARM"
    },
    "valueRon": "615360.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321056",
    "contractNo": "364.4",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "335278",
     "name": "FARMEXIM S.A."
    },
    "valueRon": "273600.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321055",
    "contractNo": "364.4",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "273600.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321054",
    "contractNo": "364.4",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "273600.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321053",
    "contractNo": "364.39",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3572074",
     "name": "FARMACEUTICA REMEDIA DISTRIBUTION & LOGISTICS S.R.L."
    },
    "valueRon": "927120.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321052",
    "contractNo": "364.39",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "927120.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321051",
    "contractNo": "364.39",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "927120.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321050",
    "contractNo": "364.38",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "20160.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321049",
    "contractNo": "364.38",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "20160.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321048",
    "contractNo": "364.37",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "335278",
     "name": "FARMEXIM S.A."
    },
    "valueRon": "19152.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321047",
    "contractNo": "364.37",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3572074",
     "name": "FARMACEUTICA REMEDIA DISTRIBUTION & LOGISTICS S.R.L."
    },
    "valueRon": "19152.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321046",
    "contractNo": "364.37",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "19152.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321045",
    "contractNo": "364.36",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "13591928",
     "name": "Pharma"
    },
    "valueRon": "528.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321044",
    "contractNo": "364.36",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3024756",
     "name": "FELSIN FARM"
    },
    "valueRon": "528.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321043",
    "contractNo": "364.36",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "528.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321042",
    "contractNo": "364.35",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "583200.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321041",
    "contractNo": "364.35",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3596251",
     "name": "DONA. LOGISTICA"
    },
    "valueRon": "583200.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321040",
    "contractNo": "364.34",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3024756",
     "name": "FELSIN FARM"
    },
    "valueRon": "468000.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   }
  ],
  "ted": "101124-2026",
  "notice": [
   {
    "id": "2673742",
    "contractNo": "604",
    "contractDate": "2025-12-11",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3596251",
     "name": "DONA. LOGISTICA"
    },
    "valueRon": "4860.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673697",
    "contractNo": "386",
    "contractDate": "2025-10-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3024756",
     "name": "FELSIN FARM"
    },
    "valueRon": "57969.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673779",
    "contractNo": "474",
    "contractDate": "2025-08-09",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "94800.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673766",
    "contractNo": "380",
    "contractDate": "2025-08-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "11653560",
     "name": "COMPANIA NATIONALA UNIFARM"
    },
    "valueRon": "76944.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673656",
    "contractNo": "379",
    "contractDate": "2025-08-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "335278",
     "name": "FARMEXIM S.A."
    },
    "valueRon": "7030.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673686",
    "contractNo": "506",
    "contractDate": "2025-07-10",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "61440.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673693",
    "contractNo": "376",
    "contractDate": "2025-07-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "101364.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673689",
    "contractNo": "378",
    "contractDate": "2025-07-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3596251",
     "name": "DONA. LOGISTICA"
    },
    "valueRon": "12432.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673668",
    "contractNo": "377",
    "contractDate": "2025-07-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "17160.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673660",
    "contractNo": "375",
    "contractDate": "2025-07-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "115509.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "51214497",
    "contractNo": "364.30",
    "contractDate": "2025-06-30",
    "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "34464.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "51214496",
    "contractNo": "364.20",
    "contractDate": "2025-06-30",
    "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3596251",
     "name": "DONA. LOGISTICA"
    },
    "valueRon": "19200.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "51214472",
    "contractNo": "364.10",
    "contractDate": "2025-06-30",
    "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "16632.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "51214453",
    "contractNo": "364.40",
    "contractDate": "2025-06-30",
    "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "335278",
     "name": "FARMEXIM S.A."
    },
    "valueRon": "273600.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673722",
    "contractNo": "627",
    "contractDate": "2025-03-12",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "559.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673770",
    "contractNo": "623",
    "contractDate": "2025-02-12",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "13591928",
     "name": "Pharma"
    },
    "valueRon": "2688.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321073",
    "contractNo": "364.9",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "13591928",
     "name": "Pharma"
    },
    "valueRon": "6316.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321072",
    "contractNo": "364.9",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "6316.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321071",
    "contractNo": "364.9",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3596251",
     "name": "DONA. LOGISTICA"
    },
    "valueRon": "6316.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321070",
    "contractNo": "364.7",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3024756",
     "name": "FELSIN FARM"
    },
    "valueRon": "36000.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321069",
    "contractNo": "364.7",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3596251",
     "name": "DONA. LOGISTICA"
    },
    "valueRon": "36000.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321068",
    "contractNo": "364.7",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "36000.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321067",
    "contractNo": "364.6",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "357840.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321066",
    "contractNo": "364.6",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "1199107",
     "name": "BIOEEL"
    },
    "valueRon": "357840.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321065",
    "contractNo": "364.6",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "357840.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321064",
    "contractNo": "364.5",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "13591928",
     "name": "Pharma"
    },
    "valueRon": "2486.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321063",
    "contractNo": "364.5",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "2486.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321062",
    "contractNo": "364.5",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "2486.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321061",
    "contractNo": "364.43",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "13591928",
     "name": "Pharma"
    },
    "valueRon": "268560.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321060",
    "contractNo": "364.42",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "11653560",
     "name": "COMPANIA NATIONALA UNIFARM"
    },
    "valueRon": "17952.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321059",
    "contractNo": "364.41",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "5919650",
     "name": "Prisum Healthcare"
    },
    "valueRon": "615360.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321058",
    "contractNo": "364.41",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "335278",
     "name": "FARMEXIM S.A."
    },
    "valueRon": "615360.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321057",
    "contractNo": "364.41",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "11653560",
     "name": "COMPANIA NATIONALA UNIFARM"
    },
    "valueRon": "615360.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321056",
    "contractNo": "364.4",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "335278",
     "name": "FARMEXIM S.A."
    },
    "valueRon": "273600.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321055",
    "contractNo": "364.4",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "273600.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321054",
    "contractNo": "364.4",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "273600.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321053",
    "contractNo": "364.39",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3572074",
     "name": "FARMACEUTICA REMEDIA DISTRIBUTION & LOGISTICS S.R.L."
    },
    "valueRon": "927120.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321052",
    "contractNo": "364.39",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "927120.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321051",
    "contractNo": "364.39",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "927120.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321050",
    "contractNo": "364.38",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "20160.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321049",
    "contractNo": "364.38",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "20160.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321048",
    "contractNo": "364.37",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "335278",
     "name": "FARMEXIM S.A."
    },
    "valueRon": "19152.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321047",
    "contractNo": "364.37",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3572074",
     "name": "FARMACEUTICA REMEDIA DISTRIBUTION & LOGISTICS S.R.L."
    },
    "valueRon": "19152.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321046",
    "contractNo": "364.37",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "19152.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321045",
    "contractNo": "364.36",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "13591928",
     "name": "Pharma"
    },
    "valueRon": "528.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321044",
    "contractNo": "364.36",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3024756",
     "name": "FELSIN FARM"
    },
    "valueRon": "528.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321043",
    "contractNo": "364.36",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "528.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321042",
    "contractNo": "364.35",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "583200.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321041",
    "contractNo": "364.35",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3596251",
     "name": "DONA. LOGISTICA"
    },
    "valueRon": "583200.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321040",
    "contractNo": "364.34",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3024756",
     "name": "FELSIN FARM"
    },
    "valueRon": "468000.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321039",
    "contractNo": "364.34",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "1199107",
     "name": "BIOEEL"
    },
    "valueRon": "468000.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321038",
    "contractNo": "364.34",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "468000.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321037",
    "contractNo": "364.33",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "2928.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321036",
    "contractNo": "364.32",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "335278",
     "name": "FARMEXIM S.A."
    },
    "valueRon": "124320.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321035",
    "contractNo": "364.32",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "1199107",
     "name": "BIOEEL"
    },
    "valueRon": "124320.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321034",
    "contractNo": "364.32",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "124320.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321033",
    "contractNo": "364.3",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "34464.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321032",
    "contractNo": "364.3",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "34464.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321031",
    "contractNo": "364.3",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "17568.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321030",
    "contractNo": "364.3",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "335278",
     "name": "FARMEXIM S.A."
    },
    "valueRon": "17568.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321029",
    "contractNo": "364.3",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3596251",
     "name": "DONA. LOGISTICA"
    },
    "valueRon": "17568.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321028",
    "contractNo": "364.29",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "335278",
     "name": "FARMEXIM S.A."
    },
    "valueRon": "27144.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321027",
    "contractNo": "364.29",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "27144.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321026",
    "contractNo": "364.29",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "27144.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321025",
    "contractNo": "364.28",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "13591928",
     "name": "Pharma"
    },
    "valueRon": "4507.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321024",
    "contractNo": "364.28",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "4507.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321023",
    "contractNo": "364.28",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "4507.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321022",
    "contractNo": "364.26",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "24240.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321021",
    "contractNo": "364.26",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "24240.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321020",
    "contractNo": "364.25",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3024756",
     "name": "FELSIN FARM"
    },
    "valueRon": "18480.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321019",
    "contractNo": "364.25",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3596251",
     "name": "DONA. LOGISTICA"
    },
    "valueRon": "18480.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321018",
    "contractNo": "364.25",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "1199107",
     "name": "BIOEEL"
    },
    "valueRon": "18480.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321017",
    "contractNo": "364.24",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "72000.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321016",
    "contractNo": "364.24",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3024756",
     "name": "FELSIN FARM"
    },
    "valueRon": "72000.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321015",
    "contractNo": "364.24",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3596251",
     "name": "DONA. LOGISTICA"
    },
    "valueRon": "72000.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321014",
    "contractNo": "364.23",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "335278",
     "name": "FARMEXIM S.A."
    },
    "valueRon": "162720.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321013",
    "contractNo": "364.23",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "162720.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321012",
    "contractNo": "364.23",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "162720.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321011",
    "contractNo": "364.22",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "5256.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321010",
    "contractNo": "364.22",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3024756",
     "name": "FELSIN FARM"
    },
    "valueRon": "5256.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321009",
    "contractNo": "364.22",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "5256.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321008",
    "contractNo": "364.21",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3024756",
     "name": "FELSIN FARM"
    },
    "valueRon": "68400.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321007",
    "contractNo": "364.21",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "335278",
     "name": "FARMEXIM S.A."
    },
    "valueRon": "68400.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321006",
    "contractNo": "364.21",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "68400.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321005",
    "contractNo": "364.2",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "19200.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321004",
    "contractNo": "364.2",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3596251",
     "name": "DONA. LOGISTICA"
    },
    "valueRon": "19200.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321003",
    "contractNo": "364.2",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "335278",
     "name": "FARMEXIM S.A."
    },
    "valueRon": "310560.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321002",
    "contractNo": "364.2",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "11653560",
     "name": "COMPANIA NATIONALA UNIFARM"
    },
    "valueRon": "310560.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321001",
    "contractNo": "364.2",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "310560.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2321000",
    "contractNo": "364.19",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "10200.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2320999",
    "contractNo": "364.17",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "13591928",
     "name": "Pharma"
    },
    "valueRon": "23068.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2320998",
    "contractNo": "364.17",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "23068.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2320997",
    "contractNo": "364.17",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "23068.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2320996",
    "contractNo": "364.16",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "44136.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2320995",
    "contractNo": "364.16",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "44136.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2320994",
    "contractNo": "364.15",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "13591928",
     "name": "Pharma"
    },
    "valueRon": "10262.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2320993",
    "contractNo": "364.15",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "10262.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2320992",
    "contractNo": "364.15",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "10262.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2320991",
    "contractNo": "364.14",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "29760.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2320990",
    "contractNo": "364.14",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "3596251",
     "name": "DONA. LOGISTICA"
    },
    "valueRon": "29760.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2320989",
    "contractNo": "364.14",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "1199107",
     "name": "BIOEEL"
    },
    "valueRon": "29760.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2320988",
    "contractNo": "364.13",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "335278",
     "name": "FARMEXIM S.A."
    },
    "valueRon": "18000.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2320987",
    "contractNo": "364.12",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "335278",
     "name": "FARMEXIM S.A."
    },
    "valueRon": "23625.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2320986",
    "contractNo": "364.11",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "9378655",
     "name": "DR.MAX"
    },
    "valueRon": "16387.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2320985",
    "contractNo": "364.11",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "1199107",
     "name": "BIOEEL"
    },
    "valueRon": "16387.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2320984",
    "contractNo": "364.11",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "16387.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2320983",
    "contractNo": "364.1",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "22082443",
     "name": "ND PHARMA S.R.L."
    },
    "valueRon": "16632.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2320982",
    "contractNo": "364.1",
    "contractDate": "2025-01-07",
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "335278",
     "name": "FARMEXIM S.A."
    },
    "valueRon": "16632.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673751",
    "contractNo": "653",
    "contractDate": null,
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "196.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   },
   {
    "id": "2673721",
    "contractNo": "571",
    "contractDate": null,
    "title": null,
    "authority": {
     "cui": "4395086",
     "name": "SPITALUL MUNICIPAL CARACAL"
    },
    "supplier": {
     "cui": "8955860",
     "name": "ALLIANCE HEALTHCARE ROMANIA"
    },
    "valueRon": "4133.00",
    "valueAccepted": false,
    "valueState": "ambiguous_grain",
    "recordKind": "framework_agreement"
   }
  ],
  "linked": [
   {
    "row": {
     "id": "548129",
     "noticeNo": "CN1078907",
     "noticeKind": "initiation",
     "procedureType": "Licitatie deschisa",
     "contractKind": "supplies",
     "title": "Acord-cadru 48 de luni furnizare  Produse farmaceutice (medicamente pentru tract digestiv,  dermatologie, sistem genito-urinar si altele)",
     "authority": {
      "cui": "4395086",
      "name": "SPITALUL MUNICIPAL CARACAL"
     },
     "cpvCode": "33600000",
     "estimatedValueRon": "6586563.00",
     "awardedValueRon": null,
     "currency": "RON",
     "status": "in_evaluation",
     "publicationDate": null,
     "stateDate": null,
     "sourceSystem": "seap_notice",
     "sourceUrl": "https://data.gov.ro/dataset/e0cf7ffc-1fa0-4ffb-a82f-c83981d81f21/resource/6bcc924b-fdb7-482c-91dc-d57751c58b5c/download/datagov_raport_anunturi-de-initiere-publicate_t1_2025.xlsx",
     "valueAccepted": false
    },
    "tie": "call"
   }
  ],
  "source": {
   "caNoticeId": "100608344",
   "title": "Acord-cadru 48 de luni furnizare  Produse farmaceutice (medicamente pentru tract digestiv,  dermatologie, sistem genito-urinar si altele)",
   "reference": "4395086_2025_PAAPD1544193",
   "contractType": "Furnizare",
   "authorityType": "Autoritatea regională sau locală",
   "legislation": "Legea nr. 98/23.05.2016",
   "procedureType": "Licitatie deschisa",
   "framework": true,
   "call": {
    "no": "CN1078907",
    "date": "2025-03-14"
   },
   "ted": "101124-2026",
   "totalEstimate": 557085.9,
   "lotsEstimate": 6586563.36,
   "frameworkValue": 4680134.4,
   "annexD": {
    "explanation": null,
    "forceMajeure": false
   },
   "lots": [
    {
     "no": "44",
     "title": "NATRII CHLORIDUM 5,85%",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 32832,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Anulat"
    },
    {
     "no": "27",
     "title": "METHYLPREDNISOLONUM ACEPONAT",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 40348.8,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Anulat"
    },
    {
     "no": "8",
     "title": "TRIMEBUTINUM\t24 mg/5ml",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 15264,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Anulat"
    },
    {
     "no": "4",
     "title": "INSULINE UMANE (HUMULIN R SAU ECHIVALENT )",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 13416,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Anulat"
    },
    {
     "no": "18",
     "title": "COMBINATII (TRIDERM)",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 1248,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Anulat"
    },
    {
     "no": "1",
     "title": "ACIDUM ASCORBICUM",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 358560,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Anulat"
    },
    {
     "no": "31",
     "title": "VALACYCLOVIRUM \t500 mg\tcp",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 5597.76,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Anulat"
    },
    {
     "no": "26",
     "title": "KETOPROFENUM\t100 mg\tcaps",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 25440,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "14",
     "title": "CHLORZOXAZONUM\t250 mg\tcp",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 32640,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "17",
     "title": "COMBINATII (NEOPREOL) UNGUENT",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 24000,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "19",
     "title": "COMBINATII (BETAMETHASONUM + CLOTRIMAZOL UM + GENTAMICINUM)(TRESY) - crema",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 10260,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "15",
     "title": "COMBINATII (FLUOCINOLONUM + NEOMICINUM) - FLUOCINOLON N",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 11011.2,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "16",
     "title": "COMBINATII (BEPANTHEN\tcrema",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 43200,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "30",
     "title": "OXIMED SPRAY CUTANAT\t59.5 g\ttub",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 36480,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "22",
     "title": "DICLOFENACUM\t100 mg",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 6120,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "34",
     "title": "HYDROCORTISONUM \t100 mg \tflacon",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 483840,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "10",
     "title": "ACICLOVIRUM\t400 mg\tcpr",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 16848,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "13",
     "title": "COMBINATII (ACIDUM FUSIDICUM+ HYDROCORTISONUM) (FUCIDIN H)\t20 mg/10 mg - crema\ttub x 15g",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 19152,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "12",
     "title": "COMBINATII (ACIDUM FUSIDICUM+ BETAMETHASONUM) (FUCICORT)",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 25132.8,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "28",
     "title": "MOMETASONUM - crema",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 7444.8,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "5",
     "title": "METOCLOPRAMIDUM\t10mg",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 2496,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "21",
     "title": "DEXKETOPROFENUM\t50 mg/2 ml",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 168960,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "36",
     "title": "PREDNISONUM\t5 mg",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 624,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "35",
     "title": "HYDROCORTISONUM \t19.6 mg/5ml\tfiola x 5 ml",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 645600,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "23",
     "title": "DICLOFENACUM\t75 mg/3ml",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 185040,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "2",
     "title": "COMBINATII (Clorhidrat de piridoxină, acid D,L-aspartic ) ASPATOFORT",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 348480,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "20",
     "title": "DEXKETOPROFENUM\t25 mg\tcp",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 19200,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "9",
     "title": "ACICLOVIRUM CREMA\t50 mg/g - 5 g\ttub",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 7161.6,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "25",
     "title": "KETOPROFENUM\t100 mg/2 ml\tf x 2 ml",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 25920,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "7",
     "title": "OMEPRAZOLUM\t20 mg\tcp",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 115200,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "3",
     "title": "FAMOTIDINUM\t20 mg",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 18720,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "24",
     "title": "IBUPROFENUM",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 86640,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "29",
     "title": "NEOSTIGMINI METILSULFAS",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 30240,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "40",
     "title": "ACETYLCYSTEINUM\t300 mg/3 ml\tfiola",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 288720,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "43",
     "title": "COMBINATII (SOLUTIE PERFUZABILA RINGER)\t500 ml\tfl",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 270720,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "41",
     "title": "ALBUMINUM HUMANUM",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 652800,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "42",
     "title": "CARBETOCINUM",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 17952,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "6",
     "title": "OMEPRAZOLUM\t40 mg pulb. pt. sol. perf. \tflacon",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 1149840,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "37",
     "title": "CEFAZOLINUM \t1 g\tfl",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 35712,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "33",
     "title": "SULFADIAZINUM (REGEN-AG)\tcrema - \ttub x 50 g",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 2688,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "11",
     "title": "ACICLOVIRUM\t250 mg\tfl - pulb.sol.perf",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 41702.4,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "32",
     "title": "ROCURONIUM BROMIDE\t10 mg/ml - 10 ml\tflacon",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 175680,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "39",
     "title": "HIDROLIZAT DE PROTEINA DIN CREIER DE PORCINA (CEREBROLYSIN)\t20 ml",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 1049040,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    },
    {
     "no": "38",
     "title": "GABAPENTINUM\t300 mg\tcaps",
     "cpv": "33600000-6 Produse farmaceutice (Rev.2)",
     "place": "RO414 Olt",
     "estimate": 38592,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 48,
     "days": null,
     "financing": "Fonduri bugetare",
     "status": "Atribuit"
    }
   ],
   "contracts": [
    {
     "id": "107265309",
     "no": "364.37",
     "date": "2025-07-01",
     "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
     "lots": [
      "37"
     ],
     "value": 19152,
     "currency": "RON",
     "ronValue": 19152,
     "winners": [
      {
       "name": "FARMEXIM S.A.",
       "cui": "335278",
       "sme": false,
       "city": "Bucuresti"
      },
      {
       "name": "ALLIANCE HEALTHCARE ROMANIA",
       "cui": "8955860",
       "sme": false,
       "city": "Bucuresti"
      },
      {
       "name": "FARMACEUTICA REMEDIA DISTRIBUTION & LOGISTICS S.R.L.",
       "cui": "3572074",
       "sme": false,
       "city": "Deva"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 35712,
     "lowest": 14112,
     "highest": 34776,
     "offers": {
      "received": 6,
      "sme": 0,
      "eu": 0,
      "nonEu": 0,
      "electronic": 6
     },
     "lotOffers": [
      {
       "no": "37",
       "admitted": 6,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265310",
     "no": "364.43",
     "date": "2025-07-01",
     "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
     "lots": [
      "43"
     ],
     "value": 268560,
     "currency": "RON",
     "ronValue": 268560,
     "winners": [
      {
       "name": "Pharma",
       "cui": "13591928",
       "sme": false,
       "city": "Iasi"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 270720,
     "lowest": 268560,
     "highest": 268560,
     "offers": {
      "received": 1,
      "sme": 0,
      "eu": 0,
      "nonEu": 0,
      "electronic": 1
     },
     "lotOffers": [
      {
       "no": "43",
       "admitted": 1,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265311",
     "no": "364.33",
     "date": "2025-07-01",
     "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
     "lots": [
      "33"
     ],
     "value": 2928,
     "currency": "RON",
     "ronValue": 2928,
     "winners": [
      {
       "name": "ND PHARMA S.R.L.",
       "cui": "22082443",
       "sme": true,
       "city": "Bacau"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 2688,
     "lowest": 2928,
     "highest": 2928,
     "offers": {
      "received": 2,
      "sme": 1,
      "eu": 0,
      "nonEu": 0,
      "electronic": 2
     },
     "lotOffers": [
      {
       "no": "33",
       "admitted": 1,
       "unaccepted": 1,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265312",
     "no": "364.19",
     "date": "2025-07-01",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "lots": [
      "19"
     ],
     "value": 10200,
     "currency": "RON",
     "ronValue": 10200,
     "winners": [
      {
       "name": "ND PHARMA S.R.L.",
       "cui": "22082443",
       "sme": true,
       "city": "Bacau"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 10260,
     "lowest": 10200,
     "highest": 10200,
     "offers": {
      "received": 1,
      "sme": 1,
      "eu": 0,
      "nonEu": 0,
      "electronic": 1
     },
     "lotOffers": [
      {
       "no": "19",
       "admitted": 1,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265313",
     "no": "364.22",
     "date": "2025-07-01",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "lots": [
      "22"
     ],
     "value": 5256,
     "currency": "RON",
     "ronValue": 5256,
     "winners": [
      {
       "name": "ND PHARMA S.R.L.",
       "cui": "22082443",
       "sme": true,
       "city": "Bacau"
      },
      {
       "name": "DR.MAX",
       "cui": "9378655",
       "sme": false,
       "city": "Mogosoaia"
      },
      {
       "name": "FELSIN FARM",
       "cui": "3024756",
       "sme": true,
       "city": "Bucuresti"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 6120,
     "lowest": 2952,
     "highest": 5472,
     "offers": {
      "received": 4,
      "sme": 2,
      "eu": 0,
      "nonEu": 0,
      "electronic": 4
     },
     "lotOffers": [
      {
       "no": "22",
       "admitted": 4,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265314",
     "no": "364.11",
     "date": "2025-07-01",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "lots": [
      "11"
     ],
     "value": 16387.2,
     "currency": "RON",
     "ronValue": 16387.2,
     "winners": [
      {
       "name": "BIOEEL",
       "cui": "1199107",
       "sme": false,
       "city": "Targu Mures"
      },
      {
       "name": "ALLIANCE HEALTHCARE ROMANIA",
       "cui": "8955860",
       "sme": false,
       "city": "Bucuresti"
      },
      {
       "name": "DR.MAX",
       "cui": "9378655",
       "sme": false,
       "city": "Mogosoaia"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 41702.4,
     "lowest": 10512,
     "highest": 22521.6,
     "offers": {
      "received": 7,
      "sme": 1,
      "eu": 0,
      "nonEu": 0,
      "electronic": 7
     },
     "lotOffers": [
      {
       "no": "11",
       "admitted": 7,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265315",
     "no": "364.17",
     "date": "2025-07-01",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "lots": [
      "17"
     ],
     "value": 23068.8,
     "currency": "RON",
     "ronValue": 23068.8,
     "winners": [
      {
       "name": "DR.MAX",
       "cui": "9378655",
       "sme": false,
       "city": "Mogosoaia"
      },
      {
       "name": "Pharma",
       "cui": "13591928",
       "sme": false,
       "city": "Iasi"
      },
      {
       "name": "ND PHARMA S.R.L.",
       "cui": "22082443",
       "sme": true,
       "city": "Bacau"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 24000,
     "lowest": 19680,
     "highest": 23068.8,
     "offers": {
      "received": 3,
      "sme": 1,
      "eu": 0,
      "nonEu": 0,
      "electronic": 3
     },
     "lotOffers": [
      {
       "no": "17",
       "admitted": 3,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265316",
     "no": "364.29",
     "date": "2025-07-01",
     "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
     "lots": [
      "29"
     ],
     "value": 27144,
     "currency": "RON",
     "ronValue": 27144,
     "winners": [
      {
       "name": "ALLIANCE HEALTHCARE ROMANIA",
       "cui": "8955860",
       "sme": false,
       "city": "Bucuresti"
      },
      {
       "name": "FARMEXIM S.A.",
       "cui": "335278",
       "sme": false,
       "city": "Bucuresti"
      },
      {
       "name": "DR.MAX",
       "cui": "9378655",
       "sme": false,
       "city": "Mogosoaia"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 30240,
     "lowest": 26856,
     "highest": 27504,
     "offers": {
      "received": 4,
      "sme": 0,
      "eu": 0,
      "nonEu": 0,
      "electronic": 4
     },
     "lotOffers": [
      {
       "no": "29",
       "admitted": 4,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265317",
     "no": "364.40",
     "date": "2025-07-01",
     "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
     "lots": [
      "40"
     ],
     "value": 273600,
     "currency": "RON",
     "ronValue": 273600,
     "winners": [
      {
       "name": "FARMEXIM S.A.",
       "cui": "335278",
       "sme": false,
       "city": "Bucuresti"
      },
      {
       "name": "ALLIANCE HEALTHCARE ROMANIA",
       "cui": "8955860",
       "sme": false,
       "city": "Bucuresti"
      },
      {
       "name": "DR.MAX",
       "cui": "9378655",
       "sme": false,
       "city": "Mogosoaia"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 288720,
     "lowest": 272160,
     "highest": 288000,
     "offers": {
      "received": 6,
      "sme": 1,
      "eu": 0,
      "nonEu": 0,
      "electronic": 6
     },
     "lotOffers": [
      {
       "no": "40",
       "admitted": 6,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265318",
     "no": "364.3",
     "date": "2025-07-01",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "lots": [
      "3"
     ],
     "value": 17568,
     "currency": "RON",
     "ronValue": 17568,
     "winners": [
      {
       "name": "FARMEXIM S.A.",
       "cui": "335278",
       "sme": false,
       "city": "Bucuresti"
      },
      {
       "name": "ND PHARMA S.R.L.",
       "cui": "22082443",
       "sme": true,
       "city": "Bacau"
      },
      {
       "name": "DONA. LOGISTICA",
       "cui": "3596251",
       "sme": false,
       "city": "Chitila"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 18720,
     "lowest": 8640,
     "highest": 17568,
     "offers": {
      "received": 3,
      "sme": 1,
      "eu": 0,
      "nonEu": 0,
      "electronic": 3
     },
     "lotOffers": [
      {
       "no": "3",
       "admitted": 3,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265319",
     "no": "364.6",
     "date": "2025-07-01",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "lots": [
      "6"
     ],
     "value": 357840,
     "currency": "RON",
     "ronValue": 357840,
     "winners": [
      {
       "name": "ALLIANCE HEALTHCARE ROMANIA",
       "cui": "8955860",
       "sme": false,
       "city": "Bucuresti"
      },
      {
       "name": "DR.MAX",
       "cui": "9378655",
       "sme": false,
       "city": "Mogosoaia"
      },
      {
       "name": "BIOEEL",
       "cui": "1199107",
       "sme": false,
       "city": "Targu Mures"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 1149840,
     "lowest": 345600,
     "highest": 630720,
     "offers": {
      "received": 8,
      "sme": 1,
      "eu": 0,
      "nonEu": 0,
      "electronic": 8
     },
     "lotOffers": [
      {
       "no": "6",
       "admitted": 8,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265320",
     "no": "364.9",
     "date": "2025-07-01",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "lots": [
      "9"
     ],
     "value": 6316.8,
     "currency": "RON",
     "ronValue": 6316.8,
     "winners": [
      {
       "name": "Pharma",
       "cui": "13591928",
       "sme": false,
       "city": "Iasi"
      },
      {
       "name": "DONA. LOGISTICA",
       "cui": "3596251",
       "sme": false,
       "city": "Chitila"
      },
      {
       "name": "DR.MAX",
       "cui": "9378655",
       "sme": false,
       "city": "Mogosoaia"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 7161.6,
     "lowest": 4608,
     "highest": 6316.8,
     "offers": {
      "received": 7,
      "sme": 2,
      "eu": 0,
      "nonEu": 0,
      "electronic": 7
     },
     "lotOffers": [
      {
       "no": "9",
       "admitted": 3,
       "unaccepted": 0,
       "nonconformed": 4,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265321",
     "no": "364.13",
     "date": "2025-07-01",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "lots": [
      "13"
     ],
     "value": 18000,
     "currency": "RON",
     "ronValue": 18000,
     "winners": [
      {
       "name": "FARMEXIM S.A.",
       "cui": "335278",
       "sme": false,
       "city": "Bucuresti"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 19152,
     "lowest": 18000,
     "highest": 18000,
     "offers": {
      "received": 1,
      "sme": 0,
      "eu": 0,
      "nonEu": 0,
      "electronic": 1
     },
     "lotOffers": [
      {
       "no": "13",
       "admitted": 1,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265322",
     "no": "364.7",
     "date": "2025-07-01",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "lots": [
      "7"
     ],
     "value": 36000,
     "currency": "RON",
     "ronValue": 36000,
     "winners": [
      {
       "name": "DONA. LOGISTICA",
       "cui": "3596251",
       "sme": false,
       "city": "Chitila"
      },
      {
       "name": "ALLIANCE HEALTHCARE ROMANIA",
       "cui": "8955860",
       "sme": false,
       "city": "Bucuresti"
      },
      {
       "name": "FELSIN FARM",
       "cui": "3024756",
       "sme": true,
       "city": "Bucuresti"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 115200,
     "lowest": 28800,
     "highest": 100800,
     "offers": {
      "received": 9,
      "sme": 3,
      "eu": 0,
      "nonEu": 0,
      "electronic": 9
     },
     "lotOffers": [
      {
       "no": "7",
       "admitted": 9,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265323",
     "no": "364.12",
     "date": "2025-07-01",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "lots": [
      "12"
     ],
     "value": 23625.6,
     "currency": "RON",
     "ronValue": 23625.6,
     "winners": [
      {
       "name": "FARMEXIM S.A.",
       "cui": "335278",
       "sme": false,
       "city": "Bucuresti"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 25132.8,
     "lowest": 23625.6,
     "highest": 23625.6,
     "offers": {
      "received": 1,
      "sme": 0,
      "eu": 0,
      "nonEu": 0,
      "electronic": 1
     },
     "lotOffers": [
      {
       "no": "12",
       "admitted": 1,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265324",
     "no": "364.36",
     "date": "2025-07-01",
     "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
     "lots": [
      "36"
     ],
     "value": 528,
     "currency": "RON",
     "ronValue": 528,
     "winners": [
      {
       "name": "FELSIN FARM",
       "cui": "3024756",
       "sme": true,
       "city": "Bucuresti"
      },
      {
       "name": "Pharma",
       "cui": "13591928",
       "sme": false,
       "city": "Iasi"
      },
      {
       "name": "DR.MAX",
       "cui": "9378655",
       "sme": false,
       "city": "Mogosoaia"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 624,
     "lowest": 528,
     "highest": 624,
     "offers": {
      "received": 5,
      "sme": 3,
      "eu": 0,
      "nonEu": 0,
      "electronic": 5
     },
     "lotOffers": [
      {
       "no": "36",
       "admitted": 5,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265325",
     "no": "364.25",
     "date": "2025-07-01",
     "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
     "lots": [
      "25"
     ],
     "value": 18480,
     "currency": "RON",
     "ronValue": 18480,
     "winners": [
      {
       "name": "BIOEEL",
       "cui": "1199107",
       "sme": false,
       "city": "Targu Mures"
      },
      {
       "name": "FELSIN FARM",
       "cui": "3024756",
       "sme": true,
       "city": "Bucuresti"
      },
      {
       "name": "DONA. LOGISTICA",
       "cui": "3596251",
       "sme": false,
       "city": "Chitila"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 25920,
     "lowest": 18000,
     "highest": 25200,
     "offers": {
      "received": 9,
      "sme": 3,
      "eu": 0,
      "nonEu": 0,
      "electronic": 9
     },
     "lotOffers": [
      {
       "no": "25",
       "admitted": 9,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265326",
     "no": "364.2",
     "date": "2025-07-01",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "lots": [
      "2"
     ],
     "value": 310560,
     "currency": "RON",
     "ronValue": 310560,
     "winners": [
      {
       "name": "COMPANIA NATIONALA UNIFARM",
       "cui": "11653560",
       "sme": true,
       "city": "Bucuresti"
      },
      {
       "name": "FARMEXIM S.A.",
       "cui": "335278",
       "sme": false,
       "city": "Bucuresti"
      },
      {
       "name": "ALLIANCE HEALTHCARE ROMANIA",
       "cui": "8955860",
       "sme": false,
       "city": "Bucuresti"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 348480,
     "lowest": 307200,
     "highest": 315360,
     "offers": {
      "received": 5,
      "sme": 1,
      "eu": 0,
      "nonEu": 0,
      "electronic": 5
     },
     "lotOffers": [
      {
       "no": "2",
       "admitted": 5,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265327",
     "no": "364.10",
     "date": "2025-07-01",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "lots": [
      "10"
     ],
     "value": 16632,
     "currency": "RON",
     "ronValue": 16632,
     "winners": [
      {
       "name": "ND PHARMA S.R.L.",
       "cui": "22082443",
       "sme": true,
       "city": "Bacau"
      },
      {
       "name": "FARMEXIM S.A.",
       "cui": "335278",
       "sme": false,
       "city": "Bucuresti"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 16848,
     "lowest": 14616,
     "highest": 16632,
     "offers": {
      "received": 2,
      "sme": 1,
      "eu": 0,
      "nonEu": 0,
      "electronic": 2
     },
     "lotOffers": [
      {
       "no": "10",
       "admitted": 2,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265328",
     "no": "364.15",
     "date": "2025-07-01",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "lots": [
      "15"
     ],
     "value": 10262.4,
     "currency": "RON",
     "ronValue": 10262.4,
     "winners": [
      {
       "name": "DR.MAX",
       "cui": "9378655",
       "sme": false,
       "city": "Mogosoaia"
      },
      {
       "name": "ND PHARMA S.R.L.",
       "cui": "22082443",
       "sme": true,
       "city": "Bacau"
      },
      {
       "name": "Pharma",
       "cui": "13591928",
       "sme": false,
       "city": "Iasi"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 11011.2,
     "lowest": 8880,
     "highest": 10262.4,
     "offers": {
      "received": 3,
      "sme": 1,
      "eu": 0,
      "nonEu": 0,
      "electronic": 3
     },
     "lotOffers": [
      {
       "no": "15",
       "admitted": 3,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265329",
     "no": "364.32",
     "date": "2025-07-01",
     "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
     "lots": [
      "32"
     ],
     "value": 124320,
     "currency": "RON",
     "ronValue": 124320,
     "winners": [
      {
       "name": "ALLIANCE HEALTHCARE ROMANIA",
       "cui": "8955860",
       "sme": false,
       "city": "Bucuresti"
      },
      {
       "name": "FARMEXIM S.A.",
       "cui": "335278",
       "sme": false,
       "city": "Bucuresti"
      },
      {
       "name": "BIOEEL",
       "cui": "1199107",
       "sme": false,
       "city": "Targu Mures"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 175680,
     "lowest": 123600,
     "highest": 129360,
     "offers": {
      "received": 7,
      "sme": 0,
      "eu": 0,
      "nonEu": 0,
      "electronic": 7
     },
     "lotOffers": [
      {
       "no": "32",
       "admitted": 6,
       "unaccepted": 1,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265330",
     "no": "364.34",
     "date": "2025-07-01",
     "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
     "lots": [
      "34"
     ],
     "value": 468000,
     "currency": "RON",
     "ronValue": 468000,
     "winners": [
      {
       "name": "FELSIN FARM",
       "cui": "3024756",
       "sme": true,
       "city": "Bucuresti"
      },
      {
       "name": "ALLIANCE HEALTHCARE ROMANIA",
       "cui": "8955860",
       "sme": false,
       "city": "Bucuresti"
      },
      {
       "name": "BIOEEL",
       "cui": "1199107",
       "sme": false,
       "city": "Targu Mures"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 483840,
     "lowest": 460800,
     "highest": 480960,
     "offers": {
      "received": 5,
      "sme": 1,
      "eu": 0,
      "nonEu": 0,
      "electronic": 5
     },
     "lotOffers": [
      {
       "no": "34",
       "admitted": 5,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265331",
     "no": "364.39",
     "date": "2025-07-01",
     "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
     "lots": [
      "39"
     ],
     "value": 927120,
     "currency": "RON",
     "ronValue": 927120,
     "winners": [
      {
       "name": "DR.MAX",
       "cui": "9378655",
       "sme": false,
       "city": "Mogosoaia"
      },
      {
       "name": "ALLIANCE HEALTHCARE ROMANIA",
       "cui": "8955860",
       "sme": false,
       "city": "Bucuresti"
      },
      {
       "name": "FARMACEUTICA REMEDIA DISTRIBUTION & LOGISTICS S.R.L.",
       "cui": "3572074",
       "sme": false,
       "city": "Deva"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 1049040,
     "lowest": 884880,
     "highest": 933600,
     "offers": {
      "received": 4,
      "sme": 0,
      "eu": 0,
      "nonEu": 0,
      "electronic": 4
     },
     "lotOffers": [
      {
       "no": "39",
       "admitted": 4,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265332",
     "no": "364.5",
     "date": "2025-07-01",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "lots": [
      "5"
     ],
     "value": 2486.4,
     "currency": "RON",
     "ronValue": 2486.4,
     "winners": [
      {
       "name": "DR.MAX",
       "cui": "9378655",
       "sme": false,
       "city": "Mogosoaia"
      },
      {
       "name": "ND PHARMA S.R.L.",
       "cui": "22082443",
       "sme": true,
       "city": "Bacau"
      },
      {
       "name": "Pharma",
       "cui": "13591928",
       "sme": false,
       "city": "Iasi"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 2496,
     "lowest": 2438.4,
     "highest": 2496,
     "offers": {
      "received": 4,
      "sme": 2,
      "eu": 0,
      "nonEu": 0,
      "electronic": 4
     },
     "lotOffers": [
      {
       "no": "5",
       "admitted": 4,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265333",
     "no": "364.14",
     "date": "2025-07-01",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "lots": [
      "14"
     ],
     "value": 29760,
     "currency": "RON",
     "ronValue": 29760,
     "winners": [
      {
       "name": "ND PHARMA S.R.L.",
       "cui": "22082443",
       "sme": true,
       "city": "Bacau"
      },
      {
       "name": "BIOEEL",
       "cui": "1199107",
       "sme": false,
       "city": "Targu Mures"
      },
      {
       "name": "DONA. LOGISTICA",
       "cui": "3596251",
       "sme": false,
       "city": "Chitila"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 32640,
     "lowest": 20928,
     "highest": 29760,
     "offers": {
      "received": 3,
      "sme": 1,
      "eu": 0,
      "nonEu": 0,
      "electronic": 3
     },
     "lotOffers": [
      {
       "no": "14",
       "admitted": 3,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265334",
     "no": "364.42",
     "date": "2025-07-01",
     "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
     "lots": [
      "42"
     ],
     "value": 17952,
     "currency": "RON",
     "ronValue": 17952,
     "winners": [
      {
       "name": "COMPANIA NATIONALA UNIFARM",
       "cui": "11653560",
       "sme": true,
       "city": "Bucuresti"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 17952,
     "lowest": 17952,
     "highest": 17952,
     "offers": {
      "received": 1,
      "sme": 1,
      "eu": 0,
      "nonEu": 0,
      "electronic": 1
     },
     "lotOffers": [
      {
       "no": "42",
       "admitted": 1,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265335",
     "no": "364.16",
     "date": "2025-07-01",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "lots": [
      "16"
     ],
     "value": 44136,
     "currency": "RON",
     "ronValue": 44136,
     "winners": [
      {
       "name": "ND PHARMA S.R.L.",
       "cui": "22082443",
       "sme": true,
       "city": "Bacau"
      },
      {
       "name": "DR.MAX",
       "cui": "9378655",
       "sme": false,
       "city": "Mogosoaia"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 43200,
     "lowest": 43200,
     "highest": 44136,
     "offers": {
      "received": 2,
      "sme": 1,
      "eu": 0,
      "nonEu": 0,
      "electronic": 2
     },
     "lotOffers": [
      {
       "no": "16",
       "admitted": 2,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265336",
     "no": "364.41",
     "date": "2025-07-01",
     "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
     "lots": [
      "41"
     ],
     "value": 615360,
     "currency": "RON",
     "ronValue": 615360,
     "winners": [
      {
       "name": "Prisum Healthcare",
       "cui": "5919650",
       "sme": true,
       "city": "Bucuresti"
      },
      {
       "name": "FARMEXIM S.A.",
       "cui": "335278",
       "sme": false,
       "city": "Bucuresti"
      },
      {
       "name": "COMPANIA NATIONALA UNIFARM",
       "cui": "11653560",
       "sme": true,
       "city": "Bucuresti"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 652800,
     "lowest": 597600,
     "highest": 620544,
     "offers": {
      "received": 4,
      "sme": 2,
      "eu": 0,
      "nonEu": 0,
      "electronic": 4
     },
     "lotOffers": [
      {
       "no": "41",
       "admitted": 4,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265337",
     "no": "364.26",
     "date": "2025-07-01",
     "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
     "lots": [
      "26"
     ],
     "value": 24240,
     "currency": "RON",
     "ronValue": 24240,
     "winners": [
      {
       "name": "DR.MAX",
       "cui": "9378655",
       "sme": false,
       "city": "Mogosoaia"
      },
      {
       "name": "ND PHARMA S.R.L.",
       "cui": "22082443",
       "sme": true,
       "city": "Bacau"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 25440,
     "lowest": 6384,
     "highest": 24240,
     "offers": {
      "received": 2,
      "sme": 1,
      "eu": 0,
      "nonEu": 0,
      "electronic": 2
     },
     "lotOffers": [
      {
       "no": "26",
       "admitted": 2,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265338",
     "no": "364.28",
     "date": "2025-07-01",
     "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
     "lots": [
      "28"
     ],
     "value": 4507.2,
     "currency": "RON",
     "ronValue": 4507.2,
     "winners": [
      {
       "name": "ND PHARMA S.R.L.",
       "cui": "22082443",
       "sme": true,
       "city": "Bacau"
      },
      {
       "name": "Pharma",
       "cui": "13591928",
       "sme": false,
       "city": "Iasi"
      },
      {
       "name": "DR.MAX",
       "cui": "9378655",
       "sme": false,
       "city": "Mogosoaia"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 7444.8,
     "lowest": 4104,
     "highest": 4507.2,
     "offers": {
      "received": 3,
      "sme": 1,
      "eu": 0,
      "nonEu": 0,
      "electronic": 3
     },
     "lotOffers": [
      {
       "no": "28",
       "admitted": 3,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265339",
     "no": "364.21",
     "date": "2025-07-01",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "lots": [
      "21"
     ],
     "value": 68400,
     "currency": "RON",
     "ronValue": 68400,
     "winners": [
      {
       "name": "DR.MAX",
       "cui": "9378655",
       "sme": false,
       "city": "Mogosoaia"
      },
      {
       "name": "FELSIN FARM",
       "cui": "3024756",
       "sme": true,
       "city": "Bucuresti"
      },
      {
       "name": "FARMEXIM S.A.",
       "cui": "335278",
       "sme": false,
       "city": "Bucuresti"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 168960,
     "lowest": 67200,
     "highest": 113280,
     "offers": {
      "received": 8,
      "sme": 2,
      "eu": 0,
      "nonEu": 0,
      "electronic": 8
     },
     "lotOffers": [
      {
       "no": "21",
       "admitted": 8,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265340",
     "no": "364.24",
     "date": "2025-07-01",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "lots": [
      "24"
     ],
     "value": 72000,
     "currency": "RON",
     "ronValue": 72000,
     "winners": [
      {
       "name": "DONA. LOGISTICA",
       "cui": "3596251",
       "sme": false,
       "city": "Chitila"
      },
      {
       "name": "FELSIN FARM",
       "cui": "3024756",
       "sme": true,
       "city": "Bucuresti"
      },
      {
       "name": "ND PHARMA S.R.L.",
       "cui": "22082443",
       "sme": true,
       "city": "Bacau"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 86640,
     "lowest": 45600,
     "highest": 81264,
     "offers": {
      "received": 5,
      "sme": 2,
      "eu": 0,
      "nonEu": 0,
      "electronic": 5
     },
     "lotOffers": [
      {
       "no": "24",
       "admitted": 5,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265341",
     "no": "364.35",
     "date": "2025-07-01",
     "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
     "lots": [
      "35"
     ],
     "value": 583200,
     "currency": "RON",
     "ronValue": 583200,
     "winners": [
      {
       "name": "DONA. LOGISTICA",
       "cui": "3596251",
       "sme": false,
       "city": "Chitila"
      },
      {
       "name": "DR.MAX",
       "cui": "9378655",
       "sme": false,
       "city": "Mogosoaia"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 645600,
     "lowest": 579600,
     "highest": 583200,
     "offers": {
      "received": 2,
      "sme": 0,
      "eu": 0,
      "nonEu": 0,
      "electronic": 2
     },
     "lotOffers": [
      {
       "no": "35",
       "admitted": 2,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265342",
     "no": "364.38",
     "date": "2025-07-01",
     "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
     "lots": [
      "38"
     ],
     "value": 20160,
     "currency": "RON",
     "ronValue": 20160,
     "winners": [
      {
       "name": "ALLIANCE HEALTHCARE ROMANIA",
       "cui": "8955860",
       "sme": false,
       "city": "Bucuresti"
      },
      {
       "name": "ND PHARMA S.R.L.",
       "cui": "22082443",
       "sme": true,
       "city": "Bacau"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 38592,
     "lowest": 16704,
     "highest": 20160,
     "offers": {
      "received": 4,
      "sme": 1,
      "eu": 0,
      "nonEu": 0,
      "electronic": 4
     },
     "lotOffers": [
      {
       "no": "38",
       "admitted": 2,
       "unaccepted": 2,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265343",
     "no": "364.20",
     "date": "2025-07-01",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "lots": [
      "20"
     ],
     "value": 19200,
     "currency": "RON",
     "ronValue": 19200,
     "winners": [
      {
       "name": "DONA. LOGISTICA",
       "cui": "3596251",
       "sme": false,
       "city": "Chitila"
      },
      {
       "name": "ND PHARMA S.R.L.",
       "cui": "22082443",
       "sme": true,
       "city": "Bacau"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 19200,
     "lowest": 17280,
     "highest": 19200,
     "offers": {
      "received": 2,
      "sme": 1,
      "eu": 0,
      "nonEu": 0,
      "electronic": 2
     },
     "lotOffers": [
      {
       "no": "20",
       "admitted": 2,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265344",
     "no": "364.30",
     "date": "2025-07-01",
     "title": "ACORD CADRU FURNIZARE MEDICAMENTE",
     "lots": [
      "30"
     ],
     "value": 34464,
     "currency": "RON",
     "ronValue": 34464,
     "winners": [
      {
       "name": "ND PHARMA S.R.L.",
       "cui": "22082443",
       "sme": true,
       "city": "Bacau"
      },
      {
       "name": "DR.MAX",
       "cui": "9378655",
       "sme": false,
       "city": "Mogosoaia"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 36480,
     "lowest": 33120,
     "highest": 34464,
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
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265345",
     "no": "364.23",
     "date": "2025-07-01",
     "title": "ACORD-CADRU DE FURNIZARE MEDICAMENTE",
     "lots": [
      "23"
     ],
     "value": 162720,
     "currency": "RON",
     "ronValue": 162720,
     "winners": [
      {
       "name": "ALLIANCE HEALTHCARE ROMANIA",
       "cui": "8955860",
       "sme": false,
       "city": "Bucuresti"
      },
      {
       "name": "DR.MAX",
       "cui": "9378655",
       "sme": false,
       "city": "Mogosoaia"
      },
      {
       "name": "FARMEXIM S.A.",
       "cui": "335278",
       "sme": false,
       "city": "Bucuresti"
      }
     ],
     "modified": 0,
     "framework": "Acord-cadru",
     "estimate": 185040,
     "lowest": 159120,
     "highest": 185040,
     "offers": {
      "received": 7,
      "sme": 1,
      "eu": 0,
      "nonEu": 0,
      "electronic": 7
     },
     "lotOffers": [
      {
       "no": "23",
       "admitted": 7,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-01"
    },
    {
     "id": "107265347",
     "no": "375",
     "date": "2025-07-07",
     "title": "Contract subsecvent",
     "lots": [
      "32",
      "40",
      "6",
      "2",
      "29",
      "11",
      "37",
      "38"
     ],
     "value": 115509,
     "currency": "RON",
     "ronValue": 115509,
     "winners": [
      {
       "name": "ALLIANCE HEALTHCARE ROMANIA",
       "cui": "8955860",
       "sme": false,
       "city": "Bucuresti"
      }
     ],
     "modified": 0,
     "framework": "Contract subsecvent",
     "estimate": 2108966.4,
     "lowest": null,
     "highest": null,
     "offers": {
      "received": 47,
      "sme": 5,
      "eu": 0,
      "nonEu": 0,
      "electronic": 47
     },
     "lotOffers": [
      {
       "no": "38",
       "admitted": 2,
       "unaccepted": 2,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "32",
       "admitted": 6,
       "unaccepted": 1,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "37",
       "admitted": 6,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "11",
       "admitted": 7,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "29",
       "admitted": 4,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "6",
       "admitted": 8,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "2",
       "admitted": 5,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "40",
       "admitted": 6,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-07"
    },
    {
     "id": "107265348",
     "no": "378",
     "date": "2025-07-07",
     "title": "Contract subsecvent",
     "lots": [
      "9",
      "25",
      "7",
      "3",
      "24",
      "20"
     ],
     "value": 12432,
     "currency": "RON",
     "ronValue": 12432,
     "winners": [
      {
       "name": "DONA. LOGISTICA",
       "cui": "3596251",
       "sme": false,
       "city": "Chitila"
      }
     ],
     "modified": 0,
     "framework": "Contract subsecvent",
     "estimate": 272841.6,
     "lowest": null,
     "highest": null,
     "offers": {
      "received": 35,
      "sme": 12,
      "eu": 0,
      "nonEu": 0,
      "electronic": 35
     },
     "lotOffers": [
      {
       "no": "20",
       "admitted": 2,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "9",
       "admitted": 3,
       "unaccepted": 0,
       "nonconformed": 4,
       "withdrawn": 0
      },
      {
       "no": "25",
       "admitted": 9,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "7",
       "admitted": 9,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "3",
       "admitted": 3,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "24",
       "admitted": 5,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-07"
    },
    {
     "id": "107265349",
     "no": "376",
     "date": "2025-07-07",
     "title": "Contract subsecvent",
     "lots": [
      "28",
      "23",
      "5",
      "35",
      "36",
      "21"
     ],
     "value": 101364.6,
     "currency": "RON",
     "ronValue": 101364.6,
     "winners": [
      {
       "name": "DR.MAX",
       "cui": "9378655",
       "sme": false,
       "city": "Mogosoaia"
      }
     ],
     "modified": 0,
     "framework": "Contract subsecvent",
     "estimate": 1010164.8,
     "lowest": null,
     "highest": null,
     "offers": {
      "received": 29,
      "sme": 9,
      "eu": 0,
      "nonEu": 0,
      "electronic": 29
     },
     "lotOffers": [
      {
       "no": "28",
       "admitted": 3,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "5",
       "admitted": 4,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "21",
       "admitted": 8,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "36",
       "admitted": 5,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "35",
       "admitted": 2,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "23",
       "admitted": 7,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-07"
    },
    {
     "id": "107265350",
     "no": "377",
     "date": "2025-07-07",
     "title": "Contract subsecvent",
     "lots": [
      "16",
      "14",
      "17",
      "30",
      "26",
      "19",
      "15"
     ],
     "value": 17160.6,
     "currency": "RON",
     "ronValue": 17160.6,
     "winners": [
      {
       "name": "ND PHARMA S.R.L.",
       "cui": "22082443",
       "sme": true,
       "city": "Bacau"
      }
     ],
     "modified": 0,
     "framework": "Contract subsecvent",
     "estimate": 183031.2,
     "lowest": null,
     "highest": null,
     "offers": {
      "received": 16,
      "sme": 7,
      "eu": 0,
      "nonEu": 0,
      "electronic": 16
     },
     "lotOffers": [
      {
       "no": "26",
       "admitted": 2,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "14",
       "admitted": 3,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "17",
       "admitted": 3,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "19",
       "admitted": 1,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "15",
       "admitted": 3,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "16",
       "admitted": 2,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "30",
       "admitted": 2,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-07"
    },
    {
     "id": "107265346",
     "no": "380",
     "date": "2025-07-08",
     "title": "Contract subsecvent",
     "lots": [
      "42",
      "41"
     ],
     "value": 76944,
     "currency": "RON",
     "ronValue": 76944,
     "winners": [
      {
       "name": "COMPANIA NATIONALA UNIFARM",
       "cui": "11653560",
       "sme": true,
       "city": "Bucuresti"
      }
     ],
     "modified": 0,
     "framework": "Contract subsecvent",
     "estimate": 670752,
     "lowest": null,
     "highest": null,
     "offers": {
      "received": 5,
      "sme": 3,
      "eu": 0,
      "nonEu": 0,
      "electronic": 5
     },
     "lotOffers": [
      {
       "no": "41",
       "admitted": 4,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "42",
       "admitted": 1,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-08"
    },
    {
     "id": "107265493",
     "no": "379",
     "date": "2025-07-08",
     "title": "Contract subsecvent",
     "lots": [
      "10",
      "12",
      "13"
     ],
     "value": 7030.2,
     "currency": "RON",
     "ronValue": 7030.2,
     "winners": [
      {
       "name": "FARMEXIM S.A.",
       "cui": "335278",
       "sme": false,
       "city": "Bucuresti"
      }
     ],
     "modified": 0,
     "framework": "Contract subsecvent",
     "estimate": 61132.8,
     "lowest": null,
     "highest": null,
     "offers": {
      "received": 4,
      "sme": 1,
      "eu": 0,
      "nonEu": 0,
      "electronic": 4
     },
     "lotOffers": [
      {
       "no": "10",
       "admitted": 2,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "13",
       "admitted": 1,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "12",
       "admitted": 1,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-08"
    },
    {
     "id": "107265492",
     "no": "386",
     "date": "2025-07-10",
     "title": "Contract subsecvent",
     "lots": [
      "22",
      "34"
     ],
     "value": 57969,
     "currency": "RON",
     "ronValue": 57969,
     "winners": [
      {
       "name": "FELSIN FARM",
       "cui": "3024756",
       "sme": true,
       "city": "Bucuresti"
      }
     ],
     "modified": 0,
     "framework": "Contract subsecvent",
     "estimate": 489960,
     "lowest": null,
     "highest": null,
     "offers": {
      "received": 9,
      "sme": 3,
      "eu": 0,
      "nonEu": 0,
      "electronic": 9
     },
     "lotOffers": [
      {
       "no": "22",
       "admitted": 4,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "34",
       "admitted": 5,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-07-10"
    },
    {
     "id": "107265491",
     "no": "474",
     "date": "2025-09-08",
     "title": "Contract subsecvent",
     "lots": [
      "6"
     ],
     "value": 94800,
     "currency": "RON",
     "ronValue": 94800,
     "winners": [
      {
       "name": "ALLIANCE HEALTHCARE ROMANIA",
       "cui": "8955860",
       "sme": false,
       "city": "Bucuresti"
      }
     ],
     "modified": 0,
     "framework": "Contract subsecvent",
     "estimate": 1149840,
     "lowest": null,
     "highest": null,
     "offers": {
      "received": 8,
      "sme": 1,
      "eu": 0,
      "nonEu": 0,
      "electronic": 8
     },
     "lotOffers": [
      {
       "no": "6",
       "admitted": 8,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-09-08"
    },
    {
     "id": "107265617",
     "no": "506",
     "date": "2025-10-07",
     "title": "Contract subsecvent",
     "lots": [
      "2"
     ],
     "value": 61440,
     "currency": "RON",
     "ronValue": 61440,
     "winners": [
      {
       "name": "ALLIANCE HEALTHCARE ROMANIA",
       "cui": "8955860",
       "sme": false,
       "city": "Bucuresti"
      }
     ],
     "modified": 0,
     "framework": "Contract subsecvent",
     "estimate": 348480,
     "lowest": null,
     "highest": null,
     "offers": {
      "received": 5,
      "sme": 1,
      "eu": 0,
      "nonEu": 0,
      "electronic": 5
     },
     "lotOffers": [
      {
       "no": "2",
       "admitted": 5,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-10-07"
    },
    {
     "id": "107265616",
     "no": "571",
     "date": "2025-10-30",
     "title": "Contract subsecvent",
     "lots": [
      "29",
      "40"
     ],
     "value": 4133,
     "currency": "RON",
     "ronValue": 4133,
     "winners": [
      {
       "name": "ALLIANCE HEALTHCARE ROMANIA",
       "cui": "8955860",
       "sme": false,
       "city": "Bucuresti"
      }
     ],
     "modified": 0,
     "framework": "Contract subsecvent",
     "estimate": 318960,
     "lowest": null,
     "highest": null,
     "offers": {
      "received": 10,
      "sme": 1,
      "eu": 0,
      "nonEu": 0,
      "electronic": 10
     },
     "lotOffers": [
      {
       "no": "29",
       "admitted": 4,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      },
      {
       "no": "40",
       "admitted": 6,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-10-30"
    },
    {
     "id": "107265615",
     "no": "604",
     "date": "2025-11-12",
     "title": "Contract subsecvent",
     "lots": [
      "35"
     ],
     "value": 4860,
     "currency": "RON",
     "ronValue": 4860,
     "winners": [
      {
       "name": "DONA. LOGISTICA",
       "cui": "3596251",
       "sme": false,
       "city": "Chitila"
      }
     ],
     "modified": 0,
     "framework": "Contract subsecvent",
     "estimate": 645600,
     "lowest": null,
     "highest": null,
     "offers": {
      "received": 2,
      "sme": 0,
      "eu": 0,
      "nonEu": 0,
      "electronic": 2
     },
     "lotOffers": [
      {
       "no": "35",
       "admitted": 2,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-11-12"
    },
    {
     "id": "107265612",
     "no": "623",
     "date": "2025-12-02",
     "title": "Contract subsecvent",
     "lots": [
      "43"
     ],
     "value": 2688,
     "currency": "RON",
     "ronValue": 2688,
     "winners": [
      {
       "name": "Pharma",
       "cui": "13591928",
       "sme": false,
       "city": "Iasi"
      }
     ],
     "modified": 0,
     "framework": "Contract subsecvent",
     "estimate": 270720,
     "lowest": null,
     "highest": null,
     "offers": {
      "received": 1,
      "sme": 0,
      "eu": 0,
      "nonEu": 0,
      "electronic": 1
     },
     "lotOffers": [
      {
       "no": "43",
       "admitted": 1,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-12-02"
    },
    {
     "id": "107265614",
     "no": "627",
     "date": "2025-12-03",
     "title": "Contract subsecvent",
     "lots": [
      "29"
     ],
     "value": 559.5,
     "currency": "RON",
     "ronValue": 559.5,
     "winners": [
      {
       "name": "ALLIANCE HEALTHCARE ROMANIA",
       "cui": "8955860",
       "sme": false,
       "city": "Bucuresti"
      }
     ],
     "modified": 0,
     "framework": "Contract subsecvent",
     "estimate": 30240,
     "lowest": null,
     "highest": null,
     "offers": {
      "received": 4,
      "sme": 0,
      "eu": 0,
      "nonEu": 0,
      "electronic": 4
     },
     "lotOffers": [
      {
       "no": "29",
       "admitted": 4,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-12-03"
    },
    {
     "id": "107265673",
     "no": "653",
     "date": "2025-12-18",
     "title": "Contract subsecvent",
     "lots": [
      "37"
     ],
     "value": 196,
     "currency": "RON",
     "ronValue": 196,
     "winners": [
      {
       "name": "ALLIANCE HEALTHCARE ROMANIA",
       "cui": "8955860",
       "sme": false,
       "city": "Bucuresti"
      }
     ],
     "modified": 0,
     "framework": "Contract subsecvent",
     "estimate": 35712,
     "lowest": null,
     "highest": null,
     "offers": {
      "received": 6,
      "sme": 0,
      "eu": 0,
      "nonEu": 0,
      "electronic": 6
     },
     "lotOffers": [
      {
       "no": "37",
       "admitted": 6,
       "unaccepted": 0,
       "nonconformed": 0,
       "withdrawn": 0
      }
     ],
     "group": false,
     "startDate": "2025-12-18"
    }
   ],
   "versions": [
    {
     "date": "2026-02-12T13:04:01+02:00",
     "state": "Publicat",
     "correcting": false,
     "modification": false
    },
    {
     "date": "2025-07-15T13:04:08+03:00",
     "state": "Retras",
     "correcting": false,
     "modification": false
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
     "22082443",
     "ND PHARMA SRL"
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
   "cpv": [
    {
     "code": "33600000",
     "ro": "Produse farmaceutice",
     "en": "Pharmaceutical products"
    }
   ]
  }
 },
 "turnul-sfatului": {
  "label": "Sibiu, Turnul Sfatului — procedură simplificată",
  "procedure": {
   "id": "345516",
   "noticeNo": "SCNA1128809",
   "noticeKind": "unknown",
   "procedureType": "Procedura simplificata",
   "contractKind": null,
   "title": "„INTERVENTII DE REABILITARE LA TURNUL SFATULUI”",
   "authority": {
    "cui": "4270740",
    "name": "Municipiul Sibiu"
   },
   "cpvCode": "45453000",
   "estimatedValueRon": "7664195.87",
   "awardedValueRon": "7664195.87",
   "currency": "RON",
   "status": "awarded",
   "publicationDate": null,
   "stateDate": null,
   "sourceSystem": "elicitatie",
   "sourceUrl": "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100595212",
   "valueAccepted": true
  },
  "contracts": [
   {
    "id": "2533825",
    "contractNo": "191",
    "contractDate": "2025-12-10",
    "title": null,
    "authority": {
     "cui": "4270740",
     "name": "Municipiul Sibiu"
    },
    "supplier": {
     "cui": "27843529",
     "name": "DOMINO CONSTRUCT EXPERT SRL"
    },
    "valueRon": "7664195.00",
    "valueAccepted": true,
    "valueState": "official_exact",
    "recordKind": "contract_award"
   },
   {
    "id": "2533824",
    "contractNo": "191",
    "contractDate": "2025-12-10",
    "title": null,
    "authority": {
     "cui": "4270740",
     "name": "Municipiul Sibiu"
    },
    "supplier": {
     "cui": "21179945",
     "name": "DECORINT"
    },
    "valueRon": "7664195.00",
    "valueAccepted": false,
    "valueState": "conflicting_sources",
    "recordKind": "contract_award"
   }
  ],
  "ted": null,
  "notice": null,
  "linked": [
   {
    "row": {
     "id": "566894",
     "noticeNo": "SCN1167175",
     "noticeKind": "initiation",
     "procedureType": "Procedura simplificata",
     "contractKind": "works",
     "title": "„INTERVENTII DE REABILITARE LA TURNUL SFATULUI”",
     "authority": {
      "cui": "4270740",
      "name": "Municipiul Sibiu"
     },
     "cpvCode": "45453000",
     "estimatedValueRon": "9052461.00",
     "awardedValueRon": null,
     "currency": "RON",
     "status": "in_evaluation",
     "publicationDate": null,
     "stateDate": null,
     "sourceSystem": "seap_notice",
     "sourceUrl": "https://data.gov.ro/dataset/e0cf7ffc-1fa0-4ffb-a82f-c83981d81f21/resource/64e18773-e97c-4478-9b3d-3654d58b020f/download/datagov-anunturi-de-initiere-publicate-tiii-2025.xlsx",
     "valueAccepted": false
    },
    "tie": "call"
   }
  ],
  "source": {
   "caNoticeId": "100595212",
   "title": "„INTERVENTII DE REABILITARE LA TURNUL SFATULUI”",
   "reference": "4270740_2025_PAAPD1545672",
   "contractType": "Lucrari",
   "authorityType": "Autoritatea regională sau locală",
   "legislation": "Legea nr. 98/23.05.2016",
   "procedureType": "Procedura simplificata",
   "framework": false,
   "call": {
    "no": "SCN1167175",
    "date": "2025-08-26"
   },
   "ted": null,
   "totalEstimate": 7664195.87,
   "lotsEstimate": 9052461.95,
   "frameworkValue": 0,
   "annexD": {
    "explanation": null,
    "forceMajeure": false
   },
   "lots": [
    {
     "no": "1",
     "title": "Lot implicit",
     "cpv": "45453000-7 Lucrari de reparatii generale si de renovare (Rev.2)",
     "place": "RO126 Sibiu",
     "estimate": 9052461.95,
     "currency": "Leu",
     "criterion": "Pretul cel mai scazut",
     "criteria": [],
     "months": 28,
     "days": null,
     "financing": "Program / Proiect",
     "status": "Atribuit"
    }
   ],
   "contracts": [
    {
     "id": "107068781",
     "no": "191",
     "date": "2025-12-10",
     "title": "INTERVENȚII DE REABILITARE LA TURNUL SFATULUI",
     "lots": [
      "1"
     ],
     "value": 7664195.87,
     "currency": "RON",
     "ronValue": 7664195.87,
     "winners": [
      {
       "name": "DECORINT",
       "cui": "21179945",
       "sme": true,
       "city": "Cluj-Napoca"
      },
      {
       "name": "DOMINO CONSTRUCT EXPERT SRL",
       "cui": "27843529",
       "sme": true,
       "city": "Berghia"
      }
     ],
     "modified": 2,
     "framework": "Contract de achizitii publice",
     "estimate": 9052461.95,
     "lowest": null,
     "highest": null,
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
     "group": true,
     "startDate": "2025-12-10"
    }
   ],
   "versions": [
    {
     "date": "2026-08-19T08:36:10+03:00",
     "state": "Publicat",
     "correcting": false,
     "modification": true
    },
    {
     "date": "2026-07-13T11:51:35+03:00",
     "state": "Retras",
     "correcting": false,
     "modification": true
    },
    {
     "date": "2025-12-11T13:54:33+02:00",
     "state": "Retras",
     "correcting": false,
     "modification": false
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
   "cpv": [
    {
     "code": "45453000",
     "ro": "Lucrări de reparaţii generale şi de renovare",
     "en": "Overhaul and refurbishment work"
    }
   ]
  }
 },
 "uvt": {
  "label": "Universitatea de Vest — licitație anulată",
  "procedure": {
   "id": "583846",
   "noticeNo": "CN1090441",
   "noticeKind": "initiation",
   "procedureType": "Licitatie deschisa",
   "contractKind": "supplies",
   "title": "Echipamente, periferice și accesorii IT - 3 LOTURI",
   "authority": {
    "cui": "4250670",
    "name": "Universitatea de Vest din Timisoara"
   },
   "cpvCode": "30213300",
   "estimatedValueRon": "2090872.00",
   "awardedValueRon": null,
   "currency": "RON",
   "status": "cancelled",
   "publicationDate": "2026-09-03",
   "stateDate": null,
   "sourceSystem": "seap_notice",
   "sourceUrl": "https://data.gov.ro/dataset/e8d22de4-f8ce-4b42-8561-98d2481ddef9/resource/5720192a-dc9a-428f-9ac6-bd055a06da95/download/raport-anunturi-de-initiere-publicate-ti-2026.xlsx",
   "valueAccepted": false
  },
  "contracts": [],
  "ted": null,
  "notice": null,
  "linked": [],
  "source": null,
  "names": {
   "labels": [
    [
     "4250670",
     "UNIVERSITATEA DE VEST DIN TIMISOARA"
    ]
   ],
   "cpv": [
    {
     "code": "30213300",
     "ro": "Computer de birou",
     "en": "Desktop computer"
    }
   ]
  }
 },
 "nuclearelectrica-2009": {
  "label": "Nuclearelectrica, 2009 — contracte legate greșit",
  "procedure": {
   "id": "35106757",
   "noticeNo": "92137",
   "noticeKind": "initiation",
   "procedureType": "Licitatie deschisa",
   "contractKind": "supplies",
   "title": null,
   "authority": {
    "cui": "10874881",
    "name": "Societatea Nationala NUCLEARELECTRICA S.A."
   },
   "cpvCode": "31711150",
   "estimatedValueRon": "183967.29",
   "awardedValueRon": null,
   "currency": "RON",
   "status": "unknown",
   "publicationDate": "2009-12-10",
   "stateDate": null,
   "sourceSystem": "seap_notice",
   "sourceUrl": "https://data.gov.ro/dataset/4ef49452-39b7-43be-a85b-e4895beee119/resource/3225df1f-530b-4c28-8e62-8864d32d8ffa/download/anunturi-participare-2009.xls",
   "valueAccepted": false
  },
  "contracts": [
   {
    "id": "183506531",
    "contractNo": "89",
    "contractDate": "2010-06-30",
    "title": "Consolidarea imobilului din Bd. Regina Elisabeta nr.47, sector 5 - sediul Municipiului Bucuresti",
    "authority": {
     "cui": "4267117",
     "name": "MUNICIPIUL BUCURESTI"
    },
    "supplier": {
     "cui": "1565534",
     "name": "ROTARY CONSTRUCTII S.R.L."
    },
    "valueRon": "37817489.22",
    "valueAccepted": true,
    "valueState": "official_exact",
    "recordKind": "contract_award"
   },
   {
    "id": "183459794",
    "contractNo": null,
    "contractDate": "2009-10-26",
    "title": "lucrari de asfaltare la scoala nr. 1 Radu Stanian Ploiesti",
    "authority": {
     "cui": "9467990",
     "name": "SCOALA CU CLS.I-VIII MIHAI EMINESCU PLOIESTI"
    },
    "supplier": {
     "cui": "18930723",
     "name": "SISANELU FOREXIM S.R.L."
    },
    "valueRon": "89469.58",
    "valueAccepted": true,
    "valueState": "official_exact",
    "recordKind": "contract_award"
   }
  ],
  "ted": null,
  "notice": null,
  "linked": [],
  "source": null,
  "names": {
   "labels": [
    [
     "10874881",
     "SOCIETATEA NATIONALA NUCLEARELECTRICA SA"
    ],
    [
     "4267117",
     "MUNICIPIUL BUCURESTI"
    ],
    [
     "1565534",
     "ROTARY CONSTRUCTII SRL"
    ],
    [
     "9467990",
     "SCOALA GIMNAZIALA MIHAI EMINESCU MUNICIPIUL PLOIESTI"
    ],
    [
     "18930723",
     "SISĂNELU FOREXIM SRL"
    ]
   ],
   "cpv": [
    {
     "code": "31711150",
     "ro": "Condensatoare electrice",
     "en": "Electrical capacitors"
    }
   ]
  }
 }
}
