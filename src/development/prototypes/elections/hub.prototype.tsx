import type { PrototypeDefinition } from '@/development/harness/entry'
import { HubAcoperire } from './hub/acoperire'
import { HubCronologie } from './hub/cronologie'
import { HubLocalitate } from './hub/localitate'
import { HubRezultate } from './hub/rezultate'

/**
 * The elections front door (proposed `/elections`), in the hubs' language
 * (design note §12.5, G1), over the catalog the live API serves on
 * 2026-10-14 (`shared/catalog.fixture.json`). Four ideas the owner asked for
 * (§12.7), each a variant: a timeline, a coverage map, „your locality", and
 * a results-shaped page with sample bands marked as such. Decisions and data
 * rules: `docs/design/elections/design.md` §12; the reasoning: `hub/RATIONALE.md`.
 */
export const prototype = {
  title: 'Alegeri — prima pagină',
  spec: 'docs/design/elections/design.md',
  variants: {
    cronologie: {
      title: 'Cronologie — alegerile an de an, cu golurile',
      component: HubCronologie,
      note: 'Every election by year and type, the editions that describe each, and the gaps between our hand-kept calendar and the data (said as ours). Argues the reader first wants to know which elections exist and which are missing.',
    },
    acoperire: {
      title: 'Acoperire — ce raportează fiecare ediție',
      component: HubAcoperire,
      note: 'The catalog as a coverage map: per election and edition, the offices, the levels (locality, the source’s numbering, county, abroad, country) and the rounds; source-table labels shown verbatim as such. Argues the reader wants to know what can be asked of each election.',
    },
    localitate: {
      title: 'Localitate — pornește de la localitatea ta',
      component: HubLocalitate,
      note: 'Led by a place search over the SIRUTA scopes; a pick shows what the sources list for the place across the years (panel and band), then its page. Before a pick: the largest places reported and how many of today’s INS UATs each edition reports. Argues a citizen arrives with a place, not an election.',
    },
    rezultate: {
      title: 'Rezultate — forma paginii când vor veni voturile',
      component: HubRezultate,
      note: 'The live catalog and the API’s own readiness beside three sample bands (votes with a summary apart from a paged list, turnout with its quality status, list seats — never people), each marked „date de probă" with placeholder names. The only variant with sample data. Argues the door should already be shaped for results.',
    },
  },
  compare: ['cronologie', 'acoperire', 'localitate', 'rezultate'],
} satisfies PrototypeDefinition
