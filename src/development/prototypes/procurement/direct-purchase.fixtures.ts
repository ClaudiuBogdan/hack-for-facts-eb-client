/* The direct-purchase prototype's records, read 2026-09-28: each record as the dev API serves it, and what the fixed API must serve — the detail (da_details joined on source_ref) with its lines, and the per-line prices, from a read-only prod query. Data, not code: change it only to follow the API. */
import type { RawDaFixture } from './direct-purchase.types'

export const DA_FIXTURES: Readonly<Record<string, RawDaFixture>> = {
 "flori": {
  "id": "10120196",
  "label": "BNR, flori — un coș de zece rânduri; CUI-ul e scris în nume",
  "record": {
   "id": "10120196",
   "uniqueCode": "DA39664537",
   "title": "Aranjamente florale",
   "authority": {
    "cui": null,
    "name": "R 361684 Banca Nationala a Romaniei",
    "displayName": "R 361684 Banca Nationala a Romaniei"
   },
   "supplier": {
    "cui": "9446547",
    "name": "FLORARIA IRIS",
    "displayName": "FLORARIA IRIS"
   },
   "cpvCode": "03121210",
   "cpvDivisionCode": "03",
   "valueRon": "98448.00",
   "estimatedValueRon": "98448.00",
   "currency": null,
   "value": {
    "valueState": "official_exact",
    "valueStateRule": "own_value",
    "valueAccepted": true,
    "valueRonComparable": "98448.00",
    "valueComparableBasis": "official",
    "valueRulesVersion": 5,
    "valueResolvedAt": "2026-08-21 15:31:12.464757+00"
   },
   "status": "finalized",
   "countyName": null,
   "publicationDate": "2026-01-16",
   "finalizationDate": "2026-01-21",
   "sourceSystem": "elicitatie_da",
   "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121372731",
   "isCanonical": true,
   "dupGroupId": "10120196"
  },
  "today": {
   "availability": "NOT_CAPTURED",
   "authorityCui": null,
   "status": "finalized"
  },
  "target": {
   "availability": "AVAILABLE",
   "authorityCui": "361684",
   "stateText": "Oferta acceptata",
   "detailJoin": {
    "sourceSystem": "elicitatie_da_detail",
    "sourceRef": "121372731"
   },
   "detail": {
    "description": "Diverse aranjamente florale",
    "deliveryCondition": "Livrarea se va face la sediul beneficiarului doar in urma transmiterii\nunei comenzi letrice pe mail",
    "paymentCondition": "Plata se va face cu OP in termen de 15 zile de la data\ncomunicarii/raportarii facturii in SPV (Spatiul Privat Virtual aferent\nBNR) din cadrul aplicatiei Ro eFactura si semnarea procesului verbal\nde recepție.",
    "contractTypeText": "Furnizare",
    "isEuFunded": false,
    "euFundText": null,
    "caDecisionDate": "2026-01-21T07:19:29Z",
    "caDecisionDeadline": "2026-01-22T15:00:00Z",
    "supplierDecisionDate": "2026-01-17T12:25:04Z",
    "supplierDecisionDeadline": "2026-01-22T15:00:00Z",
    "caRejectionReason": null,
    "supplierRejectionReason": null,
    "correctionReason": null,
    "documentCount": 0,
    "itemCount": 10,
    "itemsTotal": "98448",
    "itemsValueDelta": "0",
    "itemsReconciled": true,
    "textRedacted": false,
    "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121372731",
    "items": [
     {
      "id": "121372731:0",
      "itemIndex": 0,
      "catalogItemCode": "B202",
      "catalogItemName": "ARANJAMENT FLORAL TIP COS MARE - PROTOCOL",
      "catalogItemDescription": "ARANJAMENT FLORAL TIP COS MARE - PROTOCOL",
      "itemMeasureUnit": "bucata",
      "cpvCode": "03121210-0",
      "cpvText": "Aranjamente florale (Rev.2)",
      "itemQuantity": "15",
      "unitPrice": "770",
      "unitEstimatedPrice": "770",
      "catalogUnitPrice": "770",
      "lineValue": "11550",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121372731"
     },
     {
      "id": "121372731:1",
      "itemIndex": 1,
      "catalogItemCode": "B203",
      "catalogItemName": "ARANJAMENT FLORAL TIP BUCHET MEDIU",
      "catalogItemDescription": "ARANJAMENT FLORAL TIP BUCHET MEDIU",
      "itemMeasureUnit": "bucata",
      "cpvCode": "03121210-0",
      "cpvText": "Aranjamente florale (Rev.2)",
      "itemQuantity": "17",
      "unitPrice": "250",
      "unitEstimatedPrice": "250",
      "catalogUnitPrice": "250",
      "lineValue": "4250",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121372731"
     },
     {
      "id": "121372731:2",
      "itemIndex": 2,
      "catalogItemCode": "B214",
      "catalogItemName": "ARANJAMENT FLORAL MIC",
      "catalogItemDescription": "ARANJAMENT FLORAL MIC",
      "itemMeasureUnit": "bucata",
      "cpvCode": "03121210-0",
      "cpvText": "Aranjamente florale (Rev.2)",
      "itemQuantity": "150",
      "unitPrice": "70",
      "unitEstimatedPrice": "70",
      "catalogUnitPrice": "70",
      "lineValue": "10500",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121372731"
     },
     {
      "id": "121372731:3",
      "itemIndex": 3,
      "catalogItemCode": "F1",
      "catalogItemName": "ARANJAMENT FLORAL TIP COS MEDIU",
      "catalogItemDescription": "ARANJAMENT FLORAL TIP COS MEDIU",
      "itemMeasureUnit": "bucata",
      "cpvCode": "03121210-0",
      "cpvText": "Aranjamente florale (Rev.2)",
      "itemQuantity": "10",
      "unitPrice": "380",
      "unitEstimatedPrice": "380",
      "catalogUnitPrice": "380",
      "lineValue": "3800",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121372731"
     },
     {
      "id": "121372731:4",
      "itemIndex": 4,
      "catalogItemCode": "A10",
      "catalogItemName": "ARANJAMENT FLORAL TIP COS MARE",
      "catalogItemDescription": "ARANJAMENT FLORAL TIP COS MARE",
      "itemMeasureUnit": "bucata",
      "cpvCode": "03121210-0",
      "cpvText": "Aranjamente florale (Rev.2)",
      "itemQuantity": "14",
      "unitPrice": "550",
      "unitEstimatedPrice": "550",
      "catalogUnitPrice": "550",
      "lineValue": "7700",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121372731"
     },
     {
      "id": "121372731:5",
      "itemIndex": 5,
      "catalogItemCode": "B125",
      "catalogItemName": "COROANA FUNERARA MODEL I",
      "catalogItemDescription": "COROANA FUNERARA MODEL I",
      "itemMeasureUnit": "bucata",
      "cpvCode": "03121210-0",
      "cpvText": "Aranjamente florale (Rev.2)",
      "itemQuantity": "30",
      "unitPrice": "1000",
      "unitEstimatedPrice": "1000",
      "catalogUnitPrice": "1000",
      "lineValue": "30000",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121372731"
     },
     {
      "id": "121372731:6",
      "itemIndex": 6,
      "catalogItemCode": "B159",
      "catalogItemName": "COROANA FUNERARA MODEL II",
      "catalogItemDescription": "COROANA FUNERARA MODEL II",
      "itemMeasureUnit": "bucata",
      "cpvCode": "03121210-0",
      "cpvText": "Aranjamente florale (Rev.2)",
      "itemQuantity": "30",
      "unitPrice": "700",
      "unitEstimatedPrice": "700",
      "catalogUnitPrice": "700",
      "lineValue": "21000",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121372731"
     },
     {
      "id": "121372731:7",
      "itemIndex": 7,
      "catalogItemCode": "AF50",
      "catalogItemName": "ARANJAMENT FLORAL TIP BUCHET MARE",
      "catalogItemDescription": "ARANJAMENT FLORAL TIP BUCHET MARE",
      "itemMeasureUnit": "bucata",
      "cpvCode": "03121210-0",
      "cpvText": "Aranjamente florale (Rev.2)",
      "itemQuantity": "14",
      "unitPrice": "310",
      "unitEstimatedPrice": "310",
      "catalogUnitPrice": "310",
      "lineValue": "4340",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121372731"
     },
     {
      "id": "121372731:8",
      "itemIndex": 8,
      "catalogItemCode": "AF1",
      "catalogItemName": "ARANJAMENT FLORAL TIP BUCHET MIC",
      "catalogItemDescription": "ARANJAMENT FLORAL TIP BUCHET MIC",
      "itemMeasureUnit": "bucata",
      "cpvCode": "03121210-0",
      "cpvText": "Aranjamente florale (Rev.2)",
      "itemQuantity": "14",
      "unitPrice": "172",
      "unitEstimatedPrice": "172",
      "catalogUnitPrice": "172",
      "lineValue": "2408",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121372731"
     },
     {
      "id": "121372731:9",
      "itemIndex": 9,
      "catalogItemCode": "TG1",
      "catalogItemName": "ARANJAMENT FLORAL OVAL MODEL I",
      "catalogItemDescription": "ARANJAMENT FLORAL OVAL MODEL I",
      "itemMeasureUnit": "bucata",
      "cpvCode": "03121210-0",
      "cpvText": "Aranjamente florale (Rev.2)",
      "itemQuantity": "10",
      "unitPrice": "290",
      "unitEstimatedPrice": "290",
      "catalogUnitPrice": "290",
      "lineValue": "2900",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121372731"
     }
    ]
   },
   "peers": {},
   "repeats": {
    "0": 0,
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
    "6": 0,
    "7": 0,
    "8": 0,
    "9": 0
   }
  }
 },
 "scoala": {
  "id": "10249994",
  "label": "Școala Brătilești, kit IT din PNRR",
  "record": {
   "id": "10249994",
   "uniqueCode": "DA39890150",
   "title": "ECHIPAMENTE.IT",
   "authority": {
    "cui": "28483622",
    "name": "SCOALA GIMNAZIALA BRATILESTI",
    "displayName": "SCOALA GIMNAZIALA BRATILESTI"
   },
   "supplier": {
    "cui": "28290290",
    "name": "SOLNET WEB IT&C SRL",
    "displayName": "SOLNET WEB IT&C SRL"
   },
   "cpvCode": "32323300",
   "cpvDivisionCode": "32",
   "valueRon": "127500.00",
   "estimatedValueRon": "127500.00",
   "currency": null,
   "value": {
    "valueState": "official_exact",
    "valueStateRule": "own_value",
    "valueAccepted": true,
    "valueRonComparable": "127500.00",
    "valueComparableBasis": "official",
    "valueRulesVersion": 5,
    "valueResolvedAt": "2026-08-21 15:31:12.464757+00"
   },
   "status": "finalized",
   "countyName": null,
   "publicationDate": "2026-02-24",
   "finalizationDate": "2026-02-24",
   "sourceSystem": "elicitatie_da",
   "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121620134",
   "isCanonical": true,
   "dupGroupId": null
  },
  "today": {
   "availability": "NOT_CAPTURED",
   "authorityCui": "28483622",
   "status": "finalized"
  },
  "target": {
   "availability": "AVAILABLE",
   "authorityCui": "28483622",
   "stateText": "Oferta acceptata",
   "detailJoin": {
    "sourceSystem": "elicitatie_da_detail",
    "sourceRef": "121620134"
   },
   "detail": {
    "description": "ECHIPAMENTE.IT",
    "deliveryCondition": "SEDIU.BENEFICIAR",
    "paymentCondition": "OP.TREZ",
    "contractTypeText": "Furnizare",
    "isEuFunded": true,
    "euFundText": "Planul National de Redresare si Rezilienta – PNRR",
    "caDecisionDate": "2026-02-24T14:34:04Z",
    "caDecisionDeadline": "2026-03-01T15:00:00Z",
    "supplierDecisionDate": "2026-02-24T14:33:44Z",
    "supplierDecisionDeadline": "2026-03-06T15:00:00Z",
    "caRejectionReason": null,
    "supplierRejectionReason": null,
    "correctionReason": null,
    "documentCount": 0,
    "itemCount": 5,
    "itemsTotal": "127500",
    "itemsValueDelta": "0",
    "itemsReconciled": true,
    "textRedacted": false,
    "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121620134",
    "items": [
     {
      "id": "121620134:0",
      "itemIndex": 0,
      "catalogItemCode": "13",
      "catalogItemName": "SET Drona DJI Pro Smart + CONSOLA + Controller Pro",
      "catalogItemDescription": "SET Drona DJI Pro Smart + CONSOLA + Controller Pro\n\n-\tTransmisie video: sistem DJI OcuSync/O3/O4 (în funcție de generație), cu live view minim 1080p către controller (unde e suportat).\n-\tAutonomie: minim 30 minute (baterie standard, în condiții normale).\n-\tStabilizare: gimbal mecanic pe 3 axe.\n-\tSiguranță: funcții RTH, geofencing (dacă e cazul), failsafe la pierderea semnalului.\n-\tEvitarea obstacolelor: minim față/spate",
      "itemMeasureUnit": "bucata",
      "cpvCode": "32323300-6",
      "cpvText": "Echipament video (Rev.2)",
      "itemQuantity": "1",
      "unitPrice": "18825",
      "unitEstimatedPrice": "18825",
      "catalogUnitPrice": "18825",
      "lineValue": "18825",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121620134"
     },
     {
      "id": "121620134:1",
      "itemIndex": 1,
      "catalogItemCode": "14",
      "catalogItemName": "SISTEM SONORIZARE",
      "catalogItemDescription": "SISTEM SONORIZARE PROFESIONAL, MIXER AUDIO, BOXE ACTIVE, OPERATOR DJ, STATIV BOXE, SETURI MICROFOANE, CABLURI CORDIAL, CONECTORI DSLR \nDetalii specifice, parametri de funcționare și standarde tehnice minim acceptate de către Beneficiar\nSistem sonorizare profesional (set complet PA)\nPutere sistem: minim 900 W RMS total (sau echivalent în configurația aleasă).\nConfigurație: 2x boxe full-range + (opțional) 1–2 subwoofere\nRăspuns în frecvență: full-range minim 50 Hz – 18 kHz (cu sub: până la 35–40 Hz).\nCarcasă: polipropilenă ranforsată sau lemn, grilaj metalic, montaj pe stativ 35 mm.\nMixer audio\nCanale: minim 8 canale totale (ex: 6 mono + 2 stereo) sau echivalent.\nPreamplificatoare microfon: minim 4, cu alimentare phantom +48 V.\nInterfață audio (dacă e necesar): USB, minim 2-in/2-out, 24-bit/48 kHz.\nBoxe active 450 W\nRăspuns în frecvență: minim 50 Hz – 18 kHz.\nStativ box\nTip: trepied, înălțime reglabilă\nÎnălțime: minim 1.2 m – 2.2 m.\nSarcină: minim 40–50 kg / stativ.\nTub: 35 mm standard.\nSeturi microfoane (cu fir sau wireless\nTip: dinamic cardioid, sensibilitate potrivită pentru voce\nRăspuns frecvență: aprox. 50 Hz – 15 kHz.\nConector: XLR, cablu inclus 5–10 m.\nCabluri Cordial (audio)\nTipuri uzuale cerute în achiziții:\nXLR-XLR (balansat) pentru microfoane, lungimi 5/10/15 m.\nTRS 6.3 mm balansat pentru line, lungimi 3–10 m.\nSpeakon-Speakon pentru boxe pasive (dacă există), lungimi 5–15 m.\nIzolație: rezistență la uzură, utilizare scenă.\nConectori DSLR (pentru audio-video)\nAdaptor TRS–TRRS (pentru intrare microfon pe camere/telefoane, după caz)\nCabluri mini-jack 3.5 mm ecranate, lungimi 1–5 m.\nAdaptor XLR–3.5 mm cu atenuare/preamplificare (dacă legi mixer/receiver la DSLR).\nOpțional: recorder/interfață audio 2 canale, 24-bit/48 kHz, cu intrări XLR și phantom +48 V.",
      "itemMeasureUnit": "bucata",
      "cpvCode": "48952000-6",
      "cpvText": "Sistem de sonorizare (Rev.2)",
      "itemQuantity": "1",
      "unitPrice": "25600",
      "unitEstimatedPrice": "25600",
      "catalogUnitPrice": "25600",
      "lineValue": "25600",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121620134"
     },
     {
      "id": "121620134:2",
      "itemIndex": 2,
      "catalogItemCode": "217",
      "catalogItemName": "Multifunctionala",
      "catalogItemDescription": "Multifunctional Profesional Konica Minolta Bizhub, A3 + Alimentator Documente RADF + Stand Mobil +Set Tonere \n\n\nTip produs\tImprimanta multifunctionala\nTehnologie printare\tLaser\nMod printare\tColor\nUtilizare\tBusiness\nFunctii principale\tPrintare Scanare Copiere\nFormat general imprimanta\tA3+\nPrintare fata/verso (Duplex)\tAutomat\nAlimentator automat de documente (ADF)\tDa\nScanare fata/verso automat (Duplex)\tDADF (SINGLE-pass)\nConectivitate\tUSB Retea\nContinut pachet\tCablu alimentare Alimentator de documente\nDF-632 Stand Mobil cu roti DK-516x \nDocumentatie legala Set Tonere \nTN-328 Echipament Bizhub\nCablu USB inclus\tNu\nConsumabil pachet\tStandard\nTip display\tTouchscreen\nDimensiune display\t10.1 inch\nCiclu de lucru maxim (pagini/luna)\t130000\nVolum recomandat de printare (pagini/luna)\t16000\nAplicatii printare cloud & mobile\tAirPrint (iOS); Mopria (Android); \nKonica Minolta Mobile Print (iOS/Android)\nCuloare\tAlb | Negru\nSpecificatii consumabile\nTip consumabil\tToner\nConsumabile compatibile\tTN-328\nPN consumabil\tTN328K TN328Y TN328M TN328C\nImprimanta\nViteza de printare monocrom\t30 ppm\nViteza de printare color\t30 ppm\nRezolutie printare (DPI)\t1200 x 1200\nScanner\nFormat scanner\tA3\nRezolutie scanare (DPI)\t600 x 600\nRezolutie optica (ADF-DPI)\t600 x 600\nViteza de scanare (ADF)\t80 ipm\nCopiator\nViteza de copiere monocrom\t30 ppm\nViteza de copiere color\t30 ppm\nRezolutie copiere (DPI)\t600 x 600\nParametrii zoom\t25 - 400%\nManevrare hartie\nCapacitate hartie intrare (coli)\t1150\nCapacitate hartie iesire (coli)\t250\nCapacitate alimentare automata documente (ADF)\t100\nNumar tavi hartie\t2\nGreutate hartie\t52-300 g/m²\nSpecificatii tehnice\nFrecventa procesor\t1.6 GHz\nCapacitate memorie\t8 GB\nCapacitate stocare\t256 GB\nInterfata\t1 x Hi-Speed USB 2.0 1 x Gigabit \nEthernet 1 x Gazda USB(fata)\nFormat fisier\tJPEG; TIFF; PDF; Compact PDF; \nEncrypted PDF; XPS; Compact XPS; \nPPTX; PDF/A 1a si 1b\nTimp de incalzire\t11 s\nSistem de operare compatibil\tWindows 10 Windows 2012 \nServer Windows 2016 Server \nWindows Server 2019 \nWindows 11 IoT\nLimbaj printare\tPCL 6 (XL3.0); PCL 5c; \nPostScript 3 (CPSI 3016); XPS\nDimensiuni & greutate\nGreutate\t84 Kg\nLungime\t615 mm\nLatime\t688 mm\nInaltime\t779 mm",
      "itemMeasureUnit": "bucata",
      "cpvCode": "30232110-8",
      "cpvText": "Imprimante laser (Rev.2)",
      "itemQuantity": "2",
      "unitPrice": "25000",
      "unitEstimatedPrice": "25000",
      "catalogUnitPrice": "25000",
      "lineValue": "50000",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121620134"
     },
     {
      "id": "121620134:3",
      "itemIndex": 3,
      "catalogItemCode": "189",
      "catalogItemName": "LAPTOP",
      "catalogItemDescription": "Laptop ASUS Vivobook, Intel Core i5, 16\" WUXGA, MEMORIE RAM16GB, SSD 1TB, Intel UHD Graphics, Windows 11\n\nTip ecran\tLED\nRezolutie\t1920 x 1200\nDimensiune ecran\t16 inch\nEcran Touch\tNu\nRata refresh\t144 Hz\nFinisaj ecran\tLucios\nFormat ecran\tWUXGA\nAlte caracteristici display\t300 niti, 45% DCI-P3 color gamut, Anti-Glare\nProcesor\nTip procesor\tIntel Core i5\nProducator procesor\tIntel\nModel procesor\t13420H\nGeneratie\t13\nNumar nuclee\t8\nFrecventa procesor (GHz)\t2.1\nFrecventa maxima (GHz)\t4.6\nCache (MB)\t12\nProcesor grafic integrat\tIntel UHD Graphics for 13th Gen Intel Processors\nMemorie RAM\nCapacitate RAM\t16 GB\nTip memorie\tDDR5\nMemorie maxima\t16 GB\nSloturi de memorie\t1\nSlot 1\t8 GB\nOn board\t8 GB\nUnitate stocare\nTip stocare\tSSD\nCapacitate stocare\t1000 GB\nTip SSD\tM.2 PCIe NVMe 4.0\nPlaca video\nProducator chipset video\tIntel\nTip placa video\tIntegrata\nProcesor video\tIntel UHD Graphics\nMultimedia\nDifuzoare\tDa\nMicrofon\tDa\nUnitate optica\tFara unitate optica\nWebcam\tFull HD IR\nComunicatii\nWi-Fi\tWi-Fi 6 (802.11 ax)\nBluetooth\tv5.3\nPorturi\nHDMI\t1\nUSB 3.2 Type A Gen 1\t2\nUSB 3.2 Type C Gen 1\t2\nIesire audio\t1 x port combinat casti/microfon\nAlimentare\nBaterie\tLi-Ion\nNumar celule\t4 (70 WHrs)\nSoftware\nSistem operare\tWindows 11 pro + Office 2021 pro\nBiti\t64\nInformatii suplimentare\nTastatura iluminata\tDa\nTastatura numerica\tDa\nLayout tastatura\tUS International\nSecuritate\tTPM\nCarcasa\tAluminiu\nContinut pachet\tLaptop, Incarcator, Documentatie\nFacilitati\tTouchpad care accepta gesturi de atingeri multiple\nAltele\nCuloare\tArgintiu\nDimensiuni (L x A x I cm)\t35.70 x 25.06 x 1.59 ~ 1.87\nGreutate (Kg)\t1.7\nGarantie\t24\tLuni",
      "itemMeasureUnit": "bucata",
      "cpvCode": "30213100-6",
      "cpvText": "Computere portabile (Rev.2)",
      "itemQuantity": "5",
      "unitPrice": "5115",
      "unitEstimatedPrice": "5115",
      "catalogUnitPrice": "5115",
      "lineValue": "25575",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121620134"
     },
     {
      "id": "121620134:4",
      "itemIndex": 4,
      "catalogItemCode": "188",
      "catalogItemName": "Aparat Foto DSLR",
      "catalogItemDescription": "Aparat Foto DSLR Nikon, 20.9 MP + Obiectiv 18–140mm VR \n\nTip produs\tKit\nConstructie\tKit 18-140mm\nDestinat pentru\tProfesionist\nModel D-SLR\tD7500\nDiagonala display\t3.2 inch\nMaterial sasiu\tAliaj magneziu\nFunctii\tTouchscreen LCD\nContinut pachet\t1 x USB 1 x Aparat foto 1 x Curea 1 x Capac ocular \n1 x Obiectiv 18-140mm VR 1 x Incarcator MH-25a \n1 x Vizor din cauciuc dk-28 1 x Acumulator Li-ion EN-EL15A\nTip vizor\tOptic SLR\nTip acumulator\tLi-ion EN-EL15A\nAutonomie acumulator (cadre)\t950\nLatime\t135.5 mm\nAdancime\t104 mm\nInaltime\t72.5 mm\nGreutate\t720 g\nCuloare\tNegru\nSenzor\nTip senzor\tCMOS\nDimensiune senzor (mm)\t23.5 x 15.7\nRezolutie senzor\t20.9 Mpx\nProcesor imagine\tEXPEED 5\nCalitate continut foto\nRezolutie imagine\t5568 x 3712 4176 x 2784 2784 x 1856 4272 x 2848 \n3200 x 2136 2128 x 1424 5568 x 3128 4176 x 2344 \n2784 x 1560 4272 x 2400 3200 x 1800 2128 x 1192 \n3840 x 2160\nFormat fisier imagine\tJPEG NEF (RAW)\nFotografiere continua\t8 cadre / sec\nCalitate continut video\nRezolutie video\tUHD 4K\nFormat rezolutie video (px)\t3840 x 2160 1920 x 1080 1280 x 720\nFormat inregistrare video\tH.264 MP4 MOV MPEG4\nInregistrare audio\tPCM liniar AAC\nObiectiv\nMontura obiectiv\tNikon F\nInterval distanta focala (mm)\t35 - 135\nTip focalizare\tManuala Automata\nPuncte de focalizare\t51\nLungime obiectiv\t140 mm\nConectivitate\nConectivitate\tBluetooth Wi-Fi Micro USB Cititor de carduri\nTip slot memorie\tSD\nObturator\nTip obturator\tControlat electronic\nViteza obturator\t30 - 1/8000s\nDeclansare automata maxima\t2 s\nBlit\nTip blit\tIntegrat\nBlit extern\tWireless\nControl blit\ti-TTL\nRaza de actiune blit\t12 m\nCompensare expunere blit\t-3 pana la +1 EV in pasi de 1/3 sau 1/2 EV\nFunctii blit\tEliminare efect ochi rosii Sincronizare lenta \nBlitz automat\nControl expunere\nExpunere\tPrioritate diafragma Manual\nSensibilitate ISO\t100-51.200\nEfecte balans de alb\tIncandescent Fluorescent Lumina soarelui \nBlit Presetare manuala Umbra \nAlegere temperatură culoare (2500 K – 10.000 K) \nAuto (2 tipuri) Reglare fina Noros\nSetari predefinite\tPortret Peisaj \nPanorama \nAlimente \nSport \nCopii \nPortret nocturn",
      "itemMeasureUnit": "bucata",
      "cpvCode": "38651000-3",
      "cpvText": "Aparate de fotografiat (Rev.2)",
      "itemQuantity": "1",
      "unitPrice": "7500",
      "unitEstimatedPrice": "7500",
      "catalogUnitPrice": "7500",
      "lineValue": "7500",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121620134"
     }
    ]
   },
   "peers": {},
   "repeats": {
    "0": 0,
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0
   }
  }
 },
 "serviciu": {
  "id": "10253595",
  "label": "Edilitara Târgu Jiu, un serviciu sub prețul din catalog",
  "record": {
   "id": "10253595",
   "uniqueCode": "DA39914511",
   "title": "Servicii profesionale selectie directori OUG 109/2011",
   "authority": {
    "cui": "27295841",
    "name": "SC EDILITARA PUBLIC SA TG-JIU",
    "displayName": "SC EDILITARA PUBLIC SA TG-JIU"
   },
   "supplier": {
    "cui": "14535632",
    "name": "ARC CONSULTING",
    "displayName": "ARC CONSULTING"
   },
   "cpvCode": "79600000",
   "cpvDivisionCode": "79",
   "valueRon": "27000.00",
   "estimatedValueRon": "27000.00",
   "currency": null,
   "value": {
    "valueState": "official_exact",
    "valueStateRule": "own_value",
    "valueAccepted": true,
    "valueRonComparable": "27000.00",
    "valueComparableBasis": "official",
    "valueRulesVersion": 5,
    "valueResolvedAt": "2026-08-21 15:31:12.464757+00"
   },
   "status": "finalized",
   "countyName": null,
   "publicationDate": "2026-03-02",
   "finalizationDate": "2026-03-02",
   "sourceSystem": "elicitatie_da",
   "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121646133",
   "isCanonical": true,
   "dupGroupId": null
  },
  "today": {
   "availability": "NOT_CAPTURED",
   "authorityCui": "27295841",
   "status": "finalized"
  },
  "target": {
   "availability": "AVAILABLE",
   "authorityCui": "27295841",
   "stateText": "Oferta acceptata",
   "detailJoin": {
    "sourceSystem": "elicitatie_da_detail",
    "sourceRef": "121646133"
   },
   "detail": {
    "description": "Servicii expert independent specializat si autorizat in domeniul resurselor umane care realizeaza selectia candidatilor pentru postul de Directori in conformitate cu prevederile O.U.G. nr. 109/2011 si a normelor de aplicare respectiv, HG. 639/2023 Serviciile includ, fara a se limita la: elaborarea planului de selectie componenta integrala, anunt de recrutare si selectie, stabilire criterii de selectie, plan de interviu, mod de acordare punctaj,profil candidat, stabilirea listei lungi de candidati, stabilirea listei scurte de candidati, organizarea interviurilor de selectie, elaborare rapoarte, propunere model contract de mandat, asistarea comisiei de selectie CSN (dupa caz) etc mai putin",
    "deliveryCondition": "conform contract",
    "paymentCondition": "conform contract",
    "contractTypeText": "Servicii",
    "isEuFunded": false,
    "euFundText": null,
    "caDecisionDate": "2026-03-02T10:54:27Z",
    "caDecisionDeadline": "2026-03-07T15:00:00Z",
    "supplierDecisionDate": "2026-03-02T10:49:24Z",
    "supplierDecisionDeadline": "2026-03-04T15:00:00Z",
    "caRejectionReason": null,
    "supplierRejectionReason": null,
    "correctionReason": null,
    "documentCount": 0,
    "itemCount": 1,
    "itemsTotal": "27000",
    "itemsValueDelta": "0",
    "itemsReconciled": true,
    "textRedacted": false,
    "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121646133",
    "items": [
     {
      "id": "121646133:0",
      "itemIndex": 0,
      "catalogItemCode": "directori general",
      "catalogItemName": "Servicii selectie/asistare CA/CS selectie directori OUG 109/2011 -  expert autorizat si specializat",
      "catalogItemDescription": "Servicii expert independent specializat si autorizat in domeniul resurselor umane care realizeaza selectia candidatilor pentru postul de Directori in conformitate cu prevederile O.U.G. nr. 109/2011 si a normelor de aplicare respectiv, HG. 639/2023\nServiciile includ, fara a se limita la: elaborarea planului de selectie componenta integrala, anunt de recrutare si selectie, stabilire criterii de selectie, plan de interviu, mod de acordare punctaj,profil candidat, stabilirea listei lungi de candidati, stabilirea listei scurte de candidati, organizarea interviurilor de selectie, elaborare rapoarte,  propunere model contract de mandat,  asistarea comisiei de selectie CSN (dupa caz) etc",
      "itemMeasureUnit": "bucata",
      "cpvCode": "79600000-0",
      "cpvText": "Servicii de recrutare (Rev.2)",
      "itemQuantity": "3",
      "unitPrice": "9000",
      "unitEstimatedPrice": "9000",
      "catalogUnitPrice": "10000",
      "lineValue": "27000",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121646133"
     }
    ]
   },
   "peers": {},
   "repeats": {
    "0": 0
   }
  }
 },
 "refuzata": {
  "id": "10285216",
  "label": "ADI Ipatele-Drăgușeni, contabilitate — refuzată de firmă, refăcută",
  "record": {
   "id": "10285216",
   "uniqueCode": "DA39945297",
   "title": "Servicii de contabilitate",
   "authority": {
    "cui": "25097708",
    "name": "ASOCIATIA DE DEZVOLTARE INTERCOMUNITARA IPATELE-DRAGUSENI",
    "displayName": "ASOCIATIA DE DEZVOLTARE INTERCOMUNITARA IPATELE-DRAGUSENI"
   },
   "supplier": {
    "cui": "37443554",
    "name": "CABINET DE EXPERTIZA CONTABILA POPA IOANA ANDA",
    "displayName": "CABINET DE EXPERTIZA CONTABILA POPA IOANA ANDA"
   },
   "cpvCode": "79211000",
   "cpvDivisionCode": "79",
   "valueRon": "25000.00",
   "estimatedValueRon": "20000.00",
   "currency": null,
   "value": {
    "valueState": "not_applicable",
    "valueStateRule": "cancelled",
    "valueAccepted": false,
    "valueRonComparable": null,
    "valueComparableBasis": null,
    "valueRulesVersion": 5,
    "valueResolvedAt": "2026-08-21 15:31:12.464757+00"
   },
   "status": "cancelled",
   "countyName": null,
   "publicationDate": "2026-03-05",
   "finalizationDate": "2026-03-05",
   "sourceSystem": "elicitatie_da",
   "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121679205",
   "isCanonical": true,
   "dupGroupId": null
  },
  "today": {
   "availability": "NOT_CAPTURED",
   "authorityCui": "25097708",
   "status": "cancelled"
  },
  "target": {
   "availability": "AVAILABLE",
   "authorityCui": "25097708",
   "stateText": "Conditii refuzate",
   "detailJoin": {
    "sourceSystem": "elicitatie_da_detail",
    "sourceRef": "121679205"
   },
   "detail": {
    "description": "Servicii de contabilitate",
    "deliveryCondition": "Conform contract",
    "paymentCondition": "Conform contract",
    "contractTypeText": "Servicii",
    "isEuFunded": false,
    "euFundText": null,
    "caDecisionDate": null,
    "caDecisionDeadline": null,
    "supplierDecisionDate": "2026-03-05T07:49:31Z",
    "supplierDecisionDeadline": "2026-03-09T15:00:00Z",
    "caRejectionReason": null,
    "supplierRejectionReason": "pret incorect",
    "correctionReason": null,
    "documentCount": 0,
    "itemCount": 1,
    "itemsTotal": "25000",
    "itemsValueDelta": "0",
    "itemsReconciled": true,
    "textRedacted": false,
    "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121679205",
    "items": [
     {
      "id": "121679205:0",
      "itemIndex": 0,
      "catalogItemCode": "103",
      "catalogItemName": "Servicii de contabilitate",
      "catalogItemDescription": "Servicii de contabilitate",
      "itemMeasureUnit": "luna",
      "cpvCode": "79211000-6",
      "cpvText": "Servicii de contabilitate (Rev.2)",
      "itemQuantity": "10",
      "unitPrice": "2500",
      "unitEstimatedPrice": "2000",
      "catalogUnitPrice": "2500",
      "lineValue": "25000",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121679205"
     }
    ]
   },
   "peers": {},
   "repeats": {}
  }
 },
 "gradinita": {
  "id": "10319757",
  "label": "Grădinița nr. 16, carne — prețul la alte instituții, repetată",
  "record": {
   "id": "10319757",
   "uniqueCode": "DA40006448",
   "title": "Pulpa de porc fara os- GPP16",
   "authority": {
    "cui": "29034036",
    "name": "GRADINITA CU PROGRAM PRELUNGIT NR. 16",
    "displayName": "GRADINITA CU PROGRAM PRELUNGIT NR. 16"
   },
   "supplier": {
    "cui": "1201320",
    "name": "PRIMACOM",
    "displayName": "PRIMACOM"
   },
   "cpvCode": "15100000",
   "cpvDivisionCode": "15",
   "valueRon": "322.59",
   "estimatedValueRon": "322.59",
   "currency": null,
   "value": {
    "valueState": "official_exact",
    "valueStateRule": "own_value",
    "valueAccepted": true,
    "valueRonComparable": "322.59",
    "valueComparableBasis": "official",
    "valueRulesVersion": 5,
    "valueResolvedAt": "2026-08-21 15:31:12.464757+00"
   },
   "status": "finalized",
   "countyName": null,
   "publicationDate": "2026-03-16",
   "finalizationDate": "2026-03-16",
   "sourceSystem": "elicitatie_da",
   "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121744523",
   "isCanonical": true,
   "dupGroupId": null
  },
  "today": {
   "availability": "NOT_CAPTURED",
   "authorityCui": "29034036",
   "status": "finalized"
  },
  "target": {
   "availability": "AVAILABLE",
   "authorityCui": "29034036",
   "stateText": "Oferta acceptata",
   "detailJoin": {
    "sourceSystem": "elicitatie_da_detail",
    "sourceRef": "121744523"
   },
   "detail": {
    "description": "Produs refrigerat.Termen de garantie 7 zile.\nEMITEREA FACTURILOR SI/SAU A E-FACTURILOR  PRIN IMPLEMENTAREA PREVEDERILOR OUG 138/2024 PRIN EMITEREA ACESTORA CU MENTIONAREA CODURILOR CPV CORESPUNZATOARE ACHIZITIEI\nTRANSPORT ASIGURAT SI SUPORTAT DE FURNIZOR",
    "deliveryCondition": "GPPNR16- STR DR CZAKO JOZSEF NR 2, TG MURES; \nPERS DE CONTACT : ADMINISTRATOR LAZAR GIULIA- 0724294173",
    "paymentCondition": "PLATA ROFACTURII LA TERMEN 30 ZILE CU OP PRIN TREZORERIA TG MURES",
    "contractTypeText": "Furnizare",
    "isEuFunded": false,
    "euFundText": null,
    "caDecisionDate": "2026-03-16T09:39:07Z",
    "caDecisionDeadline": "2026-03-21T15:00:00Z",
    "supplierDecisionDate": "2026-03-16T08:53:56Z",
    "supplierDecisionDeadline": "2026-03-27T15:00:00Z",
    "caRejectionReason": null,
    "supplierRejectionReason": null,
    "correctionReason": null,
    "documentCount": 0,
    "itemCount": 1,
    "itemsTotal": "322.5930",
    "itemsValueDelta": "0.0030",
    "itemsReconciled": true,
    "textRedacted": true,
    "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121744523",
    "items": [
     {
      "id": "121744523:0",
      "itemIndex": 0,
      "catalogItemCode": "3",
      "catalogItemName": "Pulpa de porc fara os",
      "catalogItemDescription": "Produs refrigerat.Termen de garantie 7 zile.",
      "itemMeasureUnit": "kg",
      "cpvCode": "15113000-3",
      "cpvText": "Carne de porc (Rev.2)",
      "itemQuantity": "18.35",
      "unitPrice": "17.58",
      "unitEstimatedPrice": "17.58",
      "catalogUnitPrice": "17.58",
      "lineValue": "322.5930",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121744523"
     }
    ]
   },
   "peers": {
    "0": {
     "buyers": 5,
     "lines": 40,
     "min": 16.63,
     "median": 17.58,
     "max": 17.96
    }
   },
   "repeats": {
    "0": 25
   }
  }
 },
 "parc": {
  "id": "10347772",
  "label": "TUIASI, întreținerea parcului — lucrări",
  "record": {
   "id": "10347772",
   "uniqueCode": "DA40099993",
   "title": "Lucrari de intretinere a Parcului Tineretului situat in vecinatatea imobilului T- Rectorat",
   "authority": {
    "cui": "4701606",
    "name": "UNIVERSITATEA TEHNICA GHEORGHE ASACHI DIN IASI",
    "displayName": "UNIVERSITATEA TEHNICA GHEORGHE ASACHI DIN IASI"
   },
   "supplier": {
    "cui": "27277063",
    "name": "SERVICII PUBLICE IASI SA",
    "displayName": "SERVICII PUBLICE IASI SA"
   },
   "cpvCode": "45112710",
   "cpvDivisionCode": "45",
   "valueRon": "154244.78",
   "estimatedValueRon": "154244.78",
   "currency": null,
   "value": {
    "valueState": "official_exact",
    "valueStateRule": "own_value",
    "valueAccepted": true,
    "valueRonComparable": "154244.78",
    "valueComparableBasis": "official",
    "valueRulesVersion": 5,
    "valueResolvedAt": "2026-08-21 15:31:12.464757+00"
   },
   "status": "finalized",
   "countyName": null,
   "publicationDate": "2026-03-30",
   "finalizationDate": "2026-03-30",
   "sourceSystem": "elicitatie_da",
   "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121844692",
   "isCanonical": true,
   "dupGroupId": null
  },
  "today": {
   "availability": "NOT_CAPTURED",
   "authorityCui": "4701606",
   "status": "finalized"
  },
  "target": {
   "availability": "AVAILABLE",
   "authorityCui": "4701606",
   "stateText": "Oferta acceptata",
   "detailJoin": {
    "sourceSystem": "elicitatie_da_detail",
    "sourceRef": "121844692"
   },
   "detail": {
    "description": "Lucrari de plantat arbori, taieri de corectie arbusti, incarcatul gunoiului,cositul si scarificare gazon, tratamente pentru boli, administrare ingrasaminte, suprainsamantarea gazon, udarea acestuia, platari de flori anuale; Lucrari de irigatii (lucrari de reparatii a sistemului de irigatii, inlocuire elemente distruse si deteriorate, interventii pe parcursul duratei de intretinere); Executie, montarea, demontarea mobilierului stradal.",
    "deliveryCondition": "contract cu caracter de regularitate pentru 7 luni (aprilie- octombrie) conform clauze contractuale",
    "paymentCondition": "in max 30 de zile de la emiterea facturii in cont Trezorerie",
    "contractTypeText": "Servicii",
    "isEuFunded": false,
    "euFundText": null,
    "caDecisionDate": "2026-03-30T11:18:25Z",
    "caDecisionDeadline": "2026-04-04T14:00:00Z",
    "supplierDecisionDate": "2026-03-30T08:48:41Z",
    "supplierDecisionDeadline": "2026-04-09T14:00:00Z",
    "caRejectionReason": null,
    "supplierRejectionReason": null,
    "correctionReason": null,
    "documentCount": 0,
    "itemCount": 1,
    "itemsTotal": "154244.78",
    "itemsValueDelta": "0.00",
    "itemsReconciled": true,
    "textRedacted": false,
    "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121844692",
    "items": [
     {
      "id": "121844692:0",
      "itemIndex": 0,
      "catalogItemCode": "257",
      "catalogItemName": "Lucrari de intretinere a Parcului Tineretului situat in vecinatatea imobilului T- Rectorat",
      "catalogItemDescription": "Lucrari de plantat arbori, taieri de corectie arbusti, incarcatul gunoiului,cositul si scarificare  gazon, tratamente pentru boli, administrare ingrasaminte, suprainsamantarea gazon, udarea acestuia, platari de flori anuale;\nLucrari de irigatii (lucrari de reparatii a sistemului de irigatii, inlocuire elemente distruse si deteriorate, interventii pe parcursul duratei de intretinere);\nExecutie, montarea, demontarea mobilierului stradal.",
      "itemMeasureUnit": "pachet",
      "cpvCode": "45112710-5",
      "cpvText": "Lucrari de arhitectura peisagistica a spatiilor verzi (Rev.2)",
      "itemQuantity": "1",
      "unitPrice": "154244.78",
      "unitEstimatedPrice": "154244.78",
      "catalogUnitPrice": "154244.78",
      "lineValue": "154244.78",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121844692"
     }
    ]
   },
   "peers": {},
   "repeats": {
    "0": 0
   }
  }
 },
 "spital": {
  "id": "10444787",
  "label": "Spitalul Sovata, medicamente — prețul la alte 5–12 instituții",
  "record": {
   "id": "10444787",
   "uniqueCode": "DA40236139",
   "title": "STUGERON COMPR. 25MG X 40 - CINNARIZINUM",
   "authority": {
    "cui": "28605975",
    "name": "Spitalul Sovata-Niraj",
    "displayName": "Spitalul Sovata-Niraj"
   },
   "supplier": {
    "cui": "3572074",
    "name": "FARMACEUTICA REMEDIA DISTRIBUTION & LOGISTICS S.R.L.",
    "displayName": "FARMACEUTICA REMEDIA DISTRIBUTION & LOGISTICS S.R.L."
   },
   "cpvCode": "33690000",
   "cpvDivisionCode": "33",
   "valueRon": "479.71",
   "estimatedValueRon": "479.71",
   "currency": null,
   "value": {
    "valueState": "official_exact",
    "valueStateRule": "own_value",
    "valueAccepted": true,
    "valueRonComparable": "479.71",
    "valueComparableBasis": "official",
    "valueRulesVersion": 5,
    "valueResolvedAt": "2026-08-21 15:31:12.464757+00"
   },
   "status": "finalized",
   "countyName": null,
   "publicationDate": "2026-04-23",
   "finalizationDate": "2026-04-24",
   "sourceSystem": "elicitatie_da",
   "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121990419",
   "isCanonical": true,
   "dupGroupId": null
  },
  "today": {
   "availability": "NOT_CAPTURED",
   "authorityCui": "28605975",
   "status": "finalized"
  },
  "target": {
   "availability": "AVAILABLE",
   "authorityCui": "28605975",
   "stateText": "Oferta acceptata",
   "detailJoin": {
    "sourceSystem": "elicitatie_da_detail",
    "sourceRef": "121990419"
   },
   "detail": {
    "description": "COMANDA 119",
    "deliveryCondition": "7 ZILE",
    "paymentCondition": "60 ZILE",
    "contractTypeText": "Furnizare",
    "isEuFunded": false,
    "euFundText": null,
    "caDecisionDate": "2026-04-24T08:40:35Z",
    "caDecisionDeadline": "2026-04-29T14:00:00Z",
    "supplierDecisionDate": "2026-04-24T07:58:33Z",
    "supplierDecisionDeadline": "2026-04-27T14:00:00Z",
    "caRejectionReason": null,
    "supplierRejectionReason": null,
    "correctionReason": null,
    "documentCount": 0,
    "itemCount": 6,
    "itemsTotal": "745.51",
    "itemsValueDelta": "265.80",
    "itemsReconciled": false,
    "textRedacted": false,
    "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121990419",
    "items": [
     {
      "id": "121990419:0",
      "itemIndex": 0,
      "catalogItemCode": "W63847002",
      "catalogItemName": "TRIMBOW SOL.DE INHALAT PRESURIZATA  87/5/9 MCG/DOZA FLAC X 180",
      "catalogItemDescription": "1 flac. presurizat\ncu 180 doze\n(21 luni)",
      "itemMeasureUnit": "FLACON",
      "cpvCode": "33690000-3",
      "cpvText": "Diverse medicamente (Rev.2)",
      "itemQuantity": "1",
      "unitPrice": "249.47",
      "unitEstimatedPrice": "249.47",
      "catalogUnitPrice": "249.47",
      "lineValue": "249.47",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121990419"
     },
     {
      "id": "121990419:1",
      "itemIndex": 1,
      "catalogItemCode": "W66427001",
      "catalogItemName": "PANTOPRAZOL ROMPHARM PULB PT SOL INJ 40MG - PANTOPRAZOLUM",
      "catalogItemDescription": "DCI: PANTOPRAZOLUM\nProducator: S.C. ROMPHARM COMPANY S.R.L. - ROMANIA Forma de prezentare: Cutie cu 1 flac. din sticla inchis cu dop din cauciuc bromobutilic si sigilat cu capsa din Al x pulb. pt. sol. inj.",
      "itemMeasureUnit": "FLACON",
      "cpvCode": "33690000-3",
      "cpvText": "Diverse medicamente (Rev.2)",
      "itemQuantity": "20",
      "unitPrice": "4.68",
      "unitEstimatedPrice": "4.68",
      "catalogUnitPrice": "4.68",
      "lineValue": "93.60",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121990419"
     },
     {
      "id": "121990419:2",
      "itemIndex": 2,
      "catalogItemCode": "W02202002",
      "catalogItemName": "TUSOCALM COMPR. 7,5MG/120MG X 20",
      "catalogItemDescription": "ARENA GROUP RO",
      "itemMeasureUnit": "CUTIE X 20",
      "cpvCode": "33690000-3",
      "cpvText": "Diverse medicamente (Rev.2)",
      "itemQuantity": "3",
      "unitPrice": "22.9",
      "unitEstimatedPrice": "22.9",
      "catalogUnitPrice": "22.9",
      "lineValue": "68.7",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121990419"
     },
     {
      "id": "121990419:3",
      "itemIndex": 3,
      "catalogItemCode": "W59780005",
      "catalogItemName": "DEXAMETAZONA ROMPHARM SOL. INJ. 4MG/ML 2ML X 10 - DEXAMETHASONUM",
      "catalogItemDescription": "DCI: DEXAMETHASONUM\nCutie cu un suport cu 10 fiole din sticla bruna x 2 ml sol. inj.\nROMPHARM COMPANY SRL",
      "itemMeasureUnit": "CUTIE X 10 FIOLE",
      "cpvCode": "33642200-4",
      "cpvText": "Corticosteroizi pentru uz sistemic (Rev.2)",
      "itemQuantity": "5",
      "unitPrice": "9.88",
      "unitEstimatedPrice": "9.88",
      "catalogUnitPrice": "9.88",
      "lineValue": "49.40",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121990419"
     },
     {
      "id": "121990419:4",
      "itemIndex": 4,
      "catalogItemCode": "W10590001",
      "catalogItemName": "STUGERON COMPR. 25MG X 40 - CINNARIZINUM",
      "catalogItemDescription": "TERAPIA-RANBAXY",
      "itemMeasureUnit": "CUTIE X 40",
      "cpvCode": "33690000-3",
      "cpvText": "Diverse medicamente (Rev.2)",
      "itemQuantity": "3",
      "unitPrice": "6.18",
      "unitEstimatedPrice": "6.18",
      "catalogUnitPrice": "6.18",
      "lineValue": "18.54",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121990419"
     },
     {
      "id": "121990419:5",
      "itemIndex": 5,
      "catalogItemCode": "W51310003",
      "catalogItemName": "CLORURA DE SODIU SOL PERF 9MG/ML FLACON 20 X 500ML",
      "catalogItemDescription": "DCI: NATRII CHLORIDUM\nCutie x 20 flacoane 500 ml\nSTADA M&D",
      "itemMeasureUnit": "CT X 20 FL",
      "cpvCode": "33690000-3",
      "cpvText": "Diverse medicamente (Rev.2)",
      "itemQuantity": "3",
      "unitPrice": "88.6",
      "unitEstimatedPrice": "88.6",
      "catalogUnitPrice": "88.6",
      "lineValue": "265.8",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121990419"
     }
    ]
   },
   "peers": {
    "0": {
     "buyers": 5,
     "lines": 6,
     "min": 249.47,
     "median": 249.47,
     "max": 249.47
    },
    "1": {
     "buyers": 5,
     "lines": 5,
     "min": 4.68,
     "median": 4.68,
     "max": 4.68
    },
    "3": {
     "buyers": 12,
     "lines": 16,
     "min": 9.88,
     "median": 9.88,
     "max": 11.76
    }
   },
   "repeats": {
    "0": 0,
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0
   }
  }
 },
 "castel": {
  "id": "11375381",
  "label": "Grădinița Castel, pachete de carne — comenzi săptămânale",
  "record": {
   "id": "11375381",
   "uniqueCode": "DA40194991",
   "title": "pachet carne castel",
   "authority": {
    "cui": "4400808",
    "name": "GRADINITA \"CASTEL\"",
    "displayName": "GRADINITA \"CASTEL\""
   },
   "supplier": {
    "cui": "4417745",
    "name": "HOLDA COM SRL",
    "displayName": "HOLDA COM SRL"
   },
   "cpvCode": "15110000",
   "cpvDivisionCode": "15",
   "valueRon": "16528.14",
   "estimatedValueRon": "16528.14",
   "currency": null,
   "value": {
    "valueState": "official_exact",
    "valueStateRule": "own_value",
    "valueAccepted": true,
    "valueRonComparable": "16528.14",
    "valueComparableBasis": "official",
    "valueRulesVersion": 5,
    "valueResolvedAt": "2026-08-21 15:31:12.464757+00"
   },
   "status": "finalized",
   "countyName": null,
   "publicationDate": "2026-04-17",
   "finalizationDate": "2026-04-20",
   "sourceSystem": "elicitatie_da",
   "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121946458",
   "isCanonical": true,
   "dupGroupId": null
  },
  "today": {
   "availability": "NOT_CAPTURED",
   "authorityCui": "4400808",
   "status": "finalized"
  },
  "target": {
   "availability": "AVAILABLE",
   "authorityCui": "4400808",
   "stateText": "Oferta acceptata",
   "detailJoin": {
    "sourceSystem": "elicitatie_da_detail",
    "sourceRef": "121946458"
   },
   "detail": {
    "description": "piept curcan dez f piele 13.9kg*85.14, pulpe pui dez f piele 17.4kg*46.40",
    "deliveryCondition": "la sediu",
    "paymentCondition": "op la 30 zile",
    "contractTypeText": "Furnizare",
    "isEuFunded": false,
    "euFundText": null,
    "caDecisionDate": "2026-04-20T09:13:55Z",
    "caDecisionDeadline": "2026-04-22T14:00:00Z",
    "supplierDecisionDate": "2026-04-17T09:49:33Z",
    "supplierDecisionDeadline": "2026-04-22T14:00:00Z",
    "caRejectionReason": null,
    "supplierRejectionReason": null,
    "correctionReason": null,
    "documentCount": 0,
    "itemCount": 11,
    "itemsTotal": "16528.14",
    "itemsValueDelta": "0.00",
    "itemsReconciled": true,
    "textRedacted": false,
    "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121946458",
    "items": [
     {
      "id": "121946458:0",
      "itemIndex": 0,
      "catalogItemCode": "pachet 21% castel (clopotel)",
      "catalogItemName": "pachet 21% castel (clopotel)",
      "catalogItemDescription": "alpro bautura soia 1l 1buc*19.42",
      "itemMeasureUnit": "bucata",
      "cpvCode": "15800000-6",
      "cpvText": "Diverse produse alimentare (Rev.2)",
      "itemQuantity": "1",
      "unitPrice": "19.42",
      "unitEstimatedPrice": "19.42",
      "catalogUnitPrice": "19.42",
      "lineValue": "19.42",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121946458"
     },
     {
      "id": "121946458:1",
      "itemIndex": 1,
      "catalogItemCode": "pachet legume-fructe castel (clopotel)",
      "catalogItemName": "pachet legume-fructe castel (clopotel)",
      "catalogItemDescription": "zarzavat ciorba 680g 36buc*13.06, lamai 2.9kg*21.17, cartofi 69kg*4.50, morcov 10kg*5.41, ceapa 10kg*4.50, kapia 10kg*40.09, pastarnac 10.4kg*12.16, mazare cong 2.5kg 6buc*46.40, usturoi 0.5kg*41.44, telina 10.1kg*8.56, mere 15.4kg*8.11, masline nfs 2kg*40.99",
      "itemMeasureUnit": "bucata",
      "cpvCode": "15300000-1",
      "cpvText": "Fructe, legume si produse conexe (Rev.2)",
      "itemQuantity": "1",
      "unitPrice": "2061.35",
      "unitEstimatedPrice": "2061.35",
      "catalogUnitPrice": "2061.35",
      "lineValue": "2061.35",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121946458"
     },
     {
      "id": "121946458:2",
      "itemIndex": 2,
      "catalogItemCode": "pachet bacanie castel (clopotel)",
      "catalogItemName": "pachet bacanie castel (clopotel)",
      "catalogItemDescription": "ceai belin fructe 20cut*5.86, fusilli barilla 500g 24buc*9.46, bors proaspat 1l 6buc*6.31, zahar tos 1kg 10buc*8.56, biscuiti digestivi gullon f zahar 400g 3buc*44.59, oua 150buc*2.25",
      "itemMeasureUnit": "bucata",
      "cpvCode": "15800000-6",
      "cpvText": "Diverse produse alimentare (Rev.2)",
      "itemQuantity": "1",
      "unitPrice": "939.2",
      "unitEstimatedPrice": "939.2",
      "catalogUnitPrice": "939.2",
      "lineValue": "939.2",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121946458"
     },
     {
      "id": "121946458:3",
      "itemIndex": 3,
      "catalogItemCode": "pachet branzeturi castel (clopotel)",
      "catalogItemName": "pachet branzeturi castel (clopotel)",
      "catalogItemDescription": "unt mc 80% 200g 40buc*20.27, lapte olympus 3.5% 1l 60buc*15.32, telemea hochland 10.5kg*76.13, cascaval mc 3.9kg*61.71, mic dejun activia cereale 168g 80buc*8.56, alpro iaurt cocos 150g 1buc*8.56, telemea fara lactoza 150g 1buc*28.38, cascaval felii fara lactoza 120g 1buc*22.07",
      "itemMeasureUnit": "kg",
      "cpvCode": "15540000-5",
      "cpvText": "Branzeturi (Rev.2)",
      "itemQuantity": "1",
      "unitPrice": "3513.43",
      "unitEstimatedPrice": "3513.43",
      "catalogUnitPrice": "3513.43",
      "lineValue": "3513.43",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121946458"
     },
     {
      "id": "121946458:4",
      "itemIndex": 4,
      "catalogItemCode": "pachet carne  castel (clopotel)",
      "catalogItemName": "pachet carne castel (clopotel)",
      "catalogItemDescription": "pulpe pui dez f piele 25.9kg*46.40",
      "itemMeasureUnit": "bucata",
      "cpvCode": "15110000-2",
      "cpvText": "Carne (Rev.2)",
      "itemQuantity": "1",
      "unitPrice": "1201.67",
      "unitEstimatedPrice": "1201.67",
      "catalogUnitPrice": "1201.67",
      "lineValue": "1201.67",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121946458"
     },
     {
      "id": "121946458:5",
      "itemIndex": 5,
      "catalogItemCode": "pachet morarit castel (clopotel)",
      "catalogItemName": "pachet morarit castel (clopotel)",
      "catalogItemDescription": "malai extra boromir 1kg 10buc*6.31, fulgi porumb nestle 500g 16buc*24.32, cus-cus hutton 500g 10buc*7.66",
      "itemMeasureUnit": "kg",
      "cpvCode": "15600000-4",
      "cpvText": "Produse de morarit, amidon si produse amilacee (Rev.2)",
      "itemQuantity": "1",
      "unitPrice": "528.83",
      "unitEstimatedPrice": "528.83",
      "catalogUnitPrice": "528.83",
      "lineValue": "528.83",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121946458"
     },
     {
      "id": "121946458:6",
      "itemIndex": 6,
      "catalogItemCode": "pachet 21%  castel",
      "catalogItemName": "pachet 21% castel",
      "catalogItemDescription": "alpro bautura soia 1l 3buc*19.42, biscuiti poienii merisoare 40g 180buc*2.48",
      "itemMeasureUnit": "bucata",
      "cpvCode": "15800000-6",
      "cpvText": "Diverse produse alimentare (Rev.2)",
      "itemQuantity": "1",
      "unitPrice": "504.55",
      "unitEstimatedPrice": "504.55",
      "catalogUnitPrice": "504.55",
      "lineValue": "504.55",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121946458"
     },
     {
      "id": "121946458:7",
      "itemIndex": 7,
      "catalogItemCode": "pachet legume-fructe castel",
      "catalogItemName": "pachet legume-fructe castel",
      "catalogItemDescription": "mazare congelata 2.5kg 6buc*46.40, legume uscate 200g 15buc*13.06, legume uscate 400g 7buc*25.68, masline negre f samburi 4kg*40.99",
      "itemMeasureUnit": "kg",
      "cpvCode": "15300000-1",
      "cpvText": "Fructe, legume si produse conexe (Rev.2)",
      "itemQuantity": "1",
      "unitPrice": "818.02",
      "unitEstimatedPrice": "818.02",
      "catalogUnitPrice": "818.02",
      "lineValue": "818.02",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121946458"
     },
     {
      "id": "121946458:8",
      "itemIndex": 8,
      "catalogItemCode": "pachet bacanie castel",
      "catalogItemName": "pachet bacanie castel",
      "catalogItemDescription": "oua toneli 300buc*2.25, bors proaspat 1l 6buc*6.31, cimbru uscat 8g 30buc*3.60, biscuiti populari 6kg*16.67, ceai teekanne 32buc*23.87",
      "itemMeasureUnit": "bucata",
      "cpvCode": "15800000-6",
      "cpvText": "Diverse produse alimentare (Rev.2)",
      "itemQuantity": "1",
      "unitPrice": "2090.99",
      "unitEstimatedPrice": "2090.99",
      "catalogUnitPrice": "2090.99",
      "lineValue": "2090.99",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121946458"
     },
     {
      "id": "121946458:9",
      "itemIndex": 9,
      "catalogItemCode": "pachet branzeturi castel",
      "catalogItemName": "pachet branzeturi castel",
      "catalogItemDescription": "unt mc 80% 200g 40buc*20.27, lapte olympus 3.5% 1l 60buc*15.13, cascaval mc 8.2kg*61.71, telemea hochland 8.2kg*76.13",
      "itemMeasureUnit": "bucata",
      "cpvCode": "15540000-5",
      "cpvText": "Branzeturi (Rev.2)",
      "itemQuantity": "1",
      "unitPrice": "2860",
      "unitEstimatedPrice": "2860",
      "catalogUnitPrice": "2860",
      "lineValue": "2860",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121946458"
     },
     {
      "id": "121946458:10",
      "itemIndex": 10,
      "catalogItemCode": "pachet carne castel",
      "catalogItemName": "pachet carne castel",
      "catalogItemDescription": "piept curcan dez f piele 13.9kg*85.14, pulpe pui dez f piele 17.4kg*46.40",
      "itemMeasureUnit": "bucata",
      "cpvCode": "15110000-2",
      "cpvText": "Carne (Rev.2)",
      "itemQuantity": "1",
      "unitPrice": "1990.68",
      "unitEstimatedPrice": "1990.68",
      "catalogUnitPrice": "1990.68",
      "lineValue": "1990.68",
      "sourceUrl": "https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/121946458"
     }
    ]
   },
   "peers": {},
   "repeats": {
    "0": 17,
    "1": 23,
    "2": 15,
    "3": 22,
    "4": 18,
    "5": 11,
    "6": 16,
    "7": 22,
    "8": 15,
    "9": 19,
    "10": 16
   }
  }
 },
 "raport": {
  "id": "14927819",
  "label": "Apa Brașov, parchet — rând din raportul trimestrial",
  "record": {
   "id": "14927819",
   "uniqueCode": "DA38228381",
   "title": "PARCHET 10MM C32 H2970 STEJAR NORD NATUR",
   "authority": {
    "cui": "1096128",
    "name": "Compania APA Brasov",
    "displayName": "Compania APA Brasov"
   },
   "supplier": {
    "cui": "2816464",
    "name": "DEDEMAN S.R.L.",
    "displayName": "DEDEMAN S.R.L."
   },
   "cpvCode": "44112240",
   "cpvDivisionCode": "44",
   "valueRon": "1097.55",
   "estimatedValueRon": null,
   "currency": null,
   "value": {
    "valueState": "official_exact",
    "valueStateRule": "own_value",
    "valueAccepted": true,
    "valueRonComparable": "1097.55",
    "valueComparableBasis": "official",
    "valueRulesVersion": 5,
    "valueResolvedAt": "2026-08-21 15:33:42.171567+00"
   },
   "status": "unknown",
   "countyName": null,
   "publicationDate": "2025-05-29",
   "finalizationDate": "2025-06-02",
   "sourceSystem": "seap_da",
   "sourceUrl": "https://data.gov.ro/dataset/e0cf7ffc-1fa0-4ffb-a82f-c83981d81f21/resource/8e6fa9e7-62e9-4ec2-bef5-495f3d09eef3/download/achizitii-directe-t2-2025.xlsx",
   "isCanonical": true,
   "dupGroupId": null
  },
  "today": {
   "availability": "NOT_AVAILABLE_FOR_SOURCE",
   "authorityCui": "1096128",
   "status": "unknown"
  },
  "target": {
   "availability": "NOT_AVAILABLE_FOR_SOURCE",
   "authorityCui": "1096128",
   "stateText": null,
   "detailJoin": null,
   "detail": null,
   "peers": {},
   "repeats": {}
  }
 },
 "notificare": {
  "id": "16894776",
  "label": "Spitalul Brașov, pază — notificare de atribuire",
  "record": {
   "id": "16894776",
   "uniqueCode": "DAN2547167",
   "title": "Acord Cadru (24 luni) Servicii de pază și protecție pentru sediul central Spitalului Clinic de Psihiatrie și Neurologie Brașov Str. Prundului, nr. 7 – 9 și Secțiile Exterioare (Conform Anexa 1)",
   "authority": {
    "cui": "4317770",
    "name": "Spitalul Clinic de Psihiatrie si Neurologie Brasov",
    "displayName": "Spitalul Clinic de Psihiatrie si Neurologie Brasov"
   },
   "supplier": {
    "cui": "35469698",
    "name": "S.C. TMG GUARD SRL S.R.L.",
    "displayName": "S.C. TMG GUARD SRL S.R.L."
   },
   "cpvCode": "79713000",
   "cpvDivisionCode": "79",
   "valueRon": "3516088.80",
   "estimatedValueRon": null,
   "currency": null,
   "value": {
    "valueState": "official_exact",
    "valueStateRule": "own_value",
    "valueAccepted": true,
    "valueRonComparable": "3516088.80",
    "valueComparableBasis": "official",
    "valueRulesVersion": 5,
    "valueResolvedAt": "2026-08-21 15:34:56.442736+00"
   },
   "status": "unknown",
   "countyName": null,
   "publicationDate": "2025-12-09",
   "finalizationDate": "2025-12-09",
   "sourceSystem": "seap_dan",
   "sourceUrl": "https://data.gov.ro/dataset/e0cf7ffc-1fa0-4ffb-a82f-c83981d81f21/resource/697b85c0-9667-40c1-b5e2-195408034ae0/download/datagov-notificari-de-atribuire-la-cumpararea-directa-tiii-2025.xlsx",
   "isCanonical": true,
   "dupGroupId": null
  },
  "today": {
   "availability": "NOT_AVAILABLE_FOR_SOURCE",
   "authorityCui": "4317770",
   "status": "unknown"
  },
  "target": {
   "availability": "NOT_AVAILABLE_FOR_SOURCE",
   "authorityCui": "4317770",
   "stateText": null,
   "detailJoin": null,
   "detail": null,
   "peers": {},
   "repeats": {}
  }
 }
}
