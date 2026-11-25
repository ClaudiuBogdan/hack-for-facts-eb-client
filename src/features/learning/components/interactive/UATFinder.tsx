import { useRef, memo } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import {
  Search,
  X,
  Loader2,
  MapPin,
  Users,
  Wallet,
  BarChart3,
  ExternalLink,
  Building2,
  Home,
  Trees,
  ArrowRight,
  RefreshCcw,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useGuardedBlur } from '@/lib/hooks/useGuardedBlur'

import { useUATFinder } from './useUATFinder'
import {
  UAT_TYPE_CONFIG,
  formatPopulation,
  formatBudget,
  formatPerCapita,
  type UATFinderProps,
  type UATSearchResult,
  type UATDetailResult,
  type UATType,
} from './uat-finder-data'

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const ANIMATION = {
  duration: { fast: 0.2, normal: 0.4, slow: 0.6 },
  ease: [0.16, 1, 0.3, 1] as const,
}

const UAT_ICON_MAP: Record<UATType, LucideIcon> = {
  municipality: Building2,
  town: Building2,
  commune: Trees,
  county: MapPin,
  sector: Home,
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function UATFinder({ locale, text, onSelect, finderId }: UATFinderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-50px' })

  // Core finder logic with localStorage persistence
  const {
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching,
    isSearchError,
    isDropdownOpen,
    activeIndex,
    selectedUAT,
    selectUAT,
    clearSelection,
    isLoadingDetails,
    dataYear,
    recentUATs,
    handleKeyDown,
    clearSearch,
    openDropdown,
    closeDropdown,
    searchId,
  } = useUATFinder({
    onSelect,
    storageKey: finderId ?? 'default',
  })

  const { containerRef: blurContainerRef, onBlur } = useGuardedBlur<HTMLDivElement>(closeDropdown)
  const inputRef = useRef<HTMLInputElement>(null)

  const showDropdown = isDropdownOpen && searchTerm.trim().length >= 2
  // A failed read found nothing because it read nothing: it says so, alone. The
  // error takes precedence over rows a previous read left and over "no results".
  const showSearchError = showDropdown && !isSearching && isSearchError
  const showResults = showDropdown && !showSearchError && (isSearching || searchResults.length > 0)
  const showNoResults = showDropdown && !isSearching && !isSearchError && searchResults.length === 0
  const showRecent = !searchTerm && recentUATs.length > 0 && !selectedUAT

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: ANIMATION.duration.slow, ease: ANIMATION.ease }}
      className="w-full max-w-4xl mx-auto font-sans mb-16"
    >
      <Card className="relative border-none shadow-2xl bg-card rounded-[3rem]">
        {/* Decorative Background Elements - Clipped */}
        <div className="absolute inset-0 overflow-hidden rounded-[3rem] pointer-events-none">
          <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-[20rem] h-[20rem] bg-chart-2/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4" />
        </div>

        <div className="relative z-10 p-8 md:p-12 lg:p-16">

          {/* Header Section */}
          <div className="text-center space-y-6 mb-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-[1.5rem] bg-primary/10 text-primary mb-2 shadow-sm"
            >
              <Search className="w-8 h-8" />
            </motion.div>

            <div className="space-y-4">
              <h3 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground leading-[0.95]">
                {text.title}
              </h3>
              <p className="text-lg md:text-xl text-foreground font-medium max-w-xl mx-auto leading-relaxed">
                {text.subtitle}
              </p>
            </div>
          </div>

          {/* Search & Results Area */}
          <div className="max-w-2xl mx-auto relative">

            {/* Search Input */}
            <div
              ref={blurContainerRef}
              className="relative group z-20"
              onFocus={openDropdown}
              onBlur={onBlur}
            >
              <div className="relative transition-transform duration-300 focus-within:scale-[1.02]">
                <Search className="absolute left-8 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
                <Input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={text.searchPlaceholder}
                  role="combobox"
                  aria-label={text.searchPlaceholder}
                  aria-autocomplete="list"
                  aria-expanded={showDropdown}
                  aria-controls={`${searchId}-listbox`}
                  aria-activedescendant={activeIndex >= 0 ? `${searchId}-result-${activeIndex}` : undefined}
                  className="w-full h-20 pl-20 pr-16 text-xl md:text-2xl font-bold bg-card border-4 border-border focus:border-primary rounded-[2rem] shadow-sm transition-all focus:ring-0 placeholder:text-muted-foreground"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      clearSearch()
                      inputRef.current?.focus()
                    }}
                    className="absolute right-6 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
                    aria-label={text.clearLabel}
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Dropdown Results */}
              <AnimatePresence>
              {showResults && (
                <SearchDropdown
                  searchId={searchId}
                  results={searchResults}
                  activeIndex={activeIndex}
                  isLoading={isSearching}
                  locale={locale}
                  text={text}
                  onSelect={selectUAT}
                />
              )}
                {showNoResults && (
                  <NoResultsMessage message={text.noResultsMessage} searchTerm={searchTerm} />
                )}
                {showSearchError && <SearchErrorMessage message={text.errorMessage} />}
              </AnimatePresence>
            </div>

            {/* Recent Searches */}
            <AnimatePresence>
          {showRecent && (
            <RecentSearches
              uats={recentUATs}
              label={text.recentSearchesLabel}
              onSelect={selectUAT}
            />
          )}
            </AnimatePresence>

            {/* Selected UAT Detail Card */}
            <AnimatePresence mode="wait">
          {selectedUAT && (
            <UATDetailCard
              uat={selectedUAT}
              locale={locale}
              text={text}
              isLoading={isLoadingDetails}
              dataYear={dataYear}
              onClose={clearSelection}
            />
          )}
            </AnimatePresence>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Search Dropdown
// ═══════════════════════════════════════════════════════════════════════════

interface SearchDropdownProps {
  readonly searchId: string
  readonly results: readonly UATSearchResult[]
  readonly activeIndex: number
  readonly isLoading: boolean
  readonly locale: 'en' | 'ro'
  readonly text: UATFinderProps['text']
  readonly onSelect: (cui: string) => void
}

const SearchDropdown = memo(function SearchDropdown({
  searchId,
  results,
  activeIndex,
  isLoading,
  locale,
  text,
  onSelect,
}: SearchDropdownProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: ANIMATION.duration.fast, ease: ANIMATION.ease }}
      className="absolute z-30 mt-4 w-full bg-card border-2 border-border shadow-2xl rounded-[2rem] overflow-hidden"
    >
      {isLoading ? (
        <div className="p-8 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-3 text-primary" />
          <span className="font-medium">{text.loadingMessage}</span>
        </div>
      ) : (
        <ul
          id={`${searchId}-listbox`}
          role="listbox"
          className="max-h-[20rem] overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
        >
          {results.map((result, index) => {
            const config = UAT_TYPE_CONFIG[result.type]
            const typeLabel = locale === 'ro' ? config.labelRo : config.label
            return (
              <SearchResultItem
                key={result.cui}
                id={`${searchId}-result-${index}`}
                result={result}
                isActive={index === activeIndex}
                typeLabel={typeLabel}
                onClick={() => onSelect(result.cui)}
              />
            )
          })}
        </ul>
      )}
    </motion.div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════
// Search Result Item
// ═══════════════════════════════════════════════════════════════════════════

interface SearchResultItemProps {
  readonly id: string
  readonly result: UATSearchResult
  readonly isActive: boolean
  readonly typeLabel: string
  readonly onClick: () => void
}

const SearchResultItem = memo(function SearchResultItem({
  id,
  result,
  isActive,
  typeLabel,
  onClick,
}: SearchResultItemProps) {
  const config = UAT_TYPE_CONFIG[result.type]
  const Icon = UAT_ICON_MAP[result.type]

  return (
    <li
      id={id}
      role="option"
      aria-selected={isActive}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'px-6 py-4 cursor-pointer transition-all flex items-center gap-4 mx-2 rounded-2xl',
        isActive
          ? 'bg-primary/10 scale-[0.98]'
          : 'hover:bg-muted/50'
      )}
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors', config.bgColor)}>
        <Icon className={cn('w-5 h-5', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-lg text-foreground truncate">
          {result.name}
        </div>
        <div className="text-xs font-medium text-foreground flex items-center gap-2 uppercase tracking-wider">
          <span className={config.color}>{typeLabel}</span>
          {result.countyName && (
            <>
              <span className="text-foreground">•</span>
              <span>{result.countyName}</span>
            </>
          )}
        </div>
      </div>
      {isActive && <ArrowRight className="w-5 h-5 text-muted-foreground" />}
    </li>
  )
})

// ═══════════════════════════════════════════════════════════════════════════
// No Results Message
// ═══════════════════════════════════════════════════════════════════════════

interface NoResultsMessageProps {
  readonly message: string
  readonly searchTerm: string
}

function NoResultsMessage({ message, searchTerm }: NoResultsMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: ANIMATION.duration.fast }}
      className="absolute z-30 mt-4 w-full bg-card border-2 border-border shadow-xl rounded-[2rem] p-8 text-center"
    >
      <p className="text-muted-foreground font-medium">
        {message.replace('{searchTerm}', searchTerm)}
      </p>
    </motion.div>
  )
}

/**
 * The search read failed: the same panel as an empty answer, saying what
 * happened instead, in the lesson's own translated `errorMessage`.
 */
function SearchErrorMessage({ message }: { readonly message: string }) {
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: ANIMATION.duration.fast }}
      className="absolute z-30 mt-4 w-full bg-status-blocked-bg border-2 border-status-blocked-fg/30 shadow-xl rounded-[2rem] p-8 text-center"
    >
      <p className="text-status-blocked-fg font-medium">{message}</p>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Recent Searches
// ═══════════════════════════════════════════════════════════════════════════

interface RecentSearchesProps {
  readonly uats: readonly UATSearchResult[]
  readonly label: string
  readonly onSelect: (cui: string) => void
}

const RecentSearches = memo(function RecentSearches({
  uats,
  label,
  onSelect,
}: RecentSearchesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: ANIMATION.duration.normal }}
      className="mt-8 text-center"
    >
      <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">
        {label}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {uats.map((uat) => {
          const config = UAT_TYPE_CONFIG[uat.type]
          return (
            <button
              key={uat.cui}
              onClick={() => onSelect(uat.cui)}
              className={cn(
                'px-4 py-2 text-sm rounded-full transition-all border-2',
                config.bgColor,
                config.borderColor,
                'hover:scale-105 active:scale-95'
              )}
            >
              <span className={cn('font-bold', config.color)}>{uat.name}</span>
            </button>
          )
        })}
      </div>
    </motion.div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════
// UAT Detail Card
// ═══════════════════════════════════════════════════════════════════════════

interface UATDetailCardProps {
  readonly uat: UATDetailResult
  readonly locale: 'en' | 'ro'
  readonly text: UATFinderProps['text']
  readonly isLoading: boolean
  readonly dataYear: string
  readonly onClose: () => void
}

function UATDetailCard({ uat, locale, text, isLoading, dataYear, onClose }: UATDetailCardProps) {
  const config = UAT_TYPE_CONFIG[uat.type]
  const Icon = UAT_ICON_MAP[uat.type]
  const typeLabel = locale === 'ro' ? config.labelRo : config.label

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: ANIMATION.duration.normal, ease: ANIMATION.ease }}
      className="mt-8"
    >
      <div className={cn('relative p-8 md:p-10 rounded-[2.5rem] border-4 bg-card shadow-xl overflow-hidden', config.borderColor)}>

        {/* Background Tint */}
        <div className={cn('absolute inset-0 opacity-30 pointer-events-none', config.bgColor)} />

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-6 right-6 h-10 w-10 rounded-full hover:bg-muted z-20"
          aria-label={text.clearLabel}
        >
          <X className="w-5 h-5" />
        </Button>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className={cn('w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-sm bg-card', config.color)}>
              <Icon className="w-10 h-10" />
            </div>

            <h4 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-2">
              {uat.name}
            </h4>

            <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest">
              <span className={cn('px-3 py-1 rounded-full bg-card', config.color)}>
                {typeLabel}
              </span>
              {uat.countyName && (
                <span className="text-foreground">
                  {uat.countyName}
                </span>
              )}
            </div>
          </div>

          {/* Metrics */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              <p className="text-foreground font-medium animate-pulse">{text.loadingMessage}</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="text-center">
                <span className="inline-block px-4 py-1 rounded-full bg-muted text-[10px] font-black text-foreground uppercase tracking-[0.2em]">
                  {text.dataYearLabel} {dataYear}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  icon={Users}
                  label={text.populationLabel}
                  value={formatPopulation(uat.population, locale)}
                  colorClass="text-foreground"
                  bgClass="bg-chart-1/10"
                />
                <MetricCard
                  icon={Wallet}
                  label={text.totalBudgetLabel}
                  value={formatBudget(uat.totalBudget, locale)}
                  colorClass="text-foreground"
                  bgClass="bg-chart-2/10"
                />
                <MetricCard
                  icon={BarChart3}
                  label={text.perCapitaLabel}
                  value={formatPerCapita(uat.perCapita, locale)}
                  colorClass="text-foreground"
                  bgClass="bg-chart-3/10"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Link
                  to="/entities/$cui"
                  params={{ cui: uat.cui }}
                  className="flex-1"
                >
                  <Button className="w-full h-14 rounded-2xl text-lg font-bold bg-primary text-primary-foreground hover:scale-[1.02] transition-transform shadow-lg">
                    {text.viewDetailsLabel} <ExternalLink className="ml-2 w-5 h-5" />
                  </Button>
                </Link>

                <div className="flex gap-3 flex-1">
                  <Link
                    to="/public-institutions"
                    search={{ filter: { entity_cuis: [uat.cui] } }}
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full h-14 rounded-2xl font-bold border-2 hover:bg-muted">
                      {text.compareLabel}
                    </Button>
                  </Link>

                  <Link
                    to="/map"
                    search={{ entity_cuis: [uat.cui] }}
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full h-14 rounded-2xl font-bold border-2 hover:bg-muted">
                      {text.viewOnMapLabel}
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={onClose}
                  className="text-xs font-bold text-foreground hover:underline uppercase tracking-widest flex items-center justify-center gap-2 mx-auto transition-colors"
                >
                  <RefreshCcw className="w-3 h-3" /> {text.clearLabel}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Metric Card
// ═══════════════════════════════════════════════════════════════════════════

interface MetricCardProps {
  readonly icon: LucideIcon
  readonly label: string
  readonly value: string
  readonly colorClass: string
  readonly bgClass: string
}

const MetricCard = memo(function MetricCard({ icon: Icon, label, value, colorClass, bgClass }: MetricCardProps) {
  return (
    <div className={cn("rounded-[2rem] p-6 text-center transition-transform hover:scale-[1.02]", bgClass)}>
      <Icon className={cn("w-6 h-6 mx-auto mb-3 opacity-80", colorClass)} />
      <div className="text-xs font-black uppercase tracking-widest text-foreground mb-1">{label}</div>
      <div className={cn("text-xl md:text-2xl font-black tracking-tight", colorClass)}>{value}</div>
    </div>
  )
})
