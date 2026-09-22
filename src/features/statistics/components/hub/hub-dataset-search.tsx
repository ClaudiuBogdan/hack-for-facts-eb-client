import { ChartNoAxesCombined } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { LandingSearch } from '@/features/landing/components/search/landing-search'
import { useIsMobile } from '@/hooks/use-mobile'

/**
 * The hub's search: the landing's field, narrowed to INS datasets on the
 * server — the companies hub's pattern with `ins_dataset` for `company`.
 *
 * One field, one behaviour across the site: the same ranking (the universal
 * index finds „salariu mediu" and „castig salarial", where the catalog's
 * substring filter found nothing and one dataset), the same keyboard model,
 * `mod+K`, two-stage Escape, and rows that are real links. The index holds
 * only datasets with observations, as the old matrix search did.
 */
export function HubDatasetSearch({ autoFocus, className }: { readonly autoFocus?: boolean; readonly className?: string }) {
  const isMobile = useIsMobile()
  return (
    <LandingSearch
      className={className}
      docTypes={['ins_dataset']}
      fixedScope={{ label: t`Statistici INS`, Icon: ChartNoAxesCombined }}
      placeholder={t`Salariu, inflație, populație sau cod INS...`}
      autoFocus={autoFocus}
      scrollToTopOnFocus={isMobile}
    />
  )
}
