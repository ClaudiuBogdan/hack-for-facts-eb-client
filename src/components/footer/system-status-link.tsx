import type { ReactElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import { Trans, useLingui } from '@lingui/react/macro'
import { cn } from '@/lib/utils'

const STATUS_URL = 'https://status.transparenta.eu'

/**
 * The status page's own summary: one state for the whole platform. The feed is
 * public and answers any origin; the page is the Better Stack one the link
 * opens.
 */
type SystemState = 'operational' | 'degraded' | 'downtime' | 'maintenance'

const STATES: Record<SystemState, { readonly dot: string; readonly label: MessageDescriptor }> = {
  operational: { dot: 'bg-emerald-500', label: msg`funcțional` },
  degraded: { dot: 'bg-amber-500', label: msg`funcționare parțială` },
  downtime: { dot: 'bg-red-500', label: msg`indisponibil` },
  maintenance: { dot: 'bg-sky-500', label: msg`mentenanță` },
}

async function fetchSystemState(): Promise<SystemState | null> {
  const response = await fetch(`${STATUS_URL}/index.json`)
  if (!response.ok) return null
  const body: { data?: { attributes?: { aggregate_state?: string } } } = await response.json()
  const state = body.data?.attributes?.aggregate_state
  return state !== undefined && state in STATES ? (state as SystemState) : null
}

/**
 * The link to the status page, with a dot that says how the platform is doing.
 *
 * The dot is grey until the feed answers and stays grey if it does not: a
 * green dot the page had not checked would be a claim. The feed is read once
 * the footer comes into view, in the browser only, and again when the reader
 * comes back to the tab, at most every five minutes.
 *
 * Green needs no word. Any other state is written out beside the dot, so the
 * colour is never the only thing that says it.
 */
export function SystemStatusLink({ className }: { readonly className?: string }): ReactElement {
  const { i18n } = useLingui()
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: '200px 0px' })
  const { data } = useQuery({
    queryKey: ['system-status'],
    queryFn: fetchSystemState,
    enabled: inView,
    staleTime: 5 * 60_000,
    // The app turns this off by default; a dot read hours ago is not a status.
    refetchOnWindowFocus: true,
    retry: false,
  })
  const state = data ? STATES[data] : undefined

  return (
    <a ref={ref} href={STATUS_URL} target="_blank" rel="noreferrer noopener" className={className}>
      <Trans>Stare sistem</Trans>
      {state ? <span className={data === 'operational' ? 'sr-only' : undefined}>: {i18n._(state.label)}</span> : null}
      {/* After the words, so the column's left edge stays straight. */}
      <span
        aria-hidden="true"
        data-system-state={data ?? 'unknown'}
        className={cn('ml-2 inline-block size-2 rounded-full align-middle', state?.dot ?? 'bg-muted-foreground/40')}
      />
    </a>
  )
}
