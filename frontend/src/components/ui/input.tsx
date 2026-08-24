import type { InputHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export function Input({ className, invalid, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        'flex h-11 w-full rounded-md border bg-transparent px-3 text-sm sm:h-10',
        'transition-colors placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        invalid
          ? 'border-destructive focus-visible:ring-destructive'
          : 'border-input',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
