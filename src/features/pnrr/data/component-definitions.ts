export type PnrrComponentDefinition = {
  readonly code: string
  readonly nameRo: string
  readonly nameEn: string
  readonly color: string
  readonly descriptionRo: string
}

export const PNRR_COMPONENTS: Record<string, PnrrComponentDefinition> = {
  C1: {
    code: 'C1',
    nameRo: 'Managementul apei',
    nameEn: 'Water Management',
    color: '#3b82f6',
    descriptionRo:
      'Infrastructură de apă și apă uzată, extindere rețele, acces la utilități de bază, măsuri de adaptare la schimbări climatice și inundații.',
  },
  C2: {
    code: 'C2',
    nameRo: 'Păduri și protecția biodiversității',
    nameEn: 'Forests and Biodiversity',
    color: '#22c55e',
    descriptionRo:
      'Împăduriri, protecția biodiversității, monitorizarea pădurilor, prevenirea tăierilor ilegale, restaurarea habitatelor.',
  },
  C3: {
    code: 'C3',
    nameRo: 'Managementul deșeurilor',
    nameEn: 'Waste Management',
    color: '#a855f7',
    descriptionRo:
      'Infrastructură de gestionare a deșeurilor, centre de colectare voluntară, măsuri de reciclare și economie circulară.',
  },
  C4: {
    code: 'C4',
    nameRo: 'Transport sustenabil',
    nameEn: 'Sustainable Transport',
    color: '#ef4444',
    descriptionRo:
      'Căi ferate, metrou, siguranța rutieră, transport cu emisii reduse, stații de încărcare EV, infrastructură pentru ciclism.',
  },
  C5: {
    code: 'C5',
    nameRo: 'Valul Renovării',
    nameEn: 'Renovation Wave',
    color: '#f97316',
    descriptionRo:
      'Renovarea energetică a clădirilor publice și rezidențiale, reducerea riscului seismic, îmbunătățirea eficienței energetice.',
  },
  C6: {
    code: 'C6',
    nameRo: 'Energie',
    nameEn: 'Energy',
    color: '#eab308',
    descriptionRo:
      'Energie regenerabilă, tranziția de la cărbune, hidrogen, eficiență energetică, infrastructură electrică și reforme de piață.',
  },
  C7: {
    code: 'C7',
    nameRo: 'Transformarea digitală',
    nameEn: 'Digital Transformation',
    color: '#06b6d4',
    descriptionRo:
      'Cloud guvernamental, servicii publice digitale, securitate cibernetică, identitate digitală, interoperabilitate, competențe digitale.',
  },
  C8: {
    code: 'C8',
    nameRo: 'Reforma fiscală și reforma sistemului de pensii',
    nameEn: 'Fiscal and Pension Reform',
    color: '#6366f1',
    descriptionRo:
      'Reforma ANAF prin digitalizare, reforma cadrului fiscal, reforma pensiilor, pensiile speciale și sustenabilitatea fiscală pe termen lung.',
  },
  C9: {
    code: 'C9',
    nameRo: 'Suport pentru sectorul privat și CDI',
    nameEn: 'Private Sector and RDI',
    color: '#ec4899',
    descriptionRo:
      'Sprijin pentru afaceri, competitivitate, cercetare-dezvoltare-inovare, digitalizarea IMM-urilor, instrumente financiare.',
  },
  C10: {
    code: 'C10',
    nameRo: 'Fondul local',
    nameEn: 'Local Fund',
    color: '#14b8a6',
    descriptionRo:
      'Mobilitate locală, transport urban verde, documentații de urbanism, locuințe pentru specialiști, infrastructură publică locală.',
  },
  C11: {
    code: 'C11',
    nameRo: 'Turism și cultură',
    nameEn: 'Tourism and Culture',
    color: '#8b5cf6',
    descriptionRo:
      'Patrimoniu cultural, trasee turistice, rute cicloturistice, digitalizarea sectorului cultural, sprijin pentru producția cinematografică.',
  },
  C12: {
    code: 'C12',
    nameRo: 'Sănătate',
    nameEn: 'Health',
    color: '#f43f5e',
    descriptionRo:
      'Spitale, ambulatorii, medicina de familie, centre de sănătate comunitare, e-sănătate, echipamente medicale și reziliență.',
  },
  C13: {
    code: 'C13',
    nameRo: 'Reforme sociale',
    nameEn: 'Social Reforms',
    color: '#d946ef',
    descriptionRo:
      'Servicii sociale, îngrijire pe termen lung, servicii pentru persoane cu dizabilități, centre pentru vârstnici, măsuri de incluziune.',
  },
  C14: {
    code: 'C14',
    nameRo: 'Bună guvernanță',
    nameEn: 'Good Governance',
    color: '#64748b',
    descriptionRo:
      'Infrastructură de justiție, reforma salarizării în sectorul public, mecanisme de parteneriat cu ONG-uri, capacitate administrativă, monitorizare PNRR.',
  },
  C15: {
    code: 'C15',
    nameRo: 'Educație',
    nameEn: 'Education',
    color: '#0ea5e9',
    descriptionRo:
      'Grădinițe, educație timpurie, reducerea abandonului școlar, școli verzi, echipamente digitale, laboratoare VET, infrastructură universitară, formare profesori.',
  },
  C16: {
    code: 'C16',
    nameRo: 'REPowerEU',
    nameEn: 'REPowerEU',
    color: '#84cc16',
    descriptionRo:
      'Competențe pentru energia verde, energie regenerabilă, vouchere pentru eficiență energetică, sprijin pentru fotovoltaice și stocare, reziliență energetică.',
  },
} as const

export const PNRR_COMPONENT_CODES = Object.keys(PNRR_COMPONENTS)
