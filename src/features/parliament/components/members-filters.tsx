import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ParliamentMembersSearch } from '@/schemas/parliament'

type Props = {
  readonly search: ParliamentMembersSearch
  readonly onSearchChange: (search: ParliamentMembersSearch) => void
}

/** Inline filters for the members directory */
export function MembersFilters({ search, onSearchChange }: Props) {
  const [query, setQuery] = useState(search.q ?? '')
  const latestSearchRef = useRef(search)
  const latestOnSearchChangeRef = useRef(onSearchChange)

  useEffect(() => {
    setQuery(search.q ?? '')
  }, [search.q])

  useEffect(() => {
    latestSearchRef.current = search
    latestOnSearchChangeRef.current = onSearchChange
  }, [search, onSearchChange])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      latestOnSearchChangeRef.current({
        ...latestSearchRef.current,
        q: query || undefined,
      })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query])

  return (
    <div className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="member-search"
          placeholder="Caută după nume"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-none border-2 pl-9"
        />
      </div>
      <Select
        value={search.chamber ?? 'all'}
        onValueChange={(v) =>
          onSearchChange({
            ...search,
            chamber: v === 'all' ? undefined : (v as 'camera' | 'senat'),
          })
        }
      >
        <SelectTrigger
          id="chamber-filter"
          className="w-full rounded-none border-2 sm:w-48"
          aria-label="Cameră"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toate camerele</SelectItem>
          <SelectItem value="camera">Camera Deputaților</SelectItem>
          <SelectItem value="senat">Senat</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
