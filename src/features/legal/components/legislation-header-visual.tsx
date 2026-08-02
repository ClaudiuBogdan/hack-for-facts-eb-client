import { useEffect, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'
import justiceHeader1280 from '../assets/header-justice-1280.png'
import justiceHeader768 from '../assets/header-justice-768.png'
import {
  createLegislationHeaderGlitchRenderer,
  type LegislationHeaderGlitchRenderer,
} from '../lib/legislation-header-glitch'

export function LegislationHeaderVisual() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const playRef = useRef<(() => void) | null>(null)
  const queuedManualPlayRef = useRef(false)
  const [isImageCoverVisible, setIsImageCoverVisible] = useState(true)
  const [isEffectUnavailable, setIsEffectUnavailable] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image) return

    let renderer: LegislationHeaderGlitchRenderer | null = null
    let resizeObserver: ResizeObserver | null = null
    let revealImageFrame = 0
    let revealCanvasFrame = 0
    let disposed = false

    const play = () => {
      queuedManualPlayRef.current = false
      renderer?.play()
    }

    const playManually = () => {
      play()
    }

    const initialize = () => {
      if (disposed || renderer || image.naturalWidth === 0) return

      try {
        renderer = createLegislationHeaderGlitchRenderer({ canvas, image })
      } catch {
        setIsEffectUnavailable(true)
        setIsImageCoverVisible(true)
        return
      }

      playRef.current = playManually
      resizeObserver = new ResizeObserver(() => {
        renderer?.resize()
      })
      resizeObserver.observe(canvas)

      // Keep the source image above WebGL until the clean canvas has been
      // presented across two browser paint opportunities.
      revealImageFrame = requestAnimationFrame(() => {
        revealCanvasFrame = requestAnimationFrame(() => {
          if (!disposed) setIsImageCoverVisible(false)
        })
      })

      if (queuedManualPlayRef.current) playManually()
    }

    const handleImageError = () => {
      queuedManualPlayRef.current = false
      setIsEffectUnavailable(true)
      setIsImageCoverVisible(true)
    }

    const handleContextLost = () => {
      setIsEffectUnavailable(true)
      setIsImageCoverVisible(true)
    }

    image.addEventListener('load', initialize)
    image.addEventListener('error', handleImageError)
    canvas.addEventListener('webglcontextlost', handleContextLost)
    if (image.complete) {
      if (image.naturalWidth > 0) initialize()
      else handleImageError()
    }

    return () => {
      disposed = true
      cancelAnimationFrame(revealImageFrame)
      cancelAnimationFrame(revealCanvasFrame)
      image.removeEventListener('load', initialize)
      image.removeEventListener('error', handleImageError)
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      resizeObserver?.disconnect()
      renderer?.dispose()
      playRef.current = null
      queuedManualPlayRef.current = false
    }
  }, [])

  const replay = () => {
    if (playRef.current) playRef.current()
    else queuedManualPlayRef.current = true
  }

  return (
    <button
      type="button"
      onClick={replay}
      disabled={isEffectUnavailable}
      aria-label={t`Redă din nou efectul digital al imaginii`}
      className="relative aspect-[1280/976] h-full max-w-full cursor-pointer touch-manipulation border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-default"
    >
      <img
        ref={imageRef}
        src={justiceHeader768}
        srcSet={`${justiceHeader768} 768w, ${justiceHeader1280} 1280w`}
        sizes="(min-width: 1280px) 70vw, 0px"
        width={1280}
        height={976}
        alt=""
        aria-hidden="true"
        loading="eager"
        decoding="async"
        fetchPriority="high"
        draggable={false}
        className={cn(
          'pointer-events-none absolute inset-0 z-10 h-full w-full object-contain object-right-bottom transition-opacity duration-200 ease-out',
          isImageCoverVisible ? 'opacity-100' : 'opacity-0',
        )}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full bg-transparent"
      />
    </button>
  )
}
