import { useNavigate } from 'react-router-dom'

import { ChangePasswordCard } from '@/components/account/ChangePasswordCard'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'

const ROLE_LABELS: Record<string, string> = {
  leader: 'Team leader',
  organizer: 'Organizer',
  admin: 'Admin',
}

/** Admin-panel account section: identity summary + password change. */
export default function AdminAccountPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clearSession = useAuthStore((s) => s.clearSession)

  if (!user) return null

  function logout() {
    clearSession()
    navigate('/', { replace: true })
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-xl font-bold">Account</h2>
        <p className="text-sm text-muted-foreground">
          Your organizer profile and security settings.
        </p>
      </header>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <dl className="divide-y divide-border rounded-lg border">
            <Row k="Name" v={user.full_name} />
            <Row k="Email" v={user.email} mono />
            <Row k="Role" v={ROLE_LABELS[user.role] ?? user.role} />
            <Row k="Status" v={user.is_active ? 'Active' : 'Inactive'} />
          </dl>
          <Button variant="outline" onClick={logout}>
            Sign out
          </Button>
        </CardContent>
      </Card>

      <ChangePasswordCard />
    </div>
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
