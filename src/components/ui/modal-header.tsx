import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
  readonly align?: 'center' | 'left' | 'default';
  readonly variant?: 'default' | 'icon' | 'bordered';
}

/**
 * An enhanced modal header component with better layout options for visual hierarchy.
 *
 * Variants:
 * - default: Standard header without extra styling
 * - icon: Centers content, useful for modals with large icon headers
 * - bordered: Adds a bottom border for visual separation
 *
 * Align:
 * - default: Uses text-center sm:text-left (responsive)
 * - center: Always centered
 * - left: Always left-aligned
 */
export function ModalHeader({
  className,
  align = 'default',
  variant = 'default',
  children,
  ...props
}: ModalHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        {
          'text-center sm:text-left': align === 'default',
          'text-center': align === 'center',
          'text-left': align === 'left',
          'border-b pb-4': variant === 'bordered',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface ModalTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  readonly icon?: React.ReactNode;
  readonly subtitle?: string;
}

/**
 * A modal title component that can include an icon and subtitle.
 * The icon is positioned above the title for better visual hierarchy.
 */
export function ModalTitle({ className, icon, subtitle, children, ...props }: ModalTitleProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)} {...props}>
      {icon && (
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 sm:mx-0">
          {icon}
        </div>
      )}
      <h2 className="text-xl font-semibold leading-none tracking-tight">{children}</h2>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
