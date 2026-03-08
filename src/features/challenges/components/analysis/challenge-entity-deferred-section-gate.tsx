import {
  Suspense,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useInView } from 'react-intersection-observer'
import { cn } from '@/lib/utils'

type DeferredSectionGateProps = {
  readonly fallback: ReactNode
  readonly children: ReactNode
  readonly onPrefetch?: () => void
  readonly prefetchMargin?: string
  readonly renderMargin?: string
  readonly className?: string
}

const DEFAULT_PREFETCH_MARGIN = '0px 0px 1200px 0px'
const DEFAULT_RENDER_MARGIN = '0px 0px 500px 0px'

export function DeferredSectionGate({
  fallback,
  children,
  onPrefetch,
  prefetchMargin = DEFAULT_PREFETCH_MARGIN,
  renderMargin = DEFAULT_RENDER_MARGIN,
  className,
}: DeferredSectionGateProps) {
  const [shouldRender, setShouldRender] = useState(false)
  const didPrefetchRef = useRef(false)
  const { ref: prefetchRef, inView: isPrefetchInView } = useInView({
    triggerOnce: true,
    rootMargin: prefetchMargin,
  })
  const { ref: renderRef, inView: isRenderInView } = useInView({
    triggerOnce: true,
    rootMargin: renderMargin,
  })

  const setGateRef = useCallback(
    (node: Element | null) => {
      prefetchRef(node)
      renderRef(node)
    },
    [prefetchRef, renderRef],
  )

  useEffect(() => {
    if (!isPrefetchInView || !onPrefetch || didPrefetchRef.current) {
      return
    }

    didPrefetchRef.current = true
    onPrefetch()
  }, [isPrefetchInView, onPrefetch])

  useEffect(() => {
    if (!isRenderInView || shouldRender) {
      return
    }

    startTransition(() => {
      setShouldRender(true)
    })
  }, [isRenderInView, shouldRender])

  return (
    <div ref={setGateRef} className={cn(className)}>
      {shouldRender ? (
        <Suspense fallback={fallback}>{children}</Suspense>
      ) : (
        fallback
      )}
    </div>
  )
}
