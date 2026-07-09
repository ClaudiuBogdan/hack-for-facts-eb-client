import { EmptyState } from '@/components/ui/empty-state'

type Props = {
  readonly title: string
  readonly description?: string
}

export function PrivateCompanyTabEmpty({ title, description }: Props) {
  return (
    <div
      className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-4 py-8 sm:px-5"
    >
      <EmptyState
        title={title}
        description={description}
        className="text-left sm:text-center [&_h3]:text-base [&_h3]:font-semibold [&_p]:text-sm [&_p]:leading-relaxed"
      />
    </div>
  )
}
