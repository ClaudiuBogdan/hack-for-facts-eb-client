import type { ComponentType } from 'react'
import type { PrototypeDefinition } from '@/development/harness/entry'
import { cn } from '@/lib/utils'
import { CompanyPageAnswers } from './company-page.answers'
import { CompanyPageBands } from './company-page.bands'
import { displayCompanyName } from './company-page.data'
import { COMPANY_FIXTURE_KEYS, COMPANY_FIXTURES } from './company-page.fixtures'
import { CompanyPageSheet } from './company-page.sheet'
import { useCompanyPageState } from './company-page.state'

/**
 * Company page rewrite — `/companies/$cui` in the `/companies` and `/ins`
 * hubs' language, three ways of arranging the same answers.
 *
 * Every figure and sentence is computed from the record, so each layout must
 * hold for any company. Five real ones are frozen in
 * `company-page.fixtures.ts` to prove it, switched with `?firma=`: a national
 * champion with a gap in its statements, a road builder in insolvency with
 * more public money than turnover, a retailer struck off the register, a
 * two-person firm with a decade of losses and no public money, and a company
 * that never filed a statement. The company's place in the economy comes from
 * the `/companies` snapshot.
 *
 * Deep links: `?v=benzi&firma=abc-con&masura=profit`,
 * `?v=fisa&firma=profi&plati=achizitii-directe`,
 * `?v=intrebari&firma=jack&sectiune=finante`.
 */

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

/** Prototype chrome, not part of any design: which fixture company the layout draws. */
function CompanySwitcher() {
  const { state, setCompany } = useCompanyPageState()
  return (
    <nav aria-label="Firma din prototip" className="flex flex-wrap items-center gap-1.5 border-b border-dashed bg-muted/30 px-4 py-2 text-xs">
      <span className="mr-1 font-mono uppercase tracking-wider text-muted-foreground">firma</span>
      {COMPANY_FIXTURE_KEYS.map((key) => {
        const { profile } = COMPANY_FIXTURES[key]
        const selected = state.company === key
        return (
          <button
            key={key}
            type="button"
            aria-pressed={selected}
            onClick={() => setCompany(key)}
            className={cn('rounded-sm border px-2 py-1 transition-colors', selected ? 'border-foreground bg-foreground text-background' : 'bg-background hover:bg-muted')}
          >
            {displayCompanyName(profile.legalName)}
            <span className={cn('ml-1.5', selected ? 'text-background/70' : 'text-muted-foreground')}>{profile.status?.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

/** Each company mounts its layout afresh: the count-ups and every expanded list start over, as on a new page. */
function withSwitcher(Layout: ComponentType) {
  return function Variant() {
    const { state } = useCompanyPageState()
    return (
      <div data-dev-marker={PROTOTYPE_MARKER}>
        <CompanySwitcher />
        <Layout key={state.company} />
      </div>
    )
  }
}

export const prototype = {
  title: 'Company page rewrite',
  spec: 'docs/design/companies/design.md',
  variants: {
    benzi: {
      title: 'Editorial bands',
      component: withSwitcher(CompanyPageBands),
      note: 'The /companies rhythm for one company: a compact head (name, status, identifiers, its share of its sector, county and country when that is meaningful), the figures it has, then a numbered band per question, with a pinned bar of section links.',
    },
    fisa: {
      title: 'Company sheet',
      component: withSwitcher(CompanyPageSheet),
      note: 'A sticky identity rail (status, identifiers, section index following the scroll, sources) beside the sections in full: the figures with their history, every year as a table, balance sheet, public money, activities, registry.',
    },
    intrebari: {
      title: 'Questions first',
      component: withSwitcher(CompanyPageAnswers),
      note: 'The questions a reader brings, each answered in one computed sentence with its evidence (a question the record cannot answer is left out), above four tabs that hold the detail (?sectiune=).',
    },
  },
  compare: ['benzi', 'fisa', 'intrebari'],
} satisfies PrototypeDefinition
