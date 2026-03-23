import { useState, type ReactNode } from 'react'
import { useInView } from 'react-intersection-observer'
import { cn } from '@/lib/utils'

type SectionWrapperProps = {
  readonly children: ReactNode | ((inView: boolean) => ReactNode)
  readonly id: string
  readonly className?: string
}

export function SectionWrapper({ children, id, className }: SectionWrapperProps) {
  const [hasObserverReported, setHasObserverReported] = useState(false)
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.05,
    rootMargin: '-40px 0px',
    onChange: () => {
      setHasObserverReported(true)
    },
  })
  const shouldShowSection = !hasObserverReported || inView

  return (
    <section
      ref={ref}
      id={id}
      className={cn(
        'w-full scroll-mt-20',
        shouldShowSection ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        className,
      )}
      style={{
        transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {typeof children === 'function' ? children(inView) : children}
    </section>
  )
}
