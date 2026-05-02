export type PnrrCriDefinition = {
  readonly nameRo: string
}

export const PNRR_CRIS: Record<string, PnrrCriDefinition> = {
  ANAP: { nameRo: 'Agenția Națională de Administrare a Proprietății' },
  ANC: { nameRo: 'Autoritatea Națională pentru Protecția Consumatorilor' },
  ANFP: { nameRo: 'Agenția Națională a Funcționarilor Publici' },
  MAI: { nameRo: 'Ministerul Afacerilor Interne' },
  MC: { nameRo: 'Ministerul Culturii' },
  MDLPA: { nameRo: 'Ministerul Dezvoltării, Lucrărilor Publice și Administrației' },
  MEC: { nameRo: 'Ministerul Educației' },
  MEDAT: { nameRo: 'Ministerul Economiei, Antreprenoriatului și Turismului' },
  MENERGIEI: { nameRo: 'Ministerul Energiei' },
  MF: { nameRo: 'Ministerul Finanțelor' },
  'MIPE-CN': { nameRo: 'MIPE — Componenta Națională' },
  'MIPE-PDD': { nameRo: 'MIPE — Programare și Dezvoltare Durabilă' },
  'MIPE-RID': { nameRo: 'MIPE — Reforme Instituționale și Digitale' },
  MJ: { nameRo: 'Ministerul Justiției' },
  MMAP: { nameRo: 'Ministerul Mediului, Apelor și Pădurilor' },
  MMFTSS: { nameRo: 'Ministerul Muncii și Solidarității Sociale' },
  MS: { nameRo: 'Ministerul Sănătății' },
  MTI: { nameRo: 'Ministerul Transporturilor și Infrastructurii' },
  SGG: { nameRo: 'Secretariatul General al Guvernului' },
} as const
