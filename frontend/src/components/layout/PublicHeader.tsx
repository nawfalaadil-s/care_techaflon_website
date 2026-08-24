import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Container } from '@/components/ui/container'
import { usePublicSettings } from '@/hooks/usePublicSettings'
import { useIsOrganizer } from '@/components/common'
import { useAuthStore } from '@/store/authStore'

const navItems = [
  { to: '/', label: 'Home' },
  // Problem statements are private event content — no public nav link.
  { to: '/faq', label: 'FAQ' },
  { to: '/rules', label: 'Rules' },
]

/**
 * Public site header. Sticky on mobile, brand + nav + theme toggle,
 * collapsing browser nav into a compact always-visible row.
 */
export function PublicHeader() {
  const user = useAuthStore((s) => s.user)
  const isOrganizer = useIsOrganizer()
  const { settings } = usePublicSettings()

  // Mobile navigation drawer (visible below the `sm` breakpoint).
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 font-display text-lg font-bold tracking-tight"
        >
          <span aria-hidden="true" className="text-primary">
            ◆
          </span>
          {settings.event_name}
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 sm:flex"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors duration-300 ease-out hover:bg-accent ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isOrganizer && (
            <Link
              to="/admin"
              className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex sm:h-10 sm:items-center sm:px-3"
            >
              Admin
            </Link>
          )}
          {user ? (
            <Link
              to="/portal"
              className="hidden max-w-40 truncate text-sm font-medium text-primary hover:underline sm:inline-flex sm:h-10 sm:items-center sm:px-3"
              title={user.full_name}
            >
              Hi, {user.full_name.split(' ')[0]}
            </Link>
          ) : (
            <Link
              to="/login"
              className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex sm:h-10 sm:items-center sm:px-3"
            >
              Log in
            </Link>
          )}
          <Link
            to="/register"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors duration-300 ease-out hover:bg-primary/90 focus-ring sm:h-10"
          >
            Register
          </Link>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-input bg-transparent text-foreground transition-colors duration-300 ease-out hover:bg-accent focus-ring sm:hidden"
          >
            {menuOpen ? (
              <X aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Menu aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
        </div>
      </Container>

      {/* Mobile navigation drawer — mirrors the desktop nav items. */}
      {menuOpen && (
        <nav
          id="mobile-nav"
          aria-label="Primary mobile"
          className="border-t bg-background/95 backdrop-blur sm:hidden"
        >
          <Container className="flex flex-col py-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-3 text-sm font-medium transition-colors duration-300 ease-out hover:bg-accent ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {user && (
              <Link
                to="/portal"
                className="truncate rounded-md px-3 py-3 text-sm font-medium text-primary sm:hidden"
                title={user.full_name}
              >
                Hi, {user.full_name.split(' ')[0]}
              </Link>
            )}
            {!user && (
              <Link
                to="/login"
                className="rounded-md px-3 py-3 text-sm font-medium text-muted-foreground transition-colors duration-300 ease-out hover:bg-accent hover:text-foreground sm:hidden"
              >
                Log in
              </Link>
            )}
            {isOrganizer && (
              <Link
                to="/admin"
                className="rounded-md px-3 py-3 text-sm font-medium text-muted-foreground transition-colors duration-300 ease-out hover:bg-accent hover:text-foreground sm:hidden"
              >
                Admin
              </Link>
            )}
          </Container>
        </nav>
      )}
    </header>
  )
}
