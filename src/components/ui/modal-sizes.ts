/**
 * Modal sizing constants for consistent modal dimensions across the application.
 * Use these constants instead of inline size classes for better maintainability.
 */

export const modalSizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-xl',
  xl: 'max-w-2xl',
  '2xl': 'max-w-3xl',
  '3xl': 'max-w-4xl',
  '4xl': 'max-w-5xl',
  full: 'max-w-6xl',
} as const;

export type ModalSize = keyof typeof modalSizes;

/**
 * Class for large modals with custom viewport sizing.
 * Provides responsive width (max 96vw) and height (max 92vh) with proper overflow handling.
 */
export const largeModalClassName =
  'w-[min(96vw,1200px)] h-[min(92vh,940px)] overflow-hidden p-0 gap-0 grid-rows-[auto_minmax(0,1fr)]';

/**
 * Smaller variant of the large modal (800px max height instead of 940px).
 * Used for modals that need less vertical space (e.g. warnings modal).
 */
export const mediumLargeModalClassName =
  'w-[min(96vw,1200px)] h-[min(92vh,800px)] overflow-hidden p-0 gap-0 grid-rows-[auto_minmax(0,1fr)]';

/**
 * Standard header styling for large modals with border.
 */
export const modalHeaderClassName = 'border-b px-6 py-5';

/**
 * Standard content area for large modals with proper scrolling.
 */
export const modalContentClassName = 'flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4';
