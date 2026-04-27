import { useEffect, useRef, useState } from 'react'

export type ScrollDirection = 'up' | 'down'

export type UseScrollDirectionOptions = {
  readonly threshold?: number
  readonly initialDirection?: ScrollDirection
}

export type UseScrollDirectionResult = {
  readonly direction: ScrollDirection
  readonly isPastThreshold: boolean
  readonly y: number
}

/**
 * Observe window scroll to determine direction and whether a threshold is passed.
 * Throttled via requestAnimationFrame to minimize re-renders.
 */
export function useScrollDirection(options: UseScrollDirectionOptions = {}): UseScrollDirectionResult {
  const { threshold = 0, initialDirection = 'up' } = options

  const [direction, setDirection] = useState<ScrollDirection>(initialDirection)
  const [isPastThreshold, setIsPastThreshold] = useState<boolean>(false)
  const [y, setY] = useState<number>(0)

  const lastYRef = useRef<number>(0)
  const tickingRef = useRef<boolean>(false)
  const directionRef = useRef<ScrollDirection>(initialDirection)
  const isPastThresholdRef = useRef<boolean>(false)
  const yRef = useRef<number>(0)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    // Initialize positions on mount
    lastYRef.current = window.pageYOffset || document.documentElement.scrollTop || 0
    yRef.current = lastYRef.current
    isPastThresholdRef.current = lastYRef.current > threshold
    directionRef.current = initialDirection
    setY(yRef.current)
    setIsPastThreshold(isPastThresholdRef.current)

    const onScroll = () => {
      if (tickingRef.current) return
      tickingRef.current = true

      window.requestAnimationFrame(() => {
        const currentY = window.pageYOffset || document.documentElement.scrollTop || 0

        const delta = currentY - lastYRef.current
        let nextDirection: ScrollDirection = directionRef.current
        if (Math.abs(delta) > 0) {
          nextDirection = delta > 0 ? 'down' : 'up'
        }

        const nextIsPastThreshold = currentY > threshold

        // Update only when values actually change to reduce renders
        if (nextDirection !== directionRef.current) {
          directionRef.current = nextDirection
          setDirection(nextDirection)
        }
        if (nextIsPastThreshold !== isPastThresholdRef.current) {
          isPastThresholdRef.current = nextIsPastThreshold
          setIsPastThreshold(nextIsPastThreshold)
        }
        if (currentY !== yRef.current) {
          yRef.current = currentY
          setY(currentY)
        }

        lastYRef.current = currentY
        tickingRef.current = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
    // Intentionally omit deps that change on every scroll; we only care about threshold
  }, [threshold, initialDirection])

  return { direction, isPastThreshold, y }
}

