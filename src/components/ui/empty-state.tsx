import { cn } from '@/lib/utils';

interface EmptyStateProps {
  readonly icon?: React.ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly className?: string;
}

/**
 * A standardized empty state component for modals and lists.
 * Provides consistent styling for "no results" or "no data" states.
 */
export function EmptyState({ icon, title, description, className }: EmptyStateProps) {
  return (
    <div
      className={cn('rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground', className)}
    >
      {icon && <div className="mb-3 flex justify-center text-muted-foreground">{icon}</div>}
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 text-xs">{description}</p>}
    </div>
  );
}
