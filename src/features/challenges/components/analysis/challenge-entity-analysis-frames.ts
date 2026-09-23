/**
 * Frame classes shared by the entity analysis page and its loading shell.
 * The shell mirrors the page block for block; reading the frames from one
 * place keeps the skeleton's geometry equal to the content's by construction,
 * so a later tweak to a card cannot reopen the gap between the two.
 *
 * Kept free of component imports on purpose: the shell is part of the
 * `/entities/$cui` route's eager module, so this file must not pull the
 * page's dependencies into the critical path.
 */

export const CHALLENGE_ENTITY_ANALYSIS_ROOT_CLASS_NAME =
  'space-y-4 sm:space-y-6 pb-10'

export const CHALLENGE_ENTITY_HERO_FRAME_CLASS_NAME =
  'rounded-[32px] border border-border/50 bg-linear-to-br from-background via-background to-primary/[0.04] px-5 py-5 shadow-sm sm:px-6 sm:py-7 md:px-8'

export const CHALLENGE_ENTITY_HERO_CONTENT_CLASS_NAME = 'space-y-4 sm:space-y-5'

export const CHALLENGE_ENTITY_HERO_CONTROLS_CLASS_NAME =
  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex'

export const CHALLENGE_ENTITY_EXPLAINER_CARD_CLASS_NAME =
  'rounded-[28px] border-border/50 shadow-sm'

export const CHALLENGE_ENTITY_EXPLAINER_CONTENT_CLASS_NAME =
  'px-4 py-4 sm:px-6 sm:py-5 md:px-7'

export const CHALLENGE_ENTITY_VIEW_SHORTCUTS_CLASS_NAME =
  'flex flex-col gap-2 sm:flex-row sm:flex-wrap'

export const CHALLENGE_ENTITY_TREEMAP_CARD_CLASS_NAME =
  'rounded-[28px] border-border/50'
