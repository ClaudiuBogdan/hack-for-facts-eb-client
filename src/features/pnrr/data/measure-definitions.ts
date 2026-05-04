export type PnrrMeasureDefinition = {
  readonly nameRo: string
  readonly type: 'investment' | 'reform'
}

/**
 * Official measure mappings keyed by composite measureFullCode (e.g. C4-I1).
 * Measure codes are component-relative: C4-I1 ≠ C15-I1.
 */
export const PNRR_MEASURES: Record<string, PnrrMeasureDefinition> = {
  // ═════════════════════════════════════════════════════════════════
  // C1 — Managementul apei
  // ═════════════════════════════════════════════════════════════════
  'C1-I1': {
    nameRo: 'Investiția 1. Construirea / extinderea sistemelor de apă și canalizare în aglomerări mai mari de 2.000 locuitori',
    type: 'investment',
  },
  'C1-I2': {
    nameRo: 'Investiția 2. Colectarea apelor uzate în aglomerări mai mici de 2.000 locuitori',
    type: 'investment',
  },
  'C1-I3': {
    nameRo: 'Investiția 3. Sprijinirea conectării populației cu venituri mici la rețelele de apă și canalizare existente',
    type: 'investment',
  },
  'C1-I4': {
    nameRo: 'Investiția 4. Reabilitarea acumulărilor / adaptarea la schimbările climatice prin automatizarea echipamentelor de evacuare și stocare a apei',
    type: 'investment',
  },
  'C1-I5': {
    nameRo: 'Investiția 5. Dotarea administrațiilor bazinale pentru monitorizarea infrastructurii, prevenirea și gestionarea situațiilor de urgență',
    type: 'investment',
  },
  'C1-I6': {
    nameRo: 'Investiția 6. Realizarea cadastrului apelor',
    type: 'investment',
  },
  'C1-I7': {
    nameRo: 'Investiția 7. Extinderea rețelei naționale de observații din cadrul Sistemului Meteorologic Integrat Național',
    type: 'investment',
  },

  // ═════════════════════════════════════════════════════════════════
  // C2 — Păduri și protecția biodiversității
  // ═════════════════════════════════════════════════════════════════
  'C2-I1': {
    nameRo: 'Investiția 1. Campania națională de împădurire și reîmpădurire, inclusiv păduri urbane',
    type: 'investment',
  },
  'C2-I2': {
    nameRo: 'Investiția 2. Dezvoltarea de capacități moderne de producere a materialului forestier de reproducere',
    type: 'investment',
  },
  'C2-I3': {
    nameRo: 'Investiția 3. Actualizarea planurilor de management aprobate și identificarea zonelor potențiale de protecție strictă',
    type: 'investment',
  },
  'C2-I4': {
    nameRo: 'Investiția 4. Investiții integrate de reconstrucție ecologică a habitatelor și conservarea speciilor',
    type: 'investment',
  },
  'C2-I5': {
    nameRo: 'Investiția 5. Sisteme integrate de reducere a riscurilor generate de viituri torențiale în bazinete forestiere',
    type: 'investment',
  },

  // ═════════════════════════════════════════════════════════════════
  // C3 — Managementul deșeurilor
  // ═════════════════════════════════════════════════════════════════
  'C3-I1': {
    nameRo: 'Investiția 1. Dezvoltarea, modernizarea și completarea sistemelor de management integrat al deșeurilor municipale',
    type: 'investment',
  },
  'C3-I2': {
    nameRo: 'Investiția 2. Dezvoltarea infrastructurii pentru managementul gunoiului de grajd și al altor deșeuri agricole compostabile',
    type: 'investment',
  },
  'C3-I3': {
    nameRo: 'Investiția 3. Dezvoltarea capacităților instituționale de monitorizare publică și control pentru gestionarea deșeurilor și prevenirea poluării',
    type: 'investment',
  },

  // ═════════════════════════════════════════════════════════════════
  // C4 — Transport sustenabil
  // ═════════════════════════════════════════════════════════════════
  'C4-I1': {
    nameRo: 'Investiția 1. Modernizarea și reînnoirea infrastructurii feroviare',
    type: 'investment',
  },
  'C4-I2': {
    nameRo: 'Investiția 2. Material rulant feroviar',
    type: 'investment',
  },
  'C4-I3': {
    nameRo: 'Investiția 3. Dezvoltarea infrastructurii rutiere sustenabile aferente rețelei TEN-T, taxarea drumurilor, managementul traficului și siguranța rutieră',
    type: 'investment',
  },
  'C4-I4': {
    nameRo: 'Investiția 4. Dezvoltarea rețelei de transport cu metroul în municipiile București și Cluj-Napoca',
    type: 'investment',
  },
  'C4-R1': {
    nameRo: 'Reforma 1. Transport sustenabil, decarbonizare și siguranță rutieră',
    type: 'reform',
  },
  'C4-R2': {
    nameRo: 'Reforma 2. Management performant pentru transport de calitate',
    type: 'reform',
  },

  // ═════════════════════════════════════════════════════════════════
  // C5 — Valul Renovării
  // ═════════════════════════════════════════════════════════════════
  'C5-I1': {
    nameRo: 'Investiția 1. Instituirea unui fond pentru Valul Renovării care să finanțeze lucrări de îmbunătățire a eficienței energetice a fondului construit',
    type: 'investment',
  },
  'C5-I2': {
    nameRo: 'Investiția 2. Implementarea Registrului național al clădirilor',
    type: 'investment',
  },
  'C5-I3': {
    nameRo: 'Investiția 3. Consolidarea capacității profesionale a specialiștilor și lucrătorilor din domeniul construcțiilor',
    type: 'investment',
  },
  'C5-I4': {
    nameRo: 'Investiția 4. Economie circulară și creșterea eficienței energetice a clădirilor istorice',
    type: 'investment',
  },

  // ═════════════════════════════════════════════════════════════════
  // C6 — Energie
  // ═════════════════════════════════════════════════════════════════
  'C6-I3': {
    nameRo: 'Investiția 3. Cogenerare și eficiență energetică',
    type: 'investment',
  },
  'C6-I4': {
    nameRo: 'Investiția 4. Energie regenerabilă și hidrogen',
    type: 'investment',
  },

  // ═════════════════════════════════════════════════════════════════
  // C7 — Transformarea digitală
  // ═════════════════════════════════════════════════════════════════
  'C7-I1': {
    nameRo: 'Investiția 1. Implementarea infrastructurii de cloud guvernamental',
    type: 'investment',
  },
  'C7-I2': {
    nameRo: 'Investiția 2. Dezvoltarea cloudului și migrarea în cloud',
    type: 'investment',
  },
  'C7-I3': {
    nameRo: 'Investiția 3. Realizarea sistemului de eHealth și telemedicină',
    type: 'investment',
  },
  'C7-I4': {
    nameRo: 'Investiția 4. Digitalizarea sistemului judiciar',
    type: 'investment',
  },
  'C7-I5': {
    nameRo: 'Investiția 5. Digitalizare în domeniul mediului',
    type: 'investment',
  },
  'C7-I6': {
    nameRo: 'Investiția 6. Digitalizarea în domeniul muncii și protecției sociale',
    type: 'investment',
  },
  'C7-I7': {
    nameRo: 'Investiția 7. Implementarea formularelor electronice eForms în domeniul achizițiilor publice',
    type: 'investment',
  },
  'C7-I8': {
    nameRo: 'Investiția 8. Cartea de identitate electronică și semnătura digitală',
    type: 'investment',
  },
  'C7-I9': {
    nameRo: 'Investiția 9. Digitalizarea sectorului organizațiilor neguvernamentale',
    type: 'investment',
  },
  'C7-I10': {
    nameRo: 'Investiția 10. Transformarea digitală în managementul funcției publice',
    type: 'investment',
  },
  'C7-I11': {
    nameRo: 'Investiția 11. Scheme de sprijin pentru utilizarea serviciilor de comunicații, cu accent pe zonele albe',
    type: 'investment',
  },
  'C7-I12': {
    nameRo: 'Investiția 12. Asigurarea protecției cibernetice pentru infrastructuri TIC publice și private critice',
    type: 'investment',
  },
  'C7-I13': {
    nameRo: 'Investiția 13. Dezvoltarea sistemelor de securitate pentru protecția spectrului guvernamental',
    type: 'investment',
  },
  'C7-I14': {
    nameRo: 'Investiția 14. Sporirea rezilienței și securității cibernetice a serviciilor de infrastructură ale furnizorilor de servicii de internet pentru autoritățile publice',
    type: 'investment',
  },
  'C7-I15': {
    nameRo: 'Investiția 15. Crearea de noi competențe de securitate cibernetică pentru societate și economie',
    type: 'investment',
  },
  'C7-I16': {
    nameRo: 'Investiția 16. Program de formare de competențe digitale avansate pentru funcționarii publici',
    type: 'investment',
  },
  'C7-I17': {
    nameRo: 'Investiția 17. Scheme de finanțare pentru biblioteci pentru a deveni hub-uri de dezvoltare a competențelor digitale',
    type: 'investment',
  },
  'C7-I18': {
    nameRo: 'Investiția 18. Automatizarea proceselor de lucru în administrația publică',
    type: 'investment',
  },
  'C7-I19': {
    nameRo: 'Investiția 19. Competențe în tehnologii avansate pentru IMM-uri',
    type: 'investment',
  },

  // ═════════════════════════════════════════════════════════════════
  // C8 — Reforma fiscală și reforma sistemului de pensii
  // ═════════════════════════════════════════════════════════════════
  'C8-I1': {
    nameRo: 'Investiția 1. Creșterea conformării voluntare a contribuabililor prin dezvoltarea serviciilor digitale',
    type: 'investment',
  },
  'C8-I2': {
    nameRo: 'Investiția 2. Îmbunătățirea proceselor de administrare a impozitelor și taxelor, inclusiv prin managementul integrat al riscurilor',
    type: 'investment',
  },
  'C8-I3': {
    nameRo: 'Investiția 3. Transformarea digitală a Ministerului Finanțelor / ANAF',
    type: 'investment',
  },
  'C8-I4': {
    nameRo: 'Investiția 4. Implementarea vămii electronice',
    type: 'investment',
  },
  'C8-I5': {
    nameRo: 'Investiția 5. Îmbunătățirea mecanismului de programare bugetară',
    type: 'investment',
  },
  'C8-I6': {
    nameRo: 'Investiția 6. Instrument de modelare economică pentru reforma pensiilor',
    type: 'investment',
  },
  'C8-I7': {
    nameRo: 'Investiția 7. Asistență tehnică pentru revizuirea cadrului fiscal',
    type: 'investment',
  },
  'C8-I8': {
    nameRo: 'Investiția 8. Operaționalizarea Băncii Naționale de Dezvoltare',
    type: 'investment',
  },
  'C8-I9': {
    nameRo: 'Investiția 9. Susținerea procesului de evaluare a dosarelor de pensii aflate în plată',
    type: 'investment',
  },
  'C8-I10': {
    nameRo: 'Investiția 10. Eficiență operațională și servicii electronice avansate pentru sistemul național de pensii',
    type: 'investment',
  },
  'C8-R1': {
    nameRo: 'Reforma 1. Reforma ANAF prin digitalizare',
    type: 'reform',
  },
  'C8-R2': {
    nameRo: 'Reforma 2. Modernizarea sistemului vamal și implementarea vămii electronice',
    type: 'reform',
  },
  'C8-R5': {
    nameRo: 'Reforma 5. Banca Națională de Dezvoltare',
    type: 'reform',
  },
  'C8-R6': {
    nameRo: 'Reforma 6. Reforma sistemului public de pensii',
    type: 'reform',
  },

  // ═════════════════════════════════════════════════════════════════
  // C9 — Suport pentru sectorul privat și CDI
  // ═════════════════════════════════════════════════════════════════
  'C9-I2': {
    nameRo: 'Investiția 2. Instrumente financiare pentru sectorul privat',
    type: 'investment',
  },
  'C9-I3': {
    nameRo: 'Investiția 3. Scheme de ajutor pentru sectorul privat',
    type: 'investment',
  },
  'C9-I4': {
    nameRo: 'Investiția 4. Proiecte transfrontaliere și multinaționale – procesoare cu consum redus de energie și cipuri semiconductoare',
    type: 'investment',
  },
  'C9-I5': {
    nameRo: 'Investiția 5. Înființarea și operaționalizarea centrelor de competență',
    type: 'investment',
  },
  'C9-I6': {
    nameRo: 'Investiția 6. Programul de mentorat Orizont Europa',
    type: 'investment',
  },
  'C9-I8': {
    nameRo: 'Investiția 8. Inovare și cercetare',
    type: 'investment',
  },
  'C9-I9': {
    nameRo: 'Investiția 9. Sprijin pentru posesorii de certificate de excelență Marie Skłodowska-Curie',
    type: 'investment',
  },
  'C9-I10': {
    nameRo: 'Investiția 10. Rețea națională de centre regionale de orientare în carieră ca parte a ERA TALENT PLATFORM',
    type: 'investment',
  },

  // ═════════════════════════════════════════════════════════════════
  // C10 — Fondul local
  // ═════════════════════════════════════════════════════════════════
  'C10-I1': {
    nameRo: 'Investiția 1. Mobilitate urbană durabilă',
    type: 'investment',
  },
  'C10-I2': {
    nameRo: 'Investiția 2. Construirea de locuințe pentru tineri / locuințe pentru specialiști în sănătate și educație',
    type: 'investment',
  },
  'C10-I3': {
    nameRo: 'Investiția 3. Renovarea / reabilitarea moderată a clădirilor publice pentru îmbunătățirea serviciilor publice',
    type: 'investment',
  },
  'C10-I4': {
    nameRo: 'Investiția 4. Elaborarea / actualizarea în format GIS a documentelor de amenajare a teritoriului și de urbanism',
    type: 'investment',
  },

  // ═════════════════════════════════════════════════════════════════
  // C11 — Turism și cultură
  // ═════════════════════════════════════════════════════════════════
  'C11-I1': {
    nameRo: 'Investiția 1. Promovarea celor 12 rute turistice / culturale',
    type: 'investment',
  },
  'C11-I2': {
    nameRo: 'Investiția 2. Modernizarea / crearea de muzee și memoriale',
    type: 'investment',
  },
  'C11-I5': {
    nameRo: 'Investiția 5. Sporirea accesului la cultură în zonele defavorizate din punct de vedere cultural',
    type: 'investment',
  },
  'C11-I6': {
    nameRo: 'Investiția 6. Dezvoltarea unui sistem digital pentru procesele de finanțare a culturii',
    type: 'investment',
  },
  'C11-I7': {
    nameRo: 'Investiția 7. Accelerarea digitalizării producției și distribuției de filme',
    type: 'investment',
  },

  // ═════════════════════════════════════════════════════════════════
  // C12 — Sănătate
  // ═════════════════════════════════════════════════════════════════
  'C12-I1': {
    nameRo: 'Investiția 1. Dezvoltarea infrastructurii medicale prespitalicești',
    type: 'investment',
  },
  'C12-I2': {
    nameRo: 'Investiția 2. Dezvoltarea infrastructurii spitalicești publice',
    type: 'investment',
  },
  'C12-I4': {
    nameRo: 'Investiția 4. Ambulanțe / dezvoltarea capacității de intervenție medicală de urgență',
    type: 'investment',
  },

  // ═════════════════════════════════════════════════════════════════
  // C13 — Reforme sociale
  // ═════════════════════════════════════════════════════════════════
  'C13-I1': {
    nameRo: 'Investiția 1. Crearea unei rețele de centre de zi pentru copiii expuși riscului de a fi separați de familie',
    type: 'investment',
  },
  'C13-I2': {
    nameRo: 'Investiția 2. Reabilitarea, renovarea și dezvoltarea infrastructurii sociale pentru persoanele cu dizabilități',
    type: 'investment',
  },
  'C13-I3': {
    nameRo: 'Investiția 3. Operaționalizarea introducerii tichetelor de muncă pentru activitățile casnice',
    type: 'investment',
  },
  'C13-I4': {
    nameRo: 'Investiția 4. Crearea unei rețele de centre de îngrijire de zi și de reabilitare pentru persoanele în vârstă',
    type: 'investment',
  },
  'C13-R2': {
    nameRo: 'Reforma 2. Reforma sistemului de protecție socială',
    type: 'reform',
  },

  // ═════════════════════════════════════════════════════════════════
  // C14 — Bună guvernanță
  // ═════════════════════════════════════════════════════════════════
  'C14-I1': {
    nameRo: 'Investiția 1. Optimizarea infrastructurii judiciare pentru a garanta accesul la justiție și calitatea serviciilor',
    type: 'investment',
  },
  'C14-I2': {
    nameRo: 'Investiția 2. Dezvoltarea infrastructurii logistice necesare luptei împotriva corupției și recuperării produsului și prejudiciilor generate de infracțiuni',
    type: 'investment',
  },
  'C14-I3': {
    nameRo: 'Investiția 3. Crearea de structuri parteneriale locale între autoritățile locale și societatea civilă',
    type: 'investment',
  },
  'C14-I4': {
    nameRo: 'Investiția 4. Creșterea capacității organizațiilor societății civile de stimulare a cetățeniei active',
    type: 'investment',
  },
  'C14-I5': {
    nameRo: 'Investiția 5. Monitorizarea și implementarea planului',
    type: 'investment',
  },
  'C14-R2': {
    nameRo: 'Reforma 2. Reforme administrative și transparență',
    type: 'reform',
  },
  'C14-R9': {
    nameRo: 'Reforma 9. Mecanisme de parteneriat civic',
    type: 'reform',
  },

  // ═════════════════════════════════════════════════════════════════
  // C15 — Educație
  // ═════════════════════════════════════════════════════════════════
  'C15-I1': {
    nameRo: 'Investiția 1. Construirea, echiparea și operaționalizarea a 110 creșe',
    type: 'investment',
  },
  'C15-I2': {
    nameRo: 'Investiția 2. Înființarea, echiparea și operaționalizarea serviciilor complementare pentru grupurile dezavantajate',
    type: 'investment',
  },
  'C15-I3': {
    nameRo: 'Investiția 3. Formarea continuă a profesioniștilor care lucrează în servicii de educație timpurie',
    type: 'investment',
  },
  'C15-I4': {
    nameRo: 'Investiția 4. Sprijinirea unităților de învățământ cu risc crescut de abandon școlar',
    type: 'investment',
  },
  'C15-I5': {
    nameRo: 'Investiția 5. Instruiri pentru utilizatorii SIIIR și MATE și intervenții sistemice pentru reducerea abandonului școlar',
    type: 'investment',
  },
  'C15-I6': {
    nameRo: 'Investiția 6. Dezvoltarea consorțiilor regionale și a campusurilor profesionale integrate',
    type: 'investment',
  },
  'C15-I7': {
    nameRo: 'Investiția 7. Transformarea liceelor agricole în centre de profesionalizare',
    type: 'investment',
  },
  'C15-I8': {
    nameRo: 'Investiția 8. Program de formare la locul de muncă pentru personalul didactic',
    type: 'investment',
  },
  'C15-I9': {
    nameRo: 'Investiția 9. Asigurarea echipamentelor și a resurselor tehnologice digitale pentru unitățile de învățământ',
    type: 'investment',
  },
  'C15-I10': {
    nameRo: 'Investiția 10. Dezvoltarea rețelei de școli verzi și achiziționarea de microbuze verzi',
    type: 'investment',
  },
  'C15-I11': {
    nameRo: 'Investiția 11. Asigurarea dotărilor pentru sălile de clasă preuniversitare și laboratoarele / atelierele școlare',
    type: 'investment',
  },
  'C15-I13': {
    nameRo: 'Investiția 13. Echiparea laboratoarelor de informatică din unitățile de învățământ profesional și tehnic',
    type: 'investment',
  },
  'C15-I14': {
    nameRo: 'Investiția 14. Echiparea atelierelor de practică din unitățile de învățământ profesional și tehnic',
    type: 'investment',
  },
  'C15-I15': {
    nameRo: 'Investiția 15. Școala online: dezvoltarea platformei de evaluare și realizarea de conținut',
    type: 'investment',
  },
  'C15-I16': {
    nameRo: 'Investiția 16. Digitalizarea universităților și pregătirea acestora pentru profesiile digitale ale viitorului',
    type: 'investment',
  },
  'C15-I17': {
    nameRo: 'Investiția 17. Asigurarea infrastructurii universitare: cămine, cantine, spații de recreere',
    type: 'investment',
  },
  'C15-I18': {
    nameRo: 'Investiția 18. Programul de formare și îndrumare pentru managerii și inspectorii școlari',
    type: 'investment',
  },

  // ═════════════════════════════════════════════════════════════════
  // C16 — REPowerEU
  // ═════════════════════════════════════════════════════════════════
  'C16-I1': {
    nameRo: 'Investiția 1. Formarea profesională a resursei umane pentru dobândirea de competențe în domeniul energiei verzi',
    type: 'investment',
  },
  'C16-I2': {
    nameRo: 'Investiția 2. Noi capacități pentru producerea de energie electrică din surse regenerabile',
    type: 'investment',
  },
  'C16-I3': {
    nameRo: 'Investiția 3. Creșterea eficienței energetice a clădirilor publice',
    type: 'investment',
  },
  'C16-I4': {
    nameRo: 'Investiția 4. Schema de granturi sub formă de bonuri valorice pentru accelerarea utilizării energiei din surse regenerabile de către gospodării',
    type: 'investment',
  },
  'C16-I5': {
    nameRo: 'Investiția 5. Eficientizarea, modernizarea și digitalizarea rețelei naționale de transport a energiei electrice',
    type: 'investment',
  },
  'C16-I6': {
    nameRo: 'Investiția 6. Proiect pilot pentru capacitate fotovoltaică flotabilă pe infrastructura sistemelor hidroameliorative',
    type: 'investment',
  },
  'C16-I7': {
    nameRo: 'Investiția 7. Schema de granturi sub formă de bonuri valorice pentru îmbunătățirea eficienței energetice în gospodării',
    type: 'investment',
  },
  'C16-I8': {
    nameRo: 'Investiția 8. Contracte pentru diferență pentru producerea de energie electrică din surse regenerabile eoliene și solare fotovoltaice',
    type: 'investment',
  },
} as const

export const PNRR_MEASURE_KEYS = Object.keys(PNRR_MEASURES)

export function getMeasureDisplayLabel(measureFullCode: string): string {
  const def = PNRR_MEASURES[measureFullCode]
  if (!def) return measureFullCode.replace('-', '.')
  const short = measureFullCode.replace('-', '.')
  return `${short} — ${def.nameRo}`
}

export function getMeasureShortLabel(measureFullCode: string): string {
  const def = PNRR_MEASURES[measureFullCode]
  if (!def) return measureFullCode.replace('-', '.')
  return `${measureFullCode.replace('-', '.')} — ${def.nameRo}`
}
