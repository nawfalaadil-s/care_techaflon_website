import { useCallback, useEffect, useState } from 'react'

import { normalizeApiError } from '@/api/client'
import { statsApi, type AnalyticsStats } from '@/api/statsApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { THEME_LABELS } from '@/data/tracks'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready' }

const WINDOW_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 14, label: 'Last 14 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 60, label: 'Last 60 days' },
  { value: 90, label: 'Last 90 days' },
]

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(30)
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [data, setData] = useState<AnalyticsStats | null>(null)

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      const stats = await statsApi.analytics(days)
      setData(stats)
      setState({ kind: 'ready' })
    } catch (error) {
      setState({ kind: 'error', message: normalizeApiError(error).message })
    }
  }, [days])

  useEffect(() => {
    const id = window.setTimeout(load, 0)
    return () => window.clearTimeout(id)
  }, [load])

  if (state.kind === 'loading') {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
        <Spinner /> Loading analytics…
      </div>
    )
  }

  if (state.kind === 'error' || !data) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            Couldn't load analytics data. {state.kind === 'error' ? state.message : ''}
          </div>
          <Button variant="outline" onClick={() => void load()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { funnel, teams_over_time, themes, departments, problem_adoption } = data
  const maxDailyCount = Math.max(1, ...teams_over_time.map((d) => d.count))
  const maxDepartmentTeams = Math.max(1, ...departments.map((i) => i.teams))

  return (
    <div className="space-y-8">
      {/* Header with time filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold">Hackathon Performance Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Conversion metrics, signup trends, and track distributions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="analytics-window" className="text-xs font-medium text-muted-foreground">
            Window:
          </label>
          <Select
            id="analytics-window"
            value={String(days)}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-9 w-36 text-sm"
          >
            {WINDOW_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Conversion Funnel Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Total Teams" value={funnel.registered} />
        <MetricCard label="Approved" value={funnel.approved} highlight="success" />
        <MetricCard label="Rejected" value={funnel.rejected} highlight="destructive" />
        <MetricCard label="Disqualified" value={funnel.disqualified} />
        <MetricCard label="Projects Submitted" value={funnel.submitted} />
        <MetricCard
          label="Approval Rate"
          value={`${Math.round(funnel.approval_rate * 100)}%`}
          subtext={`Submissions: ${Math.round(funnel.submission_rate * 100)}%`}
        />
      </div>

      {/* Registrations Over Time (SVG Bar Chart) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Registrations Over Time</CardTitle>
          <CardDescription>Daily team registration volume over the chosen period.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {teams_over_time.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No registrations in this period.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex h-36 items-end gap-1 overflow-x-auto pt-4 pb-1">
                {teams_over_time.map((item) => {
                  const heightPercent = Math.round((item.count / maxDailyCount) * 100)
                  return (
                    <div
                      key={item.date}
                      className="group relative flex flex-1 min-w-[12px] flex-col items-center justify-end h-full"
                    >
                      {/* Tooltip on hover */}
                      <div className="pointer-events-none absolute -top-8 hidden rounded bg-popover px-1.5 py-0.5 text-[10px] font-medium text-popover-foreground shadow-sm group-hover:block whitespace-nowrap z-10 border">
                        {item.date}: {item.count} team{item.count === 1 ? '' : 's'}
                      </div>
                      <div
                        className="w-full rounded-t bg-primary/80 transition-all group-hover:bg-primary"
                        style={{ height: `${Math.max(item.count > 0 ? 8 : 2, heightPercent)}%` }}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground px-1 border-t pt-1">
                <span>{teams_over_time[0]?.date}</span>
                <span>{teams_over_time[teams_over_time.length - 1]?.date}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two column layout: Tracks and Top Institutions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Theme Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Theme Performance</CardTitle>
            <CardDescription>Breakdown by teams, approved, and project submissions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {themes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No theme data recorded.</p>
            ) : (
              themes.map((t) => (
                <div key={t.theme} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{THEME_LABELS[t.theme] ?? t.theme}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.teams} teams · {t.approved} approved · {t.submissions} submitted
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${funnel.registered > 0 ? Math.round((t.teams / funnel.registered) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Departments Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Departments</CardTitle>
            <CardDescription>Participation split across departments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {departments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No department data available.</p>
            ) : (
              departments.map((dept, index) => (
                <div key={dept.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate max-w-[280px]">
                      <span className="text-xs font-semibold text-muted-foreground mr-1.5">#{index + 1}</span>
                      {dept.name}
                    </span>
                    <span className="font-medium text-xs">{dept.teams} {dept.teams === 1 ? 'team' : 'teams'}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-secondary transition-all"
                      style={{
                        width: `${Math.round((dept.teams / maxDepartmentTeams) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Problem Statements & Email Delivery Health */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Problem Statements Adoption */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Problem Statement Adoption</CardTitle>
            <CardDescription>
              {problem_adoption.adopted_total} teams allocated a statement ({problem_adoption.unallocated_teams} pending).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {problem_adoption.statements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No published statements available.</p>
            ) : (
              problem_adoption.statements.map((s) => (
                <div key={s.title} className="flex items-center justify-between gap-3 text-sm border-b pb-2 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{THEME_LABELS[s.track] ?? s.track}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {s.teams} {s.teams === 1 ? 'team' : 'teams'}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  subtext,
  highlight,
}: {
  label: string
  value: number | string
  subtext?: string
  highlight?: 'success' | 'warning' | 'destructive'
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="mb-1 truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={`font-display text-2xl font-bold tabular-nums ${
            highlight === 'success'
              ? 'text-success'
              : highlight === 'destructive'
                ? 'text-destructive'
                : 'text-foreground'
          }`}
        >
          {value}
        </p>
        {subtext && <p className="mt-1 text-[11px] text-muted-foreground truncate">{subtext}</p>}
      </CardContent>
    </Card>
  )
}
