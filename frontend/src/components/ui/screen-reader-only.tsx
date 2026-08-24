import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * Text that is visually hidden but available to screen readers
 * (replaces the Tailwind `sr-only` utility for consistency).
 */
export function ScreenReaderOnly({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0',
        'm-[-1px] [clip:rect(0,0,0,0)]',
        className,
      )}
    >
      {children}
    </span>
  )
}
