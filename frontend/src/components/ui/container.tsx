import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

/**
 * Responsive content container. Full-bleed padding on mobile, then
 * centered with a max-width and centered gutters on larger screens.
 */
export function Container({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
