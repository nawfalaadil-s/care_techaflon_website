import type { TextareaHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export function Textarea({ className, invalid, ...props }: TextareaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(
        'flex min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm',
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
