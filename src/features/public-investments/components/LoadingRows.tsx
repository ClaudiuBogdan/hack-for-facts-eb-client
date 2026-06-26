import { Skeleton } from '@/components/ui/skeleton'

type Props = {
  readonly rows?: number
}

export function LoadingRows({ rows = 4 }: Props) {
  return (
    <div className="space-y-3" aria-live="polite" aria-busy="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-md border p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-3 h-4 w-2/3" />
          <Skeleton className="mt-3 h-8 w-full" />
        </div>
      ))}
    </div>
  )
}
