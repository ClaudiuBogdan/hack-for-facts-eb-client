import type { PrototypeDefinition } from '@/development/harness/entry'
import { LocalitateComparatie } from './localitate/comparatie'
import { LocalitateCronologie } from './localitate/cronologie'
import { LocalitateMatrice } from './localitate/matrice'

/**
 * The locality page (proposed `/elections/places/$siruta`): one SIRUTA code,
 * read from `?loc=` (Cluj-Napoca by default), with every row the sources
 * report there. Three spines over the same head, figures, absent-elections
 * band, county neighbours and source line. Design note §12; rationale in
 * `localitate/RATIONALE.md`.
 *
 * Try: `?loc=54975` (Cluj-Napoca), `179141` (Sectorul 1), `55062`
 * (Cuzdrioara), `179132` and `60605` (codes not in today's INS list), `61069`
 * (Băneasa, Constanța: no 2020 rows), `999999` (no rows at all).
 */
export const prototype = {
  title: 'Alegeri — localitate',
  spec: 'docs/design/elections/design.md',
  variants: {
    matrice: {
      title: 'Matrice funcții × alegeri',
      component: LocalitateMatrice,
      note: 'Argues the reader asks "which offices, which years": one table, offices grouped by what they are to the place, a chip per edition and round.',
    },
    cronologie: {
      title: 'Cronologie, de la cea mai nouă',
      component: LocalitateCronologie,
      note: 'Argues a citizen reads by election: one block per election, its editions side by side, wider races marked as reporting locations.',
    },
    comparatie: {
      title: 'Aici față de restul datelor',
      component: LocalitateComparatie,
      note: 'Argues absence must be explained in place: every election in the catalog, with what is here beside where the source reports it.',
    },
  },
  compare: ['matrice', 'cronologie', 'comparatie'],
} satisfies PrototypeDefinition
