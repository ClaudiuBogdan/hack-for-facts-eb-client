import type { PrototypeDefinition } from '@/development/harness/entry'
import { ResultsHome } from './principal/page'

/**
 * The elections front door, results first (owner, 2026-10-15: "more intuitive
 * and visual … the latest results … the Romanian map for local elections at
 * UAT and county level, the parliamentary elections at county and UAT
 * level … parties, turnout"). Its figures are a read-only extract of the
 * production DB's elections schema (the API serves no results yet): the
 * fixtures hold parties, counts and SIRUTA / county codes only.
 */
export const prototype = {
  title: 'Alegeri — prima pagină cu rezultate',
  spec: 'docs/design/elections/design.md',
  variants: {
    harta: {
      title: 'Harta întâi',
      component: ResultsHome,
      note: 'Latest elections beside the headline; the map (locale 2024 / parlamentare 2020 / prezidențiale 2019 × localități / județe × partid / prezență); mandates; votes; turnout; what is missing.',
    },
  },
  compare: ['harta'],
} satisfies PrototypeDefinition
