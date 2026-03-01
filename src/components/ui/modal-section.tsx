import { cn } from '@/lib/utils';

interface ModalSectionProps {
  readonly title?: string;
  readonly actions?: React.ReactNode;
  readonly variant?: 'default' | 'muted' | 'primary' | 'danger';
  readonly children: React.ReactNode;
  readonly className?: string;
}

/**
 * A standardized section component for modal content grouping.
 * Provides consistent styling with different variants for semantic grouping.
 */
export function ModalSection({
  title,
  actions,
  variant = 'default',
  children,
  className,
}: ModalSectionProps) {
  const variants = {
    default: 'rounded-lg border p-4',
    muted: 'rounded-xl border bg-muted/20 p-4',
    primary: 'rounded-lg border border-primary/40 bg-primary/5 p-4',
    danger: 'rounded-lg border border-red-200 bg-red-50/40 p-3',
  };

  return (
    <section className={cn(variants[variant], className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
