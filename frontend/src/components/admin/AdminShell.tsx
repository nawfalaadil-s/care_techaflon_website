import { NavLink, Outlet } from 'react-router-dom'

import { Container } from '@/components/ui/container'
import { Badge } from '@/components/ui/badge'

const links = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/registrations', label: 'Registrations' },
  { to: '/admin/submissions', label: 'Submissions' },
  { to: '/admin/venue', label: 'Venue' },
  { to: '/admin/allocations', label: 'Problem allocation' },
  { to: '/admin/problems', label: 'Problem statements' },
  { to: '/admin/emails', label: 'Email outbox' },
  { to: '/admin/analytics', label: 'Analytics' },
  { to: '/admin/settings', label: 'Settings' },
  { to: '/admin/account', label: 'Account' },
]

/** Shared chrome for admin CRM pages: sub-nav + outlet. */
export function AdminShell() {
  return (
    <Container className="py-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold">Admin CRM</h1>
          <Badge variant="info">Organizer area</Badge>
        </div>

        <nav aria-label="Admin sections" className="mb-8 flex flex-wrap gap-1.5">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={'end' in link ? link.end : false}
              className={({ isActive }) =>
                `inline-flex h-10 items-center rounded-full border px-4 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <Outlet />
      </div>
    </Container>
  )
}
