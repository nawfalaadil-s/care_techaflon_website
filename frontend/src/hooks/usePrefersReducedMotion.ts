import { useEffect, useState } from 'react'

function queryReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Tracks the user's `prefers-reduced-motion` preference, updating live
 * if it changes while the app is open (e.g. toggled at the OS level).
 *
 * Components should branch on this to disable decorative animation,
 * keeping the experience comfortable for sensitive users.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(queryReducedMotion)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return reduced
}
