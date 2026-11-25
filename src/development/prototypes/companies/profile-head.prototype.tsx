import type { PrototypeDefinition } from '@/development/harness/entry'
import { HeadAzi, HeadFaraGrafic, HeadGraficMic, HeadScurt, HeadSimplu } from './profile-head.variants'

/**
 * The company page's head, lighter (owner, 25 November 2026). Each variant is
 * a head over the pinned bar and the four figures. `?cui=` picks a live
 * company (OMV Petrom by default); `?fixture=` a hard case (dante, anaf,
 * sparse, struck, insolvent, pfa, bankrupt). `azi` is the page as it is.
 */
export const prototype = {
  title: 'Firmă — capul paginii, mai ușor',
  spec: 'docs/design/companies/design.md',
  variants: {
    azi: { title: 'Azi', component: HeadAzi, note: 'The page as it is: way back, name, sentence of facts, chips, identifiers, five-year chart.' },
    simplu: { title: 'Simplu', component: HeadSimplu, note: 'Nothing dropped: the way back in plain text, the name set as the landing’s headline.' },
    'fara-grafic': {
      title: 'Fără grafic',
      component: HeadFaraGrafic,
      note: 'The five-year chart goes (the business band draws every year; the figures give the newest). Everything else stays.',
    },
    'grafic-mic': {
      title: 'Grafic, rest scurt',
      component: HeadGraficMic,
      note: 'The chart stays; beside it only the name, form · place, chips and the CUI. Year, registry number and activity go to their bands.',
    },
    scurt: {
      title: 'Scurt',
      component: HeadScurt,
      note: 'Who and in what state: name, form · place, chips, CUI. Chart, year, registry number and activity go to their bands.',
    },
  },
  compare: ['azi', 'fara-grafic', 'scurt'],
} satisfies PrototypeDefinition
