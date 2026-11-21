/* eslint-disable react-refresh/only-export-components */
import { cn } from '@/lib/utils'
import { LessonSkeleton } from '../loading/LessonSkeleton'
import { LESSON_PROSE_BLOCKQUOTE_CLASS_NAME, LESSON_PROSE_CODE_CLASS_NAME, LESSON_PROSE_COLOUR_CLASS_NAME } from './lesson-prose-classes'

export const LESSON_ARTICLE_PROSE_CLASS_NAME = cn(
  'prose max-w-none',
  LESSON_PROSE_COLOUR_CLASS_NAME,
  'prose-headings:scroll-mt-20 prose-headings:font-black prose-headings:tracking-tight prose-headings:leading-tight',
  'prose-h1:text-4xl prose-h1:md:text-6xl prose-h1:tracking-tighter',
  'prose-h2:text-2xl prose-h2:md:text-3xl',
  'prose-h3:text-xl prose-h3:md:text-2xl',
  'prose-p:leading-relaxed',
  LESSON_PROSE_BLOCKQUOTE_CLASS_NAME,
  'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
  LESSON_PROSE_CODE_CLASS_NAME,
  'prose-img:rounded-xl prose-img:shadow-md',
  '[&_pre]:max-w-[90vw] [&_pre]:mx-auto [&_pre]:my-6',
  '[&_pre]:overflow-x-auto [&_pre]:rounded-xl',
  '[&_pre]:p-4 [&_pre]:text-sm',
  '[&_pre]:bg-[linear-gradient(to_right,hsl(var(--muted))_30%,transparent),linear-gradient(to_left,hsl(var(--muted))_30%,transparent),linear-gradient(to_right,hsl(var(--border)),transparent),linear-gradient(to_left,hsl(var(--border)),transparent)]',
  '[&_pre]:bg-position-[left_center,right_center,left_center,right_center]',
  '[&_pre]:bg-size-[40px_100%,40px_100%,14px_100%,14px_100%]',
  '[&_pre]:bg-no-repeat',
  '[&_pre]:[background-attachment:local,local,scroll,scroll]',
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
