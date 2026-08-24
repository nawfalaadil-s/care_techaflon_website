import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { normalizeApiError } from '@/api/client'
import { teamApi, type TeamRecord } from '@/api/teamApi'
import { statsApi, type OverviewStats } from '@/api/statsApi'
import { Badge } from '@/components/ui/badge'
import type { BadgeVariant } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { THEME_LABELS } from '@/data/tracks'
import {
  TEAM_STATUSES,
  TEAM_STATUS_LABELS,
  TEAM_STATUS_VARIANT,
} from '@/data/status'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready' }

export default function DashboardPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [recent, setRecent] = useState<TeamRecord[]>([])

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      const [overview, teams] = await Promise.all([
        statsApi.overview(),
        teamApi.adminList(),
      ])
      setStats(overview)
      setRecent(teams.slice(0, 5))
      setState({ kind: 'ready' })
    } catch (error) {
      setState({ kind: 'error', message: normalizeApiError(error).message })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (state.kind === 'loading') {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
        <Spinner /> Loading dashboard…
      </div>
    )
  }

  if (state.kind === 'error') {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            Couldn’t load the dashboard. {state.message}
          </div>
          <Button variant="outline" onClick={() => void load()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }

  const teams = stats!.teams

  return (
    <div className="space-y-8">
      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total teams" value={teams.total} />
        {TEAM_STATUSES.map((status) => (
          <StatCard
            key={status}
            label={TEAM_STATUS_LABELS[status]}
            value={teams.by_status[status] ?? 0}
            variant={TEAM_STATUS_VARIANT[status]}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Participants" value={stats!.members_total} />
        <StatCard label="Submissions" value={stats!.submissions} />
        <StatCard
          label="Statements live"
          value={`${stats!.problem_statements.published}/${stats!.problem_statements.total}`}
        />
        <StatCard label="PS allocated" value={stats!.allocated_statements} />
        <StatCard label="Accounts" value={stats!.users.total} />
      </div>

      {/* Theme distribution */}
      <Card>
        <CardContent className="space-y-3 pt-6">
          <h2 className="font-display text-lg font-semibold">Teams per theme</h2>
          {teams.total === 0 ? (
            <p className="text-sm text-muted-foreground">No teams yet.</p>
          ) : (
            Object.entries(teams.by_theme)
              .sort((a, b) => b[1] - a[1])
              .map(([theme, count]) => (
                <div key={theme} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{THEME_LABELS[theme] ?? theme}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div
                    role="presentation"
                    className="h-2 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.round((count / teams.total) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
          )}
        </CardContent>
      </Card>

      {/* Recent activity */}
      <section aria-labelledby="recent-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="recent-heading" className="font-display text-lg font-semibold">
            Latest teams
          </h2>
          <Link
            to="/admin/registrations"
            className="link-underline text-sm font-medium text-primary"
          >
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((t) => (
              <li key={t.id}>
                <Link
                  to="/admin/registrations"
                  className="flex items-center justify-between gap-3 rounded-lg border p-3.5 transition-colors hover:bg-accent"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {t.team_name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {t.team_id} · {t.leader_name}
                    </span>
                  </span>
                  <Badge variant={TEAM_STATUS_VARIANT[t.status]}>
                    {TEAM_STATUS_LABELS[t.status]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  variant,
}: {
  label: string
  value: number | string
  variant?: BadgeVariant
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        {variant && (
          <div className="mb-1.5">
            <Badge variant={variant}>{label}</Badge>
          </div>
        )}
        {!variant && (
          <p className="mb-1 truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
        )}
        <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}
