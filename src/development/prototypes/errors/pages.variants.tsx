import { t } from '@lingui/core/macro'
import { ErrorPageView } from '@/components/errors/GlobalErrorPage'
import { NotFoundPage } from '@/components/errors/not-found-page'
import { PixelCookie, PixelFour, PixelSheet } from './pages.art'
import { PageCharacter, type Face } from './pages.page'
import { COOKIE_WORDS, SHEET_WORDS, SceneSwitch, ScenePage, useScene } from './pages.scenes'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

/** A · The cookie from the consent card, as the site's character: picture beside the words. */
export function CookieVariant() {
  const scene = useScene()
  return (
    <div data-dev-marker={PROTOTYPE_MARKER}>
      <SceneSwitch />
      <ScenePage
        key={scene}
        scene={scene}
        layout="split"
        words={COOKIE_WORDS}
        art={(props) => <PixelCookie {...props} className="size-56 @3xl:size-72 @5xl:size-80" />}
      />
    </div>
  )
}

/** B · A sheet from a file, the platform's own material: picture beside the words. */
export function SheetVariant() {
  const scene = useScene()
  return (
    <div data-dev-marker={PROTOTYPE_MARKER}>
      <SceneSwitch />
      <ScenePage
        key={scene}
        scene={scene}
        layout="split"
        words={SHEET_WORDS}
        art={(props) => <PixelSheet {...props} className="size-56 @3xl:size-72 @5xl:size-80" />}
      />
    </div>
  )
}

/** C · The cookie, centred over the words; on the 404 it is the zero in a pixel "404". */
export function DigitsVariant() {
  const scene = useScene()
  return (
    <div data-dev-marker={PROTOTYPE_MARKER}>
      <SceneSwitch />
      <ScenePage
        key={scene}
        scene={scene}
        layout="center"
        words={COOKIE_WORDS}
        art={(props) =>
          props.mood === 'search' ? (
            <div className="flex items-end gap-3 @2xl:gap-5" role="img" aria-label={t`404, cu un cookie desenat în pixeli în locul lui zero`}>
              <PixelFour className="h-24 w-auto @2xl:h-36" />
              <PixelCookie {...props} bare label="" className="-mb-2 h-28 w-auto @2xl:h-44" />
              <PixelFour className="h-24 w-auto @2xl:h-36" />
            </div>
          ) : (
            <PixelCookie {...props} className="size-44 @2xl:size-56" />
          )
        }
      />
    </div>
  )
}

/** Round 2 · The page as the character, with its own face: picture beside the words. */
function PageVariant({ face }: { readonly face: Face }) {
  const scene = useScene()
  return (
    <div data-dev-marker={PROTOTYPE_MARKER}>
      <SceneSwitch />
      <ScenePage
        key={scene}
        scene={scene}
        layout="split"
        words={SHEET_WORDS}
        art={(props) => <PageCharacter {...props} face={face} className="size-36 @3xl:size-76 @5xl:size-84" />}
      />
    </div>
  )
}

export function PageGooglyVariant() {
  return <PageVariant face="googly" />
}

export function PageCatVariant() {
  return <PageVariant face="cat" />
}

/** Promoted · The real components, as shipped: `NotFoundPage` and `ErrorPageView` (screenshots for the push). */
export function PromotedVariant() {
  const scene = useScene()
  return (
    <div data-dev-marker={PROTOTYPE_MARKER}>
      <SceneSwitch />
      {scene === 'not-found' ? <NotFoundPage /> : <ErrorPageView key={scene} kind={scene === 'update' ? 'update' : 'broken'} />}
    </div>
  )
}
