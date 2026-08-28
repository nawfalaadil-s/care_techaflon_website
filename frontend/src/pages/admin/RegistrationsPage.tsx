import { useCallback, useEffect, useMemo, useState } from 'react'

import { Download } from 'lucide-react'

import { normalizeApiError } from '@/api/client'
import { problemApi, type ProblemStatement } from '@/api/problemApi'
import { statsApi, type AdminSubmissionRow } from '@/api/statsApi'
import { teamApi, type TeamRecord } from '@/api/teamApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { THEME_LABELS } from '@/data/tracks'
import {
  TEAM_STATUSES,
  TEAM_STATUS_LABELS,
  TEAM_STATUS_VARIANT,
} from '@/data/status'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function RegistrationsPage() {
  const [teams, setTeams] = useState<TeamRecord[]>([])
  const [problems, setProblems] = useState<ProblemStatement[]>([])
  const [submissions, setSubmissions] = useState<Map<string, AdminSubmissionRow>>(
    () => new Map(),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all')
  const [themeFilter, setThemeFilter] = useState<'all' | string>('all')

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  // CSV export
  const [exporting, setExporting] = useState<'teams' | 'registration' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [teamList, problemList, submissionRows] = await Promise.all([
        teamApi.adminList(),
        problemApi.listAll().catch(() => [] as ProblemStatement[]),
        statsApi.adminSubmissions().catch(() => [] as AdminSubmissionRow[]),
      ])
      setTeams(teamList)
      setProblems(problemList)
      setSubmissions(new Map(submissionRows.map((s) => [s.team_uuid, s])))
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(load, 0)
    return () => window.clearTimeout(id)
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return teams.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (themeFilter !== 'all' && t.theme !== themeFilter) return false
      if (!q) return true
      return (
        t.team_name.toLowerCase().includes(q) ||
        t.team_id.toLowerCase().includes(q) ||
        t.leader_name.toLowerCase().includes(q) ||
        t.leader_email.toLowerCase().includes(q) ||
        t.leader_register_number.toLowerCase().includes(q)
      )
    })
  }, [teams, search, statusFilter, themeFilter])

  const selected = teams.find((t) => t.id === selectedId) ?? null

  async function decide(status: TeamRecord['status']) {
    if (!selected || updating || selected.status === status) return
    setUpdating(true)
    try {
      const updated = await teamApi.adminSetStatus(selected.id, status)
      setTeams((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      )
      setSelectedId(updated.id)
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setUpdating(false)
    }
  }

  function replaceTeam(updated: TeamRecord) {
    setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setSelectedId(updated.id)
  }

  // ---- Bulk selection helpers ----

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (prev.size === filtered.length) return new Set()
      return new Set(filtered.map((t) => t.id))
    })
  }

  async function bulkSetStatus(status: TeamRecord['status']) {
    const ids = Array.from(selectedIds)
    if (ids.length === 0 || bulkBusy) return
    if (
      !window.confirm(
        `Set ${ids.length} team(s) to "${TEAM_STATUS_LABELS[status]}"?`,
      )
    )
      return
    setBulkBusy(true)
    setError(null)
    try {
      const result = await teamApi.adminBulkSetStatus(ids, status)
      if (result.errors.length > 0) {
        setError(`Updated ${result.updated}, but: ${result.errors.join('; ')}`)
      }
      // Refresh to get full updated records
      await load()
      setSelectedIds(new Set())
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBulkBusy(false)
    }
  }

  async function bulkDelete() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0 || bulkBusy) return
    if (
      !window.confirm(
        `Delete ${ids.length} team(s) permanently? This cannot be undone.`,
      )
    )
      return
    setBulkBusy(true)
    setError(null)
    try {
      const result = await teamApi.adminBulkDelete(ids)
      if (result.errors.length > 0) {
        setError(`Deleted ${result.deleted}, but: ${result.errors.join('; ')}`)
      }
      await load()
      setSelectedIds(new Set())
      if (selectedId && ids.includes(selectedId)) setSelectedId(null)
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBulkBusy(false)
    }
  }

  async function deleteSingle(team: TeamRecord) {
    if (
      !window.confirm(
        `Delete "${team.team_name}" permanently? This cannot be undone.`,
      )
    )
      return
    setUpdating(true)
    setError(null)
    try {
      await teamApi.adminDelete(team.id)
      await load()
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(team.id)
        return next
      })
      if (selectedId === team.id) setSelectedId(null)
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setUpdating(false)
    }
  }

  async function handleExportCsv(kind: 'teams' | 'registration') {
    if (exporting) return
    setExporting(kind)
    setError(null)
    try {
      const filters = {
        status: statusFilter,
        theme: themeFilter,
        q: search,
      }
      if (kind === 'registration') {
        await teamApi.exportRegistrationCsv(filters)
      } else {
        await teamApi.exportCsv(filters)
      }
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setExporting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
        <Spinner /> Loading registrations…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <label className="contents">
          <span className="sr-only">Search registrations</span>
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team, ID, leader, email…"
          />
        </label>
        <Select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="sm:w-44"
        >
          <option value="all">All statuses</option>
          {TEAM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {TEAM_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by theme"
          value={themeFilter}
          onChange={(e) => setThemeFilter(e.target.value)}
          className="sm:w-52"
        >
          <option value="all">All themes</option>
          {[...new Set(teams.map((t) => t.theme))].map((theme) => (
            <option key={theme} value={theme}>
              {THEME_LABELS[theme] ?? theme}
            </option>
          ))}
        </Select>
        <Button
          variant="outline"
          disabled={exporting !== null}
          onClick={() => void handleExportCsv('teams')}
          className="sm:w-auto"
        >
          {exporting === 'teams' ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
          {exporting === 'teams' ? 'Exporting…' : 'Export'}
        </Button>
        <Button
          variant="outline"
          disabled={exporting !== null}
          onClick={() => void handleExportCsv('registration')}
          className="sm:w-auto"
        >
          {exporting === 'registration' ? (
            <Spinner size="sm" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {exporting === 'registration' ? 'Exporting…' : 'Registration CSV'}
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
          <span className="text-sm font-medium">
            {selectedIds.size} team{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy}
              onClick={() => void bulkSetStatus('approved')}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy}
              onClick={() => void bulkSetStatus('pending')}
            >
              Set pending
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy}
              onClick={() => void bulkSetStatus('rejected')}
            >
              Reject
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy}
              onClick={() => void bulkSetStatus('disqualified')}
            >
              Disqualify
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={bulkBusy}
              onClick={() => void bulkDelete()}
            >
              Delete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={bulkBusy}
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Detail / decision panel */}
      {selected && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl">{selected.team_name}</CardTitle>
                <CardDescription>
                  {selected.team_id} · Registered{' '}
                  {formatDate(selected.created_at)} ·{' '}
                  {selected.members.length + 1} member(s)
                </CardDescription>
              </div>
              <Badge variant={TEAM_STATUS_VARIANT[selected.status]}>
                {TEAM_STATUS_LABELS[selected.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="divide-y divide-border rounded-lg border">
              <Row k="Leader" v={selected.leader_name} />
              <Row k="Email" v={selected.leader_email} />
              <Row k="Register No." v={selected.leader_register_number} />
              <Row k="Department" v={`${selected.leader_department} · ${selected.leader_year}`} />
              <Row k="Theme" v={THEME_LABELS[selected.theme] ?? selected.theme} />
            </dl>

            <div>
              <h3 className="mb-1.5 text-sm font-semibold">Members</h3>
              <ul className="space-y-1 text-sm">
                <li key={selected.leader_email}>
                  <span className="font-medium">{selected.leader_name}</span>
                  <span className="text-muted-foreground">
                    {' '}
                    · {selected.leader_register_number} · {selected.leader_email}
                  </span>
                  <span className="ml-2 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] tracking-widest text-primary">
                    LEADER
                  </span>
                </li>
                {selected.members.map((m, i) => (
                  <li key={`${m.email}-${i}`}>
                    <span className="font-medium">{m.name}</span>
                    <span className="text-muted-foreground">
                      {' '}
                      · {m.register_number} · {m.email}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Problem statement allocation */}
            <ProblemStatementAllocator
              team={selected}
              problems={problems}
              onSaved={replaceTeam}
            />

            {/* Venue assignment */}
            <VenueEditor team={selected} onSaved={replaceTeam} />

            {/* Project submission */}
            <SubmissionSummary submission={submissions.get(selected.id) ?? null} />

            <div className="flex flex-wrap gap-2 pt-1">
              {TEAM_STATUSES.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={selected.status === status ? 'primary' : 'outline'}
                  disabled={updating || selected.status === status}
                  onClick={() => void decide(status)}
                >
                  {TEAM_STATUS_LABELS[status]}
                </Button>
              ))}
              <div className="ml-auto">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={updating}
                  onClick={() => void deleteSingle(selected)}
                >
                  Delete team
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        Showing {filtered.length} of {teams.length} registrations
        {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
      </p>
      <ul className="space-y-2">
        {filtered.map((t) => (
          <li key={t.id}>
            <div
              className={`flex items-center rounded-lg border transition-colors hover:bg-accent ${
                t.id === selectedId ? 'border-primary' : ''
              }`}
            >
              <label className="flex shrink-0 items-center pl-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(t.id)}
                  onChange={() => toggleSelect(t.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
              </label>
              <button
                type="button"
                onClick={() => setSelectedId(t.id === selectedId ? null : t.id)}
                aria-expanded={t.id === selectedId}
                className="flex-1 p-3.5 pl-2.5 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {t.team_name}
                      {t.problem_statement_id && (
                        <span
                          className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle"
                          title="Problem statement allocated"
                        />
                      )}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {t.team_id} · {t.leader_name} ·{' '}
                      {THEME_LABELS[t.theme] ?? t.theme} · {formatDate(t.created_at)}
                      {submissions.get(t.id) && ' · 📦 submitted'}
                    </span>
                  </span>
                  <Badge variant={TEAM_STATUS_VARIANT[t.status]}>
                    {TEAM_STATUS_LABELS[t.status]}
                  </Badge>
                </div>
              </button>
            </div>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="py-8 text-center text-sm text-muted-foreground">
            No registrations match these filters.
          </li>
        )}
      </ul>
      {filtered.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            checked={filtered.length > 0 && selectedIds.size === filtered.length}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          <span className="text-xs text-muted-foreground">
            {selectedIds.size === filtered.length
              ? 'Deselect all'
              : 'Select all visible'}
          </span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Problem statement allocator
// ---------------------------------------------------------------------------

function ProblemStatementAllocator({
  team,
  problems,
  onSaved,
}: {
  team: TeamRecord
  problems: ProblemStatement[]
  onSaved: (updated: TeamRecord) => void
}) {
  const current = problems.find((p) => p.id === team.problem_statement_id) ?? null
  const [psId, setPsId] = useState(team.problem_statement_id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Re-sync when the team's id or allocation changes — adjusted during
  // render (React pattern) instead of an effect.
  const [sync, setSync] = useState({
    id: team.id,
    ps: team.problem_statement_id,
  })
  if (sync.id !== team.id || sync.ps !== team.problem_statement_id) {
    setSync({ id: team.id, ps: team.problem_statement_id })
    setPsId(team.problem_statement_id ?? '')
    setError(null)
  }

  async function save(nextId: string) {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      await teamApi.allocateProblemStatement(
        team.id,
        nextId === '' ? null : nextId,
      )
      onSaved({
        ...team,
        problem_statement_id: nextId === '' ? null : nextId,
        ps_allocated_at: nextId === '' ? null : new Date().toISOString(),
      })
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-1 text-sm font-semibold">Problem statement</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        {current
          ? `Currently allocated: ${current.title}`
          : 'No statement allocated yet — the team sees this on their portal.'}
      </p>
      {error && (
        <p role="alert" className="mb-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field label="Allocate statement" htmlFor={`ps-${team.id}`} className="flex-1">
          <Select
            id={`ps-${team.id}`}
            value={psId}
            disabled={saving}
            onChange={(e) => setPsId(e.target.value)}
          >
            <option value="">— none allocated —</option>
            {problems.map((p) => (
              <option key={p.id} value={p.id}>
                [{THEME_LABELS[p.track] ?? p.track}] {p.title}
                {p.published ? '' : ' (draft)'}
              </option>
            ))}
          </Select>
        </Field>
        <Button
          size="sm"
          disabled={saving || psId === (team.problem_statement_id ?? '')}
          onClick={() => void save(psId)}
          className="sm:mb-0.5"
        >
          {saving ? (
            <>
              <Spinner size="sm" /> Saving…
            </>
          ) : (
            'Allocate'
          )}
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Venue editor
// ---------------------------------------------------------------------------

function VenueEditor({
  team,
  onSaved,
}: {
  team: TeamRecord
  onSaved: (updated: TeamRecord) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(team.venue_name)
  const [location, setLocation] = useState(team.venue_location)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Re-sync when the team's venue fields change — adjusted during render
  // (React pattern) instead of an effect.
  const [sync, setSync] = useState({
    id: team.id,
    name: team.venue_name,
    location: team.venue_location,
  })
  if (
    sync.id !== team.id ||
    sync.name !== team.venue_name ||
    sync.location !== team.venue_location
  ) {
    setSync({ id: team.id, name: team.venue_name, location: team.venue_location })
    setName(team.venue_name)
    setLocation(team.venue_location)
    setError(null)
  }

  async function save() {
    if (saving) return
    if (name.trim().length < 2) {
      setError('Venue name needs at least 2 characters.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const updated = await teamApi.adminUpdate(team.id, {
        venue_name: name.trim(),
        venue_location: location.trim(),
      })
      onSaved(updated)
      setOpen(false)
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Venue</h3>
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? 'Cancel' : 'Edit'}
        </Button>
      </div>
      {!open ? (
        <p className="text-sm">
          <span className="font-medium">{team.venue_name}</span>
          <span className="text-muted-foreground"> — {team.venue_location}</span>
        </p>
      ) : (
        <div className="space-y-3">
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Field label="Venue name" htmlFor={`vn-${team.id}`}>
            <Input
              id={`vn-${team.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Innovation Lab"
            />
          </Field>
          <Field label="Location / directions" htmlFor={`vl-${team.id}`}>
            <Input
              id={`vl-${team.id}`}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Block C, 2nd floor"
            />
          </Field>
          <div className="flex gap-2">
            <Button size="sm" disabled={saving} onClick={() => void save()}>
              {saving ? (
                <>
                  <Spinner size="sm" /> Saving…
                </>
              ) : (
                'Save venue'
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Submission summary
// ---------------------------------------------------------------------------

function SubmissionSummary({ submission }: { submission: AdminSubmissionRow | null }) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-1.5 text-sm font-semibold">Project submission</h3>
      {!submission ? (
        <p className="text-sm text-muted-foreground">No submission yet.</p>
      ) : (
        <div className="space-y-1 text-sm">
          <p>
            <span className="font-medium">{submission.project_name}</span>{' '}
            <span className="text-xs text-muted-foreground">
              · updated {formatDate(submission.updated_at)}
            </span>
            {submission.locked && (
              <Badge variant="info" className="ml-2">
                Locked
              </Badge>
            )}
          </p>
          <p className="break-all">
            <a
              href={submission.repo_url}
              target="_blank"
              rel="noreferrer"
              className="link-underline text-primary"
            >
              Repository ↗
            </a>
            {submission.demo_url && (
              <>
                {' · '}
                <a
                  href={submission.demo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="link-underline text-primary"
                >
                  Live demo ↗
                </a>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="shrink-0 text-sm font-medium text-muted-foreground">{k}</dt>
      <dd className="break-all text-right text-sm text-foreground">{v}</dd>
    </div>
  )
}
