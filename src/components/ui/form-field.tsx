import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  readonly label: string;
  readonly htmlFor?: string;
  readonly required?: boolean;
  readonly children: React.ReactNode;
  readonly className?: string;
}

/**
 * A standardized form field wrapper that provides consistent spacing and labels.
 * Uses space-y-2 for consistent form field spacing.
 */
export function FormField({ label, htmlFor, required, children, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}
