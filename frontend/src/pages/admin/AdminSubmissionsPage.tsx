import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Link } from 'react-router-dom'

import { normalizeApiError } from '@/api/client'
import { submissionApi } from '@/api/submissionApi'
import {
  statsApi,
  type AdminSubmissionRow,
} from '@/api/statsApi'
import { AdminFilterBar } from '@/components/admin/AdminFilterBar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { TEAM_STATUS_LABELS, TEAM_STATUSES } from '@/data/status'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminSubmissionsPage() {
  const [rows, setRows] = useState<AdminSubmissionRow[]>([])
  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' }
  >({ kind: 'loading' })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all')
  const [lockFilter, setLockFilter] = useState<'all' | 'locked' | 'unlocked'>('all')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  // Bulk selection + delete
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [deleting, setDeleting] = useState(false)

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function bulkDelete() {
    const ids = [...selected]
    if (ids.length === 0 || deleting) return
    if (
      !window.confirm(
        `Permanently delete ${ids.length} selected submission(s)? The teams stay registered and can submit again.`,
      )
    )
      return
    setDeleting(true)
    try {
      await submissionApi.adminBulkDelete(ids)
      setSelected(new Set())
      await load()
    } catch (err) {
      setState({ kind: 'error', message: normalizeApiError(err).message })
    } finally {
      setDeleting(false)
    }
  }

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      setRows(await statsApi.adminSubmissions())
      setState({ kind: 'ready' })
    } catch (error) {
      setState({ kind: 'error', message: normalizeApiError(error).message })
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(load, 0)
    return () => window.clearTimeout(id)
  }, [load])

  const handleExportCsv = useCallback(async () => {
    if (exporting) return
    setExporting(true)
    setExportError(null)
    try {
      await submissionApi.exportAdminCsv({
        status: statusFilter,
        lock: lockFilter,
        q: search,
      })
    } catch (error) {
      setExportError(normalizeApiError(error).message)
    } finally {
      setExporting(false)
    }
  }, [exporting, statusFilter, lockFilter, search])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (lockFilter === 'locked' && !r.locked) return false
      if (lockFilter === 'unlocked' && r.locked) return false
      if (!q) return true
      return (
        r.team_name.toLowerCase().includes(q) ||
        r.team_id.toLowerCase().includes(q) ||
        r.project_name.toLowerCase().includes(q) ||
        r.leader_email.toLowerCase().includes(q)
      )
    })
  }, [rows, search, statusFilter, lockFilter])

  const allSelected =
    filtered.length > 0 && filtered.every((r) => selected.has(r.team_uuid))

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(filtered.map((r) => r.team_uuid)))
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Project submissions</h2>
          <p className="text-sm text-muted-foreground">
            Every submitted project, newest first — open the repo or live demo
            straight from here.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={exporting}
            onClick={() => void handleExportCsv()}
            title="Download the currently filtered submissions as a CSV file"
          >
            {exporting ? (
              <Spinner size="sm" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exporting ? 'Exporting…' : 'Download CSV'}
          </Button>
          <Button variant="outline" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      </header>

      {exportError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          Couldn’t download the CSV. {exportError}
        </div>
      )}

      {state.kind === 'error' && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              Couldn’t load submissions. {state.message}
            </div>
            <Button variant="outline" onClick={() => void load()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {state.kind === 'ready' && (
        <>
          <AdminFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search team, project, leader email…"
            resultCount={{ shown: filtered.length, total: rows.length }}
            chips={[
              statusFilter !== 'all'
                ? {
                    label: `Status: ${TEAM_STATUS_LABELS[statusFilter as keyof typeof TEAM_STATUS_LABELS] ?? statusFilter}`,
                    onRemove: () => setStatusFilter('all'),
                  }
                : null,
              lockFilter !== 'all'
                ? {
                    label:
                      lockFilter === 'locked' ? 'State: Locked (final)' : 'State: Unlocked',
                    onRemove: () => setLockFilter('all'),
                  }
                : null,
            ].filter((c): c is NonNullable<typeof c> => c !== null)}
          >
            <Field label="Team status" htmlFor="sub-status" className="mb-0">
              <Select
                id="sub-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                {TEAM_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TEAM_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Submission state" htmlFor="sub-lock" className="mb-0">
              <Select
                id="sub-lock"
                value={lockFilter}
                onChange={(e) => setLockFilter(e.target.value as typeof lockFilter)}
              >
                <option value="all">All states</option>
                <option value="locked">Locked (final)</option>
                <option value="unlocked">Unlocked</option>
              </Select>
            </Field>
          </AdminFilterBar>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
              <p className="text-sm font-medium">
                {selected.size} submission(s) selected
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
                  Clear selection
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleting}
                  onClick={() => void bulkDelete()}
                >
                  {deleting ? (
                    <>
                      <Spinner size="sm" /> Deleting…
                    </>
                  ) : (
                    `Delete ${selected.size} selected`
                  )}
                </Button>
              </div>
            </div>
          )}

          <label className="inline-flex w-max items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 accent-primary"
              aria-label="Select all submissions"
            />
            Select all
          </label>

          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No submissions match these filters.
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((s) => (
                <li key={s.team_uuid}>
                  <SubmissionRow
                    row={s}
                    selected={selected.has(s.team_uuid)}
                    onToggle={() => toggleSelect(s.team_uuid)}
                    onChanged={load}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function SubmissionRow({
  row,
  selected,
  onToggle,
  onChanged,
}: {
  row: AdminSubmissionRow
  selected: boolean
  onToggle: () => void
  onChanged: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggleLock() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await submissionApi.adminSetLock(row.team_uuid, !row.locked)
      onChanged()
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className={`transition-colors hover:bg-accent/50 ${selected ? 'border-primary bg-primary/5' : ''}`}>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            aria-label={`Select submission ${row.project_name}`}
            className="mt-1 h-4 w-4 shrink-0 accent-primary"
          />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-medium">
              <span className="truncate">{row.project_name}</span>
              {row.locked ? (
                <Badge variant="info">Locked — final</Badge>
              ) : (
                <Badge variant="warning">Unlocked</Badge>
              )}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              <Link to="/admin/registrations" className="link-underline">
                {row.team_id} · {row.team_name}
              </Link>{' '}
              · {formatDate(row.updated_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={row.repo_url}
            target="_blank"
            rel="noreferrer"
            className="link-underline text-sm font-medium text-primary"
          >
            Repo ↗
          </a>
          {row.demo_url && (
            <a
              href={row.demo_url}
              target="_blank"
              rel="noreferrer"
              className="link-underline text-sm font-medium text-primary"
            >
              Demo ↗
            </a>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button variant="outline" size="sm" disabled={busy} onClick={() => void toggleLock()}>
            {busy ? '…' : row.locked ? 'Unlock' : 'Re-lock'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
