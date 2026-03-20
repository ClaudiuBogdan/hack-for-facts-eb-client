import { cn } from '@/lib/utils'
import { LessonSkeleton } from '../loading/LessonSkeleton'

export const LESSON_ARTICLE_PROSE_CLASS_NAME = cn(
  'prose prose-slate dark:prose-invert max-w-none',
  'prose-headings:scroll-mt-20 prose-headings:font-black prose-headings:tracking-tight prose-headings:leading-tight',
  'prose-h1:text-4xl prose-h1:md:text-6xl prose-h1:tracking-tighter',
  'prose-h2:text-2xl prose-h2:md:text-3xl',
  'prose-h3:text-xl prose-h3:md:text-2xl',
  'prose-p:leading-relaxed',
  '[&_blockquote]:relative [&_blockquote]:my-10 [&_blockquote]:not-italic',
  '[&_blockquote]:rounded-r-2xl [&_blockquote]:rounded-l-none',
  '[&_blockquote]:border [&_blockquote]:border-l-0 [&_blockquote]:border-amber-200/60',
  'dark:[&_blockquote]:border-amber-500/20',
  '[&_blockquote]:bg-linear-to-br [&_blockquote]:from-amber-50 [&_blockquote]:via-orange-50/50 [&_blockquote]:to-yellow-50/30',
  'dark:[&_blockquote]:from-amber-950/40 dark:[&_blockquote]:via-orange-950/20 dark:[&_blockquote]:to-yellow-950/10',
  '[&_blockquote]:pl-6 [&_blockquote]:pr-6 [&_blockquote]:py-5 [&_blockquote]:md:pl-8 [&_blockquote]:md:pr-8 [&_blockquote]:md:py-6',
  '[&_blockquote]:shadow-sm [&_blockquote]:shadow-amber-100/50',
  'dark:[&_blockquote]:shadow-amber-900/10',
  '[&_blockquote]:before:absolute [&_blockquote]:before:left-0 [&_blockquote]:before:top-0 [&_blockquote]:before:bottom-0',
  '[&_blockquote]:before:w-1',
  '[&_blockquote]:before:bg-linear-to-b [&_blockquote]:before:from-amber-400 [&_blockquote]:before:via-orange-500 [&_blockquote]:before:to-amber-500',
  'dark:[&_blockquote]:before:from-amber-400 dark:[&_blockquote]:before:via-orange-400 dark:[&_blockquote]:before:to-amber-500',
  '[&_blockquote]:after:absolute [&_blockquote]:after:right-6 [&_blockquote]:after:top-4',
  '[&_blockquote]:after:text-6xl [&_blockquote]:after:font-serif [&_blockquote]:after:leading-none',
  '[&_blockquote]:after:text-amber-200/60 dark:[&_blockquote]:after:text-amber-700/30',
  '[&_blockquote_p]:relative [&_blockquote_p]:z-10',
  '[&_blockquote_p]:text-base [&_blockquote_p]:md:text-lg [&_blockquote_p]:font-medium [&_blockquote_p]:leading-relaxed',
  '[&_blockquote_p]:text-amber-950/80 dark:[&_blockquote_p]:text-amber-100/90',
  '[&_blockquote_p:first-child]:mt-0 [&_blockquote_p:last-child]:mb-0',
  '[&_blockquote_p:first-of-type]:before:content-none [&_blockquote_p:last-of-type]:after:content-none',
  '[&_blockquote_strong]:font-black [&_blockquote_strong]:text-amber-700 dark:[&_blockquote_strong]:text-amber-400',
  '[&_blockquote_strong]:tracking-tight',
  'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
  'prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-normal prose-code:before:content-none prose-code:after:content-none',
  'prose-img:rounded-xl prose-img:shadow-md',
  '[&_pre]:max-w-[90vw] [&_pre]:mx-auto [&_pre]:my-6',
  '[&_pre]:overflow-x-auto [&_pre]:rounded-xl',
  '[&_pre]:border [&_pre]:border-zinc-200 dark:[&_pre]:border-zinc-700',
  '[&_pre]:bg-zinc-100 dark:[&_pre]:bg-zinc-900',
  '[&_pre]:p-4 [&_pre]:text-sm',
  '[&_pre]:bg-[linear-gradient(to_right,var(--color-zinc-100)_30%,transparent),linear-gradient(to_left,var(--color-zinc-100)_30%,transparent),linear-gradient(to_right,var(--color-zinc-300),transparent),linear-gradient(to_left,var(--color-zinc-300),transparent)]',
  'dark:[&_pre]:bg-[linear-gradient(to_right,var(--color-zinc-900)_30%,transparent),linear-gradient(to_left,var(--color-zinc-900)_30%,transparent),linear-gradient(to_right,var(--color-zinc-600),transparent),linear-gradient(to_left,var(--color-zinc-600),transparent)]',
  '[&_pre]:bg-position-[left_center,right_center,left_center,right_center]',
  '[&_pre]:bg-size-[40px_100%,40px_100%,14px_100%,14px_100%]',
  '[&_pre]:bg-no-repeat',
  '[&_pre]:[background-attachment:local,local,scroll,scroll]',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit',
  '[&_pre_code]:whitespace-pre [&_pre_code]:break-normal',
  '[&_table]:my-8',
  '[&_table]:overflow-x-auto',
  '[&_table]:rounded-2xl [&_table]:overflow-hidden',
  '[&_table]:bg-zinc-50 dark:[&_table]:bg-zinc-900/50',
  '[&_table]:text-sm',
  '[&_table]:bg-[linear-gradient(to_right,var(--color-zinc-50)_30%,transparent),linear-gradient(to_left,var(--color-zinc-50)_30%,transparent),linear-gradient(to_right,var(--color-zinc-300),transparent),linear-gradient(to_left,var(--color-zinc-300),transparent)]',
  'dark:[&_table]:bg-[linear-gradient(to_right,var(--color-zinc-900)_30%,transparent),linear-gradient(to_left,var(--color-zinc-900)_30%,transparent),linear-gradient(to_right,var(--color-zinc-600),transparent),linear-gradient(to_left,var(--color-zinc-600),transparent)]',
  '[&_table]:bg-position-[left_center,right_center,left_center,right_center]',
  '[&_table]:bg-size-[40px_100%,40px_100%,14px_100%,14px_100%]',
  '[&_table]:bg-no-repeat',
  '[&_table]:[background-attachment:local,local,scroll,scroll]',
  '[&_thead]:bg-zinc-100/80 dark:[&_thead]:bg-zinc-800/80',
  '[&_thead]:border-b [&_thead]:border-zinc-200 dark:[&_thead]:border-zinc-700',
  '[&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-bold [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wider',
  '[&_th]:text-zinc-700 dark:[&_th]:text-zinc-200',
  '[&_tbody_tr:nth-child(odd)]:bg-white/80 dark:[&_tbody_tr:nth-child(odd)]:bg-zinc-900/30',
  '[&_tbody_tr:nth-child(even)]:bg-zinc-50/50 dark:[&_tbody_tr:nth-child(even)]:bg-zinc-800/20',
  '[&_tbody_tr]:border-b [&_tbody_tr]:border-zinc-100 dark:[&_tbody_tr]:border-zinc-800/60',
  '[&_tbody_tr:last-child]:border-b-0',
  '[&_tbody_tr]:transition-colors',
  '[&_tbody_tr:hover]:bg-zinc-100/50 dark:[&_tbody_tr:hover]:bg-zinc-800/40',
  '[&_td]:px-4 [&_td]:py-3',
  '[&_td]:text-zinc-600 dark:[&_td]:text-zinc-300',
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
