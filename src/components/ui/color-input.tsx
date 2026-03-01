import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ColorInputProps extends Omit<ComponentProps<'input'>, 'type'> {
  readonly label?: string;
}

/**
 * A standardized color picker input wrapper.
 * Provides consistent sizing and styling for color inputs.
 */
export function ColorInput({ label, className, id, ...props }: ColorInputProps) {
  return (
    <div className="flex items-center gap-2">
      {label && (
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
      )}
      <Input
        type="color"
        id={id}
        className={cn('h-8 w-8 cursor-pointer rounded border border-input p-0.5', className)}
        {...props}
      />
    </div>
  );
}
