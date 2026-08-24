import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { normalizeApiError } from '@/api/client'
import {
  problemApi,
  type ProblemStatement,
  type AutoAllocateState,
} from '@/api/problemApi'
import { teamApi, type TeamRecord } from '@/api/teamApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { THEME_LABELS } from '@/data/tracks'

export default function AdminAllocationsPage() {
  const [teams, setTeams] = useState<TeamRecord[]>([])
  const [problems, setProblems] = useState<ProblemStatement[]>([])
  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' }
  >({ kind: 'loading' })
  const [search, setSearch] = useState('')
  const [onlyUnallocated, setOnlyUnallocated] = useState(false)

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      const [teamList, problemList, autoState] = await Promise.all([
        teamApi.adminList(),
        problemApi.listAll(),
        problemApi.autoAllocateStatus().catch(() => null),
      ])
      setTeams(teamList)
      setProblems(problemList)
      if (autoState) setAuto(autoState)
      setState({ kind: 'ready' })
    } catch (error) {
      setState({ kind: 'error', message: normalizeApiError(error).message })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const [auto, setAuto] = useState<AutoAllocateState | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return teams.filter((t) => {
      if (onlyUnallocated && t.problem_statement_id) return false
      if (!q) return true
      return (
        t.team_name.toLowerCase().includes(q) ||
        t.team_id.toLowerCase().includes(q) ||
        t.leader_name.toLowerCase().includes(q)
      )
    })
  }, [teams, search, onlyUnallocated])

  function replaceTeam(updated: TeamRecord) {
    setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  }

  const allocated = teams.filter((t) => t.problem_statement_id).length

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Problem statement allocation</h2>
          <p className="text-sm text-muted-foreground">
            Assign a published challenge to each team — the portal shows the
            title as soon as you save.
          </p>
        </div>
        <Badge variant="outline">
          {allocated}/{teams.length} allocated
        </Badge>
      </header>

      {state.kind === 'error' && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              Couldn’t load data. {state.message}
            </div>
            <Button variant="outline" onClick={() => void load()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {state.kind === 'loading' && (
        <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
          <Spinner /> Loading…
        </div>
      )}

      {state.kind === 'ready' && (
        <>
          {/* Master switch + CSV upload */}
          <AutoAllocateSwitch
            auto={auto}
            onChanged={async (next) => {
              setAuto(next)
              await load()
            }}
            onError={(msg) => setState({ kind: 'error', message: msg })}
          />
          <CsvUploadCard
            onUploaded={async () => {
              await load()
            }}
            onError={(msg) => setState({ kind: 'error', message: msg })}
          />

          {/* Statement reference table (with IDs) */}
          <Card>
            <CardContent className="pt-5">
              <h3 className="mb-3 text-sm font-semibold">Available statements</h3>
              <ul className="space-y-1.5 text-sm">
                {problems.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {p.id}
                    </code>
                    <span className="font-medium">{p.title}</span>
                    <Badge variant="outline">{THEME_LABELS[p.track] ?? p.track}</Badge>
                    {!p.published && <Badge variant="warning">Draft</Badge>}
                  </li>
                ))}
                {problems.length === 0 && (
                  <li className="text-muted-foreground">
                    No statements yet — create some under “Problem statements”.
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team, ID, leader…"
            />
            <label className="inline-flex h-10 items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={onlyUnallocated}
                onChange={(e) => setOnlyUnallocated(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Only unallocated
            </label>
          </div>

          <ul className="space-y-2">
            {filtered.map((t) => (
              <AllocationRow
                key={t.id}
                team={t}
                problems={problems}
                onSaved={replaceTeam}
              />
            ))}
            {filtered.length === 0 && (
              <li className="py-8 text-center text-sm text-muted-foreground">
                No teams match.
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Master auto-allocation switch
// ---------------------------------------------------------------------------

function AutoAllocateSwitch({
  auto,
  onChanged,
  onError,
}: {
  auto: AutoAllocateState | null
  onChanged: (next: AutoAllocateState) => Promise<void>
  onError: (message: string) => void
}) {
  const [busy, setBusy] = useState(false)

  async function toggle() {
    if (!auto || busy) return
    setBusy(true)
    try {
      const next = await problemApi.setAutoAllocate(!auto.enabled)
      await onChanged(next)
    } catch (err) {
      onError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">On-the-spot auto allocation</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            When ON, every waiting team is instantly allocated one{' '}
            <strong>unique</strong> statement matched by its theme — including
            teams that register later. Statements stay private; teams only see
            their own.
          </p>
          {auto?.enabled && (
            <p className="mt-2 text-xs font-medium text-primary">
              {auto.last_result
                ? `Just allocated ${auto.last_result.allocated} team(s) · ${auto.last_result.teams_waiting} still waiting · ${auto.last_result.statements_free} statements free`
                : `${auto.teams_waiting ?? 0} team(s) waiting`}
            </p>
          )}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={Boolean(auto?.enabled)}
          disabled={busy || !auto}
          onClick={() => void toggle()}
          className={`relative inline-flex h-8 w-16 shrink-0 items-center rounded-full transition-colors ${
            auto?.enabled ? 'bg-primary' : 'bg-muted'
          } ${busy ? 'opacity-60' : ''}`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-background shadow transition-transform ${
              auto?.enabled ? 'translate-x-9' : 'translate-x-1'
            }`}
          />
          <span className="sr-only">Auto allocation</span>
        </button>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// CSV upload
// ---------------------------------------------------------------------------

const CSV_TEMPLATE = `title,summary,description,theme,difficulty,sponsor
Doomsday Supply Grid,AI rationing engine,Predict shortage hotspots and reallocate convoys.,ai-ml,hard,
Shelter Status Network,Live shelter tracker,Real-time capacity map for survivor shelters.,web,medium,
Last Signal,Offline team messenger,Battery-aware mesh check-ins for rescue squads.,app,medium,CSSA`

function CsvUploadCard({
  onUploaded,
  onError,
}: {
  onUploaded: () => Promise<void>
  onError: (message: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<{ created: number; skipped: string[] } | null>(
    null,
  )

  async function handleFile(file: File) {
    setBusy(true)
    setReport(null)
    try {
      const csv = await file.text()
      const result = await problemApi.uploadCsv(csv)
      setReport(result)
      await onUploaded()
    } catch (err) {
      onError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'problem-statements-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Upload statements (CSV)</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Header row:{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">
                title,summary,description,theme[,difficulty,sponsor]
              </code>{' '}
              — theme: ai-ml / web / app. Rows import as drafts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              Template ↓
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? (
                <>
                  <Spinner size="sm" /> Uploading…
                </>
              ) : (
                'Choose CSV & Upload'
              )}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleFile(f)
              }}
            />
          </div>
        </div>

        {report && (
          <p role="status" className="text-sm">
            Imported <strong>{report.created}</strong> statement(s).
            {report.skipped.length > 0 && (
              <span className="text-warning">
                {' '}
                Skipped {report.skipped.length}: {report.skipped.join(' · ')}
              </span>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function AllocationRow({
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

  useEffect(() => {
    setPsId(team.problem_statement_id ?? '')
    setError(null)
  }, [team])

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
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-medium">
              <span className="truncate">{team.team_name}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {team.team_id}
              </span>
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {THEME_LABELS[team.theme] ?? team.theme}
              {current ? (
                <>
                  {' · allocated '}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                    {current.id}
                  </code>{' '}
                  {current.title}
                  {!current.published && ' (draft)'}
                </>
              ) : (
                ' · no statement allocated'
              )}
            </p>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <Field label="Allocate statement" htmlFor={`ps-${team.id}`} className="flex-1">
            <Select
              id={`ps-${team.id}`}
              value={psId}
              disabled={saving}
              onChange={(e) => void save(e.target.value)}
            >
              <option value="">— none allocated —</option>
              {problems.map((p) => (
                <option key={p.id} value={p.id}>
                  [{THEME_LABELS[p.track] ?? p.track}] {p.id.slice(0, 8)}… —{' '}
                  {p.title}
                  {p.published ? '' : ' (draft)'}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </CardContent>
    </Card>
  )
}
