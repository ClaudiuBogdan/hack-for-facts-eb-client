import type { PrototypeDefinition } from '@/development/harness/entry'
import { EnterpriseBusiness, EnterpriseControl, EnterpriseReport } from './enterprise.page'

/**
 * `/public-enterprises/$cui` on the live API (`?cui=`, picked above the
 * page): the public-enterprise profile, the company page's own read, SEAP
 * counts and each controlling authority's budget record and other
 * enterprises. Three variants, one per question the head leads with.
 */
export const prototype = {
  title: 'Întreprinderi publice — pagina unei întreprinderi',
  spec: 'docs/design/public-companies/design.md',
  variants: {
    control: {
      title: 'Cine o controlează',
      component: EnterpriseControl,
      note: 'Head: each source’s authority. Bands: the same authority’s other enterprises, status by source, the business, AMEPIP, public money.',
    },
    afacerea: {
      title: 'Cum merge',
      component: EnterpriseBusiness,
      note: 'Head: the company page’s five-year chart. Bands: who controls it (with the other enterprises), status by source, AMEPIP, public money.',
    },
    fisa: {
      title: 'Fișa AMEPIP',
      component: EnterpriseReport,
      note: 'Head: a few answers from the newest AMEPIP form, as written. Bands: control, status by source, the business, AMEPIP in full, public money.',
    },
  },
  compare: ['control', 'afacerea', 'fisa'],
} satisfies PrototypeDefinition
