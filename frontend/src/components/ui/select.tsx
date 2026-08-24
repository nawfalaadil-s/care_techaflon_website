import type { SelectHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export function Select({ className, invalid, children, ...props }: SelectProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(
        'flex h-11 w-full appearance-none rounded-md border bg-transparent px-3 text-sm sm:h-10',
        'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%23909090%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22%2F%3E%3C%2Fsvg%3E")] bg-[position:right_0.6rem_center] bg-no-repeat pr-9',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        invalid
          ? 'border-destructive focus-visible:ring-destructive'
          : 'border-input',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
