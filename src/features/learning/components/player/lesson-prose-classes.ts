import { cn } from '@/lib/utils'

/**
 * The prose colour contract shared by the lesson player and both challenge
 * views (article and section): typography's variables on the design tokens, the
 * callout (blockquote) on the partial pair, and inline and fenced code on the
 * muted surface. Each view keeps its own layout around these.
 */

export const LESSON_PROSE_COLOUR_CLASS_NAME = cn(
  '[--tw-prose-body:hsl(var(--foreground))] [--tw-prose-headings:hsl(var(--foreground))] [--tw-prose-lead:hsl(var(--foreground))]',
  '[--tw-prose-links:hsl(var(--primary))] [--tw-prose-bold:hsl(var(--foreground))] [--tw-prose-counters:hsl(var(--muted-foreground))]',
  '[--tw-prose-bullets:hsl(var(--muted-foreground))] [--tw-prose-hr:hsl(var(--border))] [--tw-prose-quotes:hsl(var(--foreground))]',
  '[--tw-prose-quote-borders:hsl(var(--border))] [--tw-prose-captions:hsl(var(--muted-foreground))] [--tw-prose-code:hsl(var(--foreground))]',
  '[--tw-prose-kbd:hsl(var(--foreground))] [--tw-prose-kbd-shadows:hsl(var(--foreground)/0.1)]',
  '[--tw-prose-pre-code:hsl(var(--foreground))] [--tw-prose-pre-bg:hsl(var(--muted))] [--tw-prose-th-borders:hsl(var(--border))]',
  '[--tw-prose-td-borders:hsl(var(--border))]',
)

export const LESSON_PROSE_BLOCKQUOTE_CLASS_NAME = cn(
  '[&_blockquote]:relative [&_blockquote]:my-10 [&_blockquote]:not-italic',
  '[&_blockquote]:rounded-r-2xl [&_blockquote]:rounded-l-none',
  '[&_blockquote]:border [&_blockquote]:border-l-0 [&_blockquote]:border-status-partial-fg/30',
  '[&_blockquote]:bg-status-partial-bg [&_blockquote]:text-status-partial-fg [&_blockquote_li]:text-status-partial-fg',
  '[&_blockquote_a]:text-status-partial-fg [&_blockquote_a]:underline [&_blockquote_li]:marker:text-status-partial-fg',
  '[&_blockquote]:pl-6 [&_blockquote]:pr-6 [&_blockquote]:py-5 [&_blockquote]:md:pl-8 [&_blockquote]:md:pr-8 [&_blockquote]:md:py-6',
  '[&_blockquote]:shadow-sm',
  '[&_blockquote]:before:absolute [&_blockquote]:before:left-0 [&_blockquote]:before:top-0 [&_blockquote]:before:bottom-0',
  '[&_blockquote]:before:w-1',
  '[&_blockquote]:before:bg-status-partial-fg',
  '[&_blockquote_p]:relative [&_blockquote_p]:z-10',
  '[&_blockquote_p]:text-base [&_blockquote_p]:md:text-lg [&_blockquote_p]:font-medium [&_blockquote_p]:leading-relaxed',
  '[&_blockquote_p]:text-status-partial-fg',
  '[&_blockquote_p:first-child]:mt-0 [&_blockquote_p:last-child]:mb-0',
  '[&_blockquote_p:first-of-type]:before:content-none [&_blockquote_p:last-of-type]:after:content-none',
  '[&_blockquote_strong]:font-black [&_blockquote_strong]:text-status-partial-fg',
  '[&_blockquote_strong]:tracking-tight',
)

/** Inline code on a muted patch; a fenced block is one muted surface, with no second patch behind its code. */
export const LESSON_PROSE_CODE_CLASS_NAME = cn(
  'prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-normal prose-code:before:content-none prose-code:after:content-none',
  '[&_pre]:border [&_pre]:border-border [&_pre]:bg-muted',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit',
)
