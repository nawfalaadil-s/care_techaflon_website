import { Link, useNavigate } from 'react-router-dom'

import { ChangePasswordCard } from '@/components/account/ChangePasswordCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { useAuthStore } from '@/store/authStore'

const ROLE_LABELS: Record<string, string> = {
  leader: 'Team leader',
  organizer: 'Organizer',
  admin: 'Admin',
}

export default function AccountPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clearSession = useAuthStore((s) => s.clearSession)

  if (!user) return null

  function logout() {
    clearSession()
    navigate('/', { replace: true })
  }

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <Badge variant="outline">Team portal</Badge>
          <h1 className="mt-3 text-3xl sm:text-4xl">My account</h1>
          <p className="mt-2 text-muted-foreground">
            Signed in as{' '}
            <strong className="text-foreground">{user.email}</strong>.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{user.full_name}</CardTitle>
            <CardDescription>
              Your account details and security settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="divide-y divide-border rounded-lg border">
              <Row k="Email" v={user.email} />
              <Row
                k="Role"
                v={ROLE_LABELS[user.role] ?? user.role}
              />
              <Row k="Status" v={user.is_active ? 'Active' : 'Inactive'} />
              <Row k="User ID" v={user.id} mono />
            </dl>

            {(user.is_admin || user.role === 'organizer') && (
              <div className="rounded-md border border-info/40 bg-info/10 p-3 text-sm text-info-foreground">
                Organizer account detected —{' '}
                <Link to="/admin" className="font-medium underline">
                  open the admin CRM →
                </Link>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                to="/portal"
                className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:h-10"
              >
                My teams
              </Link>
              <Button variant="outline" onClick={logout}>
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Available to every signed-in user: leaders and organizers/admins. */}
        <ChangePasswordCard />
      </div>
    </Container>
  )
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="text-sm font-medium text-muted-foreground">{k}</dt>
      <dd
        className={`break-all text-right text-sm text-foreground ${
          mono ? 'font-mono' : ''
        }`}
      >
        {v}
      </dd>
    </div>
  )
}
