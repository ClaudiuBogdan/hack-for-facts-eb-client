import { useEffect, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'
import { BLANK_IMAGE_SRC, WIDE_SCREEN_ART_MEDIA } from '@/lib/wide-screen-art'
import justiceHeaderFuture1280 from '../assets/header-justice-future-registered-1280.webp'
import justiceHeaderFuture768 from '../assets/header-justice-future-registered-768.webp'
import justiceHeader1280 from '../assets/header-justice-1280.webp'
import justiceHeader768 from '../assets/header-justice-768.webp'
import {
  createLegislationHeaderGlitchRenderer,
  type LegislationHeaderGlitchRenderer,
} from '../lib/legislation-header-glitch'

/** The header art itself, not the blank pixel the picture falls back to. */
function isArtLoaded(image: HTMLImageElement): boolean {
  return image.naturalWidth > 1 && image.currentSrc !== BLANK_IMAGE_SRC
}

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
        // Below `xl` the picture holds its blank pixel, which must never become
        // the effect's texture; its 'load' fires again once the art is back.
        !isArtLoaded(image) ||
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
      {/* The visual shows only from `xl`: the source is bound to the same
          width, so a phone keeps the blank fallback and fetches nothing (see
          `wide-screen-art.ts`). */}
      <picture className="contents">
        <source
          media={WIDE_SCREEN_ART_MEDIA}
          srcSet={`${justiceHeader768} 768w, ${justiceHeader1280} 1280w`}
          sizes="70vw"
        />
        <img
          ref={imageRef}
          src={BLANK_IMAGE_SRC}
          width={1280}
          height={976}
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority="high"
          draggable={false}
          className={cn(
            'pointer-events-none absolute inset-0 z-10 h-full w-full object-contain object-right-bottom transition-opacity duration-200 ease-out',
            isImageCoverVisible ? 'opacity-100' : 'opacity-0',
          )}
        />
      </picture>
      {isCanvasMounted ? (
        <>
          {/* The effect's target is fetched with the effect, on intent: only
              the canvas reads it, and most visitors never play it. The
              button is hidden below `xl`, so this mounts only on a wide
              screen. */}
          <img
            ref={futureImageRef}
            src={justiceHeaderFuture768}
            srcSet={`${justiceHeaderFuture768} 768w, ${justiceHeaderFuture1280} 1280w`}
            sizes="70vw"
            width={1280}
            height={976}
            alt=""
            aria-hidden="true"
            decoding="async"
            draggable={false}
            className="pointer-events-none invisible absolute inset-0 h-full w-full object-contain object-right-bottom"
          />
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 h-full w-full bg-transparent"
          />
        </>
      ) : null}
    </button>
  )
}
