import { useEffect, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'
import justiceHeaderFuture1280 from '../assets/header-justice-future-registered-1280.png'
import justiceHeaderFuture768 from '../assets/header-justice-future-registered-768.png'
import justiceHeader1280 from '../assets/header-justice-1280.png'
import justiceHeader768 from '../assets/header-justice-768.png'
import {
  createLegislationHeaderGlitchRenderer,
  type LegislationHeaderGlitchRenderer,
} from '../lib/legislation-header-glitch'

export function LegislationHeaderVisual() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const futureImageRef = useRef<HTMLImageElement>(null)
  const playRef = useRef<(() => void) | null>(null)
  const queuedManualPlayRef = useRef(false)
  const [isCanvasMounted, setIsCanvasMounted] = useState(false)
  const [isImageCoverVisible, setIsImageCoverVisible] = useState(true)
  const [isEffectUnavailable, setIsEffectUnavailable] = useState(false)

  useEffect(() => {
    if (!isCanvasMounted) return

    const canvas = canvasRef.current
    const image = imageRef.current
    const futureImage = futureImageRef.current
    if (!canvas || !image || !futureImage) return

    let renderer: LegislationHeaderGlitchRenderer | null = null
    let resizeObserver: ResizeObserver | null = null
    let revealImageFrame = 0
    let revealCanvasFrame = 0
    let disposed = false

    const play = () => {
      renderer?.play()
    }

    const failGracefully = () => {
      queuedManualPlayRef.current = false
      playRef.current = null
      setIsEffectUnavailable(true)
      setIsImageCoverVisible(true)
      setIsCanvasMounted(false)
    }

    const initialize = () => {
      if (
        disposed ||
        renderer ||
        image.naturalWidth === 0 ||
        futureImage.naturalWidth === 0
      ) {
        return
      }

      try {
        renderer = createLegislationHeaderGlitchRenderer({
          canvas,
          sourceImage: image,
          targetImage: futureImage,
        })
      } catch {
        failGracefully()
        return
      }

      playRef.current = play
      resizeObserver = new ResizeObserver(() => {
        renderer?.resize()
      })
      resizeObserver.observe(canvas)

      // Keep the source image above WebGL until the clean canvas has been
      // presented across two browser paint opportunities.
      revealImageFrame = requestAnimationFrame(() => {
        revealCanvasFrame = requestAnimationFrame(() => {
          if (disposed) return
          setIsImageCoverVisible(false)
          if (!queuedManualPlayRef.current) return
          queuedManualPlayRef.current = false
          play()
        })
      })
    }

    image.addEventListener('load', initialize)
    image.addEventListener('error', failGracefully)
    futureImage.addEventListener('load', initialize)
    futureImage.addEventListener('error', failGracefully)
    canvas.addEventListener('webglcontextlost', failGracefully)
    if (image.complete && futureImage.complete) {
      if (image.naturalWidth > 0 && futureImage.naturalWidth > 0) initialize()
      else failGracefully()
    }

    return () => {
      disposed = true
      cancelAnimationFrame(revealImageFrame)
      cancelAnimationFrame(revealCanvasFrame)
      image.removeEventListener('load', initialize)
      image.removeEventListener('error', failGracefully)
      futureImage.removeEventListener('load', initialize)
      futureImage.removeEventListener('error', failGracefully)
      canvas.removeEventListener('webglcontextlost', failGracefully)
      resizeObserver?.disconnect()
      renderer?.dispose()
      playRef.current = null
      queuedManualPlayRef.current = false
    }
  }, [isCanvasMounted])

  // Building the renderer costs a React commit plus WebGL setup, which is why
  // the canvas stays unmounted until someone shows interest — page load should
  // not pay for an effect most visitors never trigger. Warming it on pointer
  // intent keeps that saving while handing the click a renderer that is already
  // live, instead of one it has to wait ~250ms to build.
  const warmUp = () => {
    if (isEffectUnavailable || playRef.current) return
    setIsCanvasMounted(true)
  }

  // `replay` owns the queued-play flag: it raises one when the renderer still
  // has to be built, and clears it whenever it can play the click itself.
  const replay = () => {
    const play = playRef.current
    if (play) {
      queuedManualPlayRef.current = false
      play()
      return
    }

    queuedManualPlayRef.current = true
    setIsCanvasMounted(true)
  }

  return (
    <button
      type="button"
      onClick={replay}
      onPointerEnter={warmUp}
      onPointerDown={warmUp}
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
      <img
        ref={futureImageRef}
        src={justiceHeaderFuture768}
        srcSet={`${justiceHeaderFuture768} 768w, ${justiceHeaderFuture1280} 1280w`}
        sizes="(min-width: 1280px) 70vw, 0px"
        width={1280}
        height={976}
        alt=""
        aria-hidden="true"
        loading="eager"
        decoding="async"
        draggable={false}
        className="pointer-events-none invisible absolute inset-0 h-full w-full object-contain object-right-bottom"
      />
      {isCanvasMounted ? (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full bg-transparent"
        />
      ) : null}
    </button>
  )
}
