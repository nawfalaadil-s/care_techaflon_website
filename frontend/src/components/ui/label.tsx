import type { LabelHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /** Renders a small required '*' marker for accessibility helpers. */
  required?: boolean
}

export function Label({ className, htmlFor, required, children, ...props }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        'mb-1.5 block text-sm font-medium text-foreground',
        className,
      )}
      {...props}
    >
      {children}
      {required && (
        <span aria-hidden="true" className="ml-0.5 text-destructive">
          *
        </span>
      )}
    </label>
  )
}
