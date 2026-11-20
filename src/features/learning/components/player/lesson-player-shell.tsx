/* eslint-disable react-refresh/only-export-components */
import { cn } from '@/lib/utils'
import { LessonSkeleton } from '../loading/LessonSkeleton'

export const LESSON_ARTICLE_PROSE_CLASS_NAME = cn(
  'prose max-w-none',
  '[--tw-prose-body:hsl(var(--foreground))] [--tw-prose-headings:hsl(var(--foreground))] [--tw-prose-lead:hsl(var(--foreground))]',
  '[--tw-prose-links:hsl(var(--primary))] [--tw-prose-bold:hsl(var(--foreground))] [--tw-prose-counters:hsl(var(--muted-foreground))]',
  '[--tw-prose-bullets:hsl(var(--muted-foreground))] [--tw-prose-hr:hsl(var(--border))] [--tw-prose-quotes:hsl(var(--foreground))]',
  '[--tw-prose-quote-borders:hsl(var(--border))] [--tw-prose-captions:hsl(var(--muted-foreground))] [--tw-prose-code:hsl(var(--foreground))]',
  '[--tw-prose-pre-code:hsl(var(--foreground))] [--tw-prose-pre-bg:hsl(var(--muted))] [--tw-prose-th-borders:hsl(var(--border))]',
  '[--tw-prose-td-borders:hsl(var(--border))]',
  'prose-headings:scroll-mt-20 prose-headings:font-black prose-headings:tracking-tight prose-headings:leading-tight',
  'prose-h1:text-4xl prose-h1:md:text-6xl prose-h1:tracking-tighter',
  'prose-h2:text-2xl prose-h2:md:text-3xl',
  'prose-h3:text-xl prose-h3:md:text-2xl',
  'prose-p:leading-relaxed',
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
  'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
  'prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-normal prose-code:before:content-none prose-code:after:content-none',
  'prose-img:rounded-xl prose-img:shadow-md',
  '[&_pre]:max-w-[90vw] [&_pre]:mx-auto [&_pre]:my-6',
  '[&_pre]:overflow-x-auto [&_pre]:rounded-xl',
  '[&_pre]:border [&_pre]:border-border',
  '[&_pre]:bg-muted',
  '[&_pre]:p-4 [&_pre]:text-sm',
  '[&_pre]:bg-[linear-gradient(to_right,hsl(var(--muted))_30%,transparent),linear-gradient(to_left,hsl(var(--muted))_30%,transparent),linear-gradient(to_right,hsl(var(--border)),transparent),linear-gradient(to_left,hsl(var(--border)),transparent)]',
  '[&_pre]:bg-position-[left_center,right_center,left_center,right_center]',
  '[&_pre]:bg-size-[40px_100%,40px_100%,14px_100%,14px_100%]',
  '[&_pre]:bg-no-repeat',
  '[&_pre]:[background-attachment:local,local,scroll,scroll]',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit',
  '[&_pre_code]:whitespace-pre [&_pre_code]:break-normal',
  '[&_table]:my-8',
  '[&_table]:overflow-x-auto',
  '[&_table]:rounded-2xl [&_table]:overflow-hidden',
  '[&_table]:bg-card',
  '[&_table]:text-sm',
  '[&_table]:bg-[linear-gradient(to_right,hsl(var(--card))_30%,transparent),linear-gradient(to_left,hsl(var(--card))_30%,transparent),linear-gradient(to_right,hsl(var(--border)),transparent),linear-gradient(to_left,hsl(var(--border)),transparent)]',
  '[&_table]:bg-position-[left_center,right_center,left_center,right_center]',
  '[&_table]:bg-size-[40px_100%,40px_100%,14px_100%,14px_100%]',
  '[&_table]:bg-no-repeat',
  '[&_table]:[background-attachment:local,local,scroll,scroll]',
  '[&_thead]:bg-muted',
  '[&_thead]:border-b [&_thead]:border-border',
  '[&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-bold [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wider',
  '[&_th]:text-foreground',
  '[&_tbody_tr:nth-child(odd)]:bg-card',
  '[&_tbody_tr:nth-child(even)]:bg-muted/50',
  '[&_tbody_tr]:border-b [&_tbody_tr]:border-border',
  '[&_tbody_tr:last-child]:border-b-0',
  '[&_tbody_tr]:transition-colors',
  '[&_tbody_tr:hover]:bg-muted',
  '[&_td]:px-4 [&_td]:py-3',
  '[&_td]:text-foreground',
)

export function LessonRoutePending() {
  return (
    <div
      data-testid="learning-lesson-pending-shell"
      className="animate-in fade-in duration-300"
    >
      <div className={LESSON_ARTICLE_PROSE_CLASS_NAME}>
        <LessonSkeleton />
      </div>
    </div>
  )
}
