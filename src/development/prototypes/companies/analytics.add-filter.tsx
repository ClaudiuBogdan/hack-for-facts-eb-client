import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCompanyNameSuggestions } from '@/features/private-companies/hooks/use-company-name-suggestions'
import { useUatIndex } from '@/features/private-companies/hooks/use-uat-index'
import { withScope } from '@/features/private-companies/lib/company-analytics-url'
import type { AnalyticsPageData } from './analytics.data'
import { suggestionsOf, type SuggestionGroup } from './analytics.suggest'

/**
 * „+ Adaugă un filtru", as the NGO registry's: one box over what a reader
 * names — a county, a locality, a legal form, a state, a size, a fiscal
 * flag, the filing, a company by name or CUI — each answer the selection
 * with that filter added. The full panel stays one click away („Filtre").
 * The localities' files (3 MB) and the name search are read only once
 * something is typed.
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

export function AddFilter({ page, trigger, triggerClassName }: { readonly page: AnalyticsPageData; readonly trigger: ReactNode; readonly triggerClassName: string }) {
  const { state, live, question, move } = page
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const asked = term.trim().length >= 2
  const places = useUatIndex(open && asked)
  const names = useCompanyNameSuggestions(open ? term : '')
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
  const searching = asked && (places.loading || names.isFetching || !names.current)
  const pick = (scope: (typeof found)[number]['scope']) => {
    setOpen(false)
    setTerm('')
    move(withScope(state, scope))
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={triggerClassName}>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,26rem)] p-0">
        {/* Room above the field, so it does not sit on the panel's edge. */}
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
