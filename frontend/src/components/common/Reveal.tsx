import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

import { cn } from '@/lib/cn'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

export type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'none'

type DirectionStyles = Record<RevealDirection, string>

const hidden: DirectionStyles = {
  up: 'translate-y-6',
  down: '-translate-y-6',
  left: 'translate-x-6',
  right: '-translate-x-6',
  none: 'opacity-0',
}

interface RevealProps {
  children: ReactNode
  /** Direction the content slides in from. Defaults to `up`. */
  direction?: RevealDirection
  /** Stagger delay in ms (applies a transition-delay). */
  delay?: number
  className?: string
  style?: CSSProperties
  as?: 'div' | 'li' | 'section' | 'article'
}

/**
 * Scroll-reveal wrapper built on IntersectionObserver.
 *
 * - `opacity` + `transform` only (GPU-friendly, no layout thrash).
 * - Fires once, then unobserves (no repeated work later in the page).
 * - No-ops under `prefers-reduced-motion` (content is simply visible).
 * - Server-side / no-JS safe: content is visible by default and only
 *   hidden when the browser confirms it can animate and observes the
 *   element entering the viewport.
 */
export function Reveal({
  children,
  direction = 'up',
  delay = 0,
  className,
  style,
  as: Tag = 'div',
}: RevealProps) {
  const reduced = usePrefersReducedMotion()
  const ref = useRef<HTMLDivElement | null>(null)
  // Start visible when we can't or must not animate (reduced motion, or no
  // IntersectionObserver support) — the only setState happens inside the
  // observer callback below, which is an external-system event.
  const [shown, setShown] = useState(
    () => reduced || typeof IntersectionObserver === 'undefined',
  )

  useEffect(() => {
    const node = ref.current
    if (!node || shown) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true)
            observer.disconnect()
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [shown])

  return (
    <Tag
      ref={ref as never}
      className={cn(
        'transition-[opacity,transform] duration-500 ease-out will-change-[opacity,transform]',
        reduced ? '' : shown ? 'opacity-100 translate-x-0 translate-y-0' : hidden[direction],
        className,
      )}
      style={{ transitionDelay: shown || reduced ? `${delay}ms` : undefined, ...style }}
    >
      {children}
    </Tag>
  )
}
