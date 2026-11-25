/**
 * Romanian labels of the legislation analytics values (the layer's own keys). A key without a label is shown as
 * it is: the value lists come from the layer, so a new kind appears before its label does.
 */

export const GROUP_LABEL: Readonly<Record<string, string>> = {
  'rule-making': 'stabilesc reguli',
  individual: 'acte individuale',
  'budget-property-organisation': 'buget, bunuri și organizare',
  procedure: 'procedură',
  court: 'decizii ale instanțelor',
  'reports-notices': 'rapoarte și comunicări',
  uncertain: 'încadrare nesigură',
  unplaced: 'neîncadrate',
}

/** The groups' firm placements, then the weak placements as their own class, then the unplaced. */
export const GROUP_ORDER = [
  'rule-making',
  'individual',
  'budget-property-organisation',
  'procedure',
  'court',
  'reports-notices',
  'uncertain',
  'unplaced',
] as const

export const KIND_LABEL: Readonly<Record<string, string>> = {
  amendment: 'modificări',
  appointments: 'numiri și eliberări din funcție',
  unplaced: 'neîncadrate',
  uncertain: 'încadrare nesigură',
  plans_and_programmes: 'strategii, planuri și programe',
  administrative_territorial_and_electoral: 'organizare administrativ-teritorială și electorală',
  court: 'decizii ale instanțelor',
  application_rules: 'norme de aplicare',
  budget: 'buget și alocări',
  promulgation: 'promulgări',
  reports_notices: 'rapoarte și comunicări',
  new_rules: 'reguli noi',
  authorisation: 'autorizări și licențe',
  property: 'bunuri',
  organisation: 'organizarea instituțiilor',
  ordinance_approval: 'aprobarea sau respingerea ordonanțelor',
  ratification: 'ratificări și aprobări de tratate',
  decorations: 'decorații',
  correction: 'rectificări',
  chamber_procedure: 'procedura camerelor',
  periodic_parameters: 'parametri periodici',
  international_agreement: 'acorduri internaționale',
  repeal: 'abrogări',
  sanctions: 'sancțiuni',
  citizenship: 'cetățenie',
  pardons: 'grațieri',
}

export const TYPE_LABEL: Readonly<Record<string, string>> = {
  hotarare: 'hotărâri',
  ordin: 'ordine',
  decizie: 'decizii',
  decret: 'decrete',
  unknown: 'tip nerecunoscut',
  lege: 'legi',
  'ordonanta-urgenta': 'ordonanțe de urgență',
  rectificare: 'rectificări',
  ordonanta: 'ordonanțe',
  circulara: 'circulare',
  norma: 'norme',
  regulament: 'regulamente',
  instructiuni: 'instrucțiuni',
  'decret-lege': 'decrete-lege',
  protocol: 'protocoale',
  sentinta: 'sentințe',
  metodologie: 'metodologii',
  procedura: 'proceduri',
  cod: 'coduri',
}

/** Version bands: how many distinct dates the Portal listed a consolidated version on. */
export const VERSIONS_LABEL = [
  'fără versiuni listate',
  '1–2 versiuni listate',
  '3–9 versiuni listate',
  '10 sau mai multe',
] as const

export const FAMILY_LABEL: Readonly<Record<string, string>> = {
  parlament: 'Parlament',
  guvern: 'Guvern',
  presedinte: 'Președinte',
  ministere: 'ministere',
  autoritati_autonome: 'autorități autonome și de reglementare',
  agentii_centrale: 'agenții și instituții centrale',
  instante: 'instanțe',
  administratie_locala: 'administrație locală',
  altele: 'alți emitenți',
  fara_emitent: 'fără emitent',
}

/** The amendment matrix's type bands (the layer merges laws and ordinances in one band). */
export const TYPE_BAND_LABEL: Readonly<Record<string, string>> = {
  legi_ordonante: 'legi și ordonanțe',
  hotarari: 'hotărâri',
  ordine: 'ordine',
  decizii: 'decizii',
  decrete: 'decrete',
  altele: 'altele',
}

export const LINK_KIND_LABEL: Readonly<Record<string, string>> = {
  amends: 'modifică',
  approves_ordinance: 'aprobă o ordonanță',
  rejects_ordinance: 'respinge o ordonanță',
  promulgates: 'promulgă o lege',
  court_names: 'decizie care numește un act',
}

export const LINK_NOTE_LABEL: Readonly<Record<string, string>> = {
  resolved: 'act găsit',
  code: 'un cod',
  outside_corpus: 'țintă în afara corpusului',
  ambiguous: 'țintă ambiguă',
  no_target_in_title: 'fără țintă în titlu',
}

export const labelOf = (labels: Readonly<Record<string, string>>, key: string | null, none: string): string =>
  key === null ? none : (labels[key] ?? key)
