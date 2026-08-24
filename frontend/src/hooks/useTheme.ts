import { useCallback, useEffect, useRef, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'hackathon-theme'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function resolveTheme(preference: Theme): 'light' | 'dark' {
  return preference === 'system' ? getSystemTheme() : preference
}

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  // Dark is the designed default — the cinematic theme should never fall
  // back to a light OS preference and show washed-out white areas.
  return 'dark'
}

const THEME_FADE_MS = 550

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Apply the resolved theme to <html>. When `animate` is true, a temporary
 * `theme-transition` class makes every color cross-fade smoothly instead
 * of snapping (skipped under prefers-reduced-motion).
 */
function applyTheme(theme: Theme, animate = false) {
  const resolved = resolveTheme(theme)
  const root = document.documentElement

  if (animate && !prefersReducedMotion()) {
    // Restart cleanly on rapid toggles: drop the class, force a style flush,
    // then re-apply so the cross-fade always runs from the current colors.
    root.classList.remove('theme-transition')
    void root.offsetWidth
    root.classList.add('theme-transition')
    window.setTimeout(
      () => root.classList.remove('theme-transition'),
      THEME_FADE_MS,
    )
  }

  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
}

/**
 * Light/dark/system theme management.
 *
 * - Persists the user's choice to localStorage.
 * - Falls back to the OS preference.
 * - Applies the `.dark` class to <html> so the design-system
 *   tokens in `index.css` respond accordingly.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)
  // Skip the cross-fade on the very first application (initial page load).
  const mounted = useRef(false)

  useEffect(() => {
    const darkBefore = document.documentElement.classList.contains('dark')
    const animate = mounted.current && darkBefore !== (resolveTheme(theme) === 'dark')
    mounted.current = true

    applyTheme(theme, animate)
    window.localStorage.setItem(STORAGE_KEY, theme)

    if (theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system', true)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const toggleTheme = useCallback(
    () =>
      setThemeState((prev) =>
        resolveTheme(prev) === 'dark' ? 'light' : 'dark',
      ),
    [],
  )

  return { theme, setTheme, toggleTheme }
}
