import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCompanyNameSuggestions } from '../../hooks/use-company-name-suggestions'
import { useCompanyRegistryScope } from '../../hooks/use-company-registry-scope'
import { useUatIndex } from '../../hooks/use-uat-index'
import { directoryReadsSource } from '../../lib/company-analytics-source'
import { withScope } from '../../lib/company-analytics-url'
import type { CompanyAnalyticsPageData } from '../../hooks/use-company-analytics-page'
import { suggestionsOf, type SuggestionGroup } from '../../lib/company-analytics-suggest'
import { CompanyRegistryScopeNotice } from '../registry/company-registry-notices'
import { CompanyRegistryScopeProvider } from '../registry/company-registry-scope-provider'

/**
 * „+ Adaugă un filtru", as the NGO registry's: one box over what a reader
 * names — a county, a locality, a legal form, a state, a size, a fiscal
 * flag, the filing, a company by name or CUI — each answer the selection
 * with that filter added. The full panel stays one click away („Filtre").
 * The localities' files (3 MB) and the name search are read only once
 * something is typed.
 *
 * The names come from the companies directory, so the box reads them under a
 * registry pin of its own, taken while it is open, and only while the
 * directory reads the analysis release's ONRC edition — the panel's company
 * picker's rule (`CompanyField`); otherwise it says so and a CUI still adds
 * a company.
 */

const GROUPS: readonly SuggestionGroup[] = ['cui', 'county', 'uat', 'form', 'status', 'size', 'fiscal', 'filing', 'company']

function groupTitle(group: SuggestionGroup): string {
  switch (group) {
    case 'cui':
    case 'company':
      return t`Firme`
    case 'county':
      return t`Județe`
    case 'uat':
      return t`Localități`
    case 'form':
      return t`Forme juridice`
    case 'status':
      return t`Stări`
    case 'size':
      return t`Mărime`
    case 'fiscal':
      return t`Fiscal`
    case 'filing':
      return t`Bilanț`
  }
}

/** What the box reads of the page: the selection, the release (its limits and ONRC edition), the year, the move. */
type SearchPage = Pick<CompanyAnalyticsPageData, 'state' | 'live' | 'question' | 'move'>

export function AddFilter({ page, trigger, triggerClassName }: { readonly page: SearchPage; readonly trigger: ReactNode; readonly triggerClassName: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={triggerClassName}>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,26rem)] p-0">
        <CompanyRegistryScopeProvider>
          <FilterSearch page={page} onPicked={() => setOpen(false)} />
        </CompanyRegistryScopeProvider>
      </PopoverContent>
    </Popover>
  )
}

/** The box's search, mounted while it is open: what is typed, the answers, the names' edition. */
function FilterSearch({ page, onPicked }: { readonly page: SearchPage; readonly onPicked: () => void }) {
  const { state, live, question, move } = page
  const [term, setTerm] = useState('')
  const asked = term.trim().length >= 2
  const places = useUatIndex(asked)
  const registry = useCompanyRegistryScope()
  const directory = registry.status === 'ready' && registry.moved === null ? registry.pinned.registry : null
  const source = live?.release.source ?? null
  const sameEdition = directoryReadsSource(directory, source)
  const names = useCompanyNameSuggestions(sameEdition ? term : '')
  const found = suggestionsOf({
    term,
    scope: state.scope,
    year: question?.year ?? null,
    places: places.localities ? places.index : null,
    // Only hits for what is typed now: another term's, picked by Enter, would add a company not asked for.
    companies: names.current ? (names.data ?? []).flatMap((hit) => (hit.cui ? [{ cui: hit.cui, label: hit.label }] : [])) : [],
    limits: live?.limits ?? null,
  })
  const groups = GROUPS.map((group) => ({ group, items: found.filter((item) => item.group === group) })).filter((entry) => entry.items.length > 0)
  const searching = asked && (places.loading || registry.status === 'pending' || names.isFetching || !names.current)
  // A name typed while the names cannot be read: why none is offered.
  const named = asked && /\p{L}/u.test(term)
  const notice = !named ? null : registry.status === 'error' || (registry.status === 'ready' && registry.moved) ? (
    <CompanyRegistryScopeNotice scope={registry} className="mx-3 my-2" />
  ) : registry.status === 'ready' && !sameEdition ? (
    <p role="status" className="px-3 py-2 text-xs text-muted-foreground">
      {t`Numele nu sunt oferite: directorul de firme citește altă ediție ONRC (${directory?.editionId ?? '—'}) decât analiza (${source?.editionId ?? '—'}). Poți adăuga o firmă după CUI.`}
    </p>
  ) : null
  const pick = (scope: (typeof found)[number]['scope']) => {
    onPicked()
    move(withScope(state, scope))
  }
  return (
    // Room above the field, so it does not sit on the panel's edge.
    <Command shouldFilter={false} label={t`Adaugă un filtru`} className="pt-1.5">
      <CommandInput value={term} onValueChange={setTerm} placeholder={t`Județ, localitate, formă, stare, firmă…`} className="text-base sm:text-sm" />
      <CommandList label={t`Filtre găsite`} className="max-h-[60vh]">
        {!asked ? (
          <p className="px-3 py-3 text-sm text-muted-foreground">{t`Scrie un județ („Cluj”), o localitate, o formă („SRL”), o stare („radiate”), o mărime („10–49”) sau numele ori CUI-ul unei firme.`}</p>
        ) : groups.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">{searching ? t`Se caută…` : t`Nimic găsit.`}</p>
        ) : null}
        {groups.map(({ group, items }) => (
          <CommandGroup key={group} heading={groupTitle(group)}>
            {items.map((item) => (
              <CommandItem key={item.key} value={item.key} onSelect={() => pick(item.scope)}>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint ? <span className="shrink-0 text-xs text-muted-foreground">{item.hint}</span> : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        {groups.length > 0 && searching ? <p className="px-3 py-2 text-xs text-muted-foreground">{t`Se caută…`}</p> : null}
        {notice}
      </CommandList>
    </Command>
  )
}
